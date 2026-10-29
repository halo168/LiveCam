/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CameraItem, Attraction, SyncStats, CheckinRecord } from './src/types/camera';
import { calculateHaversineDistance, truncateCoordinatesForPrivacy, sanitizeForSpreadsheet } from './src/utils/geo';
import { PlaylistSyncService } from './src/services/PlaylistSyncService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// Anti-Replay Cache
const processedRequestIds = new Map<string, number>();

// Rate Limiting Cache
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 25;

  const timestamps = ipRequestHistory.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  ipRequestHistory.set(ip, validTimestamps);
  return true;
}

// In-Memory Database initialized from static JSON
let camerasData: CameraItem[] = [];
let attractionsData: Attraction[] = [];

try {
  const camPath = path.resolve(__dirname, 'src/data/cameras.json');
  const attrPath = path.resolve(__dirname, 'src/data/attractions.json');
  if (fs.existsSync(camPath)) {
    camerasData = JSON.parse(fs.readFileSync(camPath, 'utf8'));
  }
  if (fs.existsSync(attrPath)) {
    attractionsData = JSON.parse(fs.readFileSync(attrPath, 'utf8'));
  }
  console.log(`Loaded ${camerasData.length} cameras and ${attractionsData.length} attractions.`);
} catch (e) {
  console.error('Failed to load initial dataset from JSON:', e);
}

// Persistent Check-in logs
const checkinDatabase: CheckinRecord[] = [];

// Clean stale request IDs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, time] of processedRequestIds.entries()) {
    if (now - time > 3600 * 1000) {
      processedRequestIds.delete(id);
    }
  }
}, 30 * 60 * 1000);

// --- API ENDPOINTS ---

// Health & Sync Status
app.get('/api/health', (_req: Request, res: Response) => {
  const stats = PlaylistSyncService.computeStats(camerasData, attractionsData);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGasWebhook: Boolean(process.env.GAS_WEBHOOK_URL),
    hasYouTubeApiKey: Boolean(process.env.YOUTUBE_API_KEY),
    stats,
    totalCheckinsLogged: checkinDatabase.length,
  });
});

// Get all cameras
app.get('/api/cameras', (_req: Request, res: Response) => {
  res.json({
    success: true,
    cameras: camerasData,
  });
});

// Get all attractions
app.get('/api/attractions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    attractions: attractionsData,
  });
});

// Sync Playlist via YouTube Data API v3
app.post('/api/sync-playlist', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.body?.apiKey || process.env.YOUTUBE_API_KEY || '').trim();

    if (!apiKey) {
      res.status(400).json({
        success: false,
        error: '缺少 YouTube Data API Key。請於請求中傳入 apiKey 或於後端環境變數配置 YOUTUBE_API_KEY。',
      });
      return;
    }

    const { cameras, stats } = await PlaylistSyncService.syncFromYouTubeApi(apiKey);

    // Update in-memory and write back to JSON
    camerasData = cameras;
    const camPath = path.resolve(__dirname, 'src/data/cameras.json');
    fs.writeFileSync(camPath, JSON.stringify(camerasData, null, 2));

    res.json({
      success: true,
      message: `成功同步 ${cameras.length} 支播放清單影片！(其中 ${stats.liveConfirmedCount} 支確認直播中)`,
      stats,
    });
  } catch (err: any) {
    console.error('Playlist sync error:', err);
    res.status(500).json({
      success: false,
      error: `同步過程發生錯誤: ${err.message}`,
    });
  }
});

// Manual coordinate assignment for pending camera
app.post('/api/assign-coordinate', (req: Request, res: Response) => {
  const { cameraId, attractionName, city, latitude, longitude } = req.body;
  if (!cameraId || !attractionName || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    res.status(400).json({ success: false, error: '缺少必要座標與景點參數' });
    return;
  }

  const cam = camerasData.find((c) => c.cameraId === cameraId);
  if (!cam) {
    res.status(404).json({ success: false, error: '查無此攝影機 ID' });
    return;
  }

  // Create or add to attraction
  const newAttrId = `attr-custom-${Date.now().toString(36)}`;
  const newAttr: Attraction = {
    attractionId: newAttrId,
    name: attractionName,
    city: city || '台灣自訂景點',
    region: 'north',
    latitude: Number(latitude),
    longitude: Number(longitude),
    coordinateSource: '管理員手動指定官方座標',
    coordinateAccuracy: 'exact',
    landmarkType: 'other',
    cameraIds: [cam.cameraId],
    checkinEnabled: true,
    checkinRadiusMeters: 1000,
  };

  cam.attractionId = newAttrId;
  attractionsData.push(newAttr);

  res.json({
    success: true,
    message: `已成功將攝影機指派至「${attractionName}」並生成地標！`,
    attraction: newAttr,
  });
});

// GPS Check-in Endpoint with Strict Haversine Verification & Anti-Fraud
app.post('/api/checkin', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      success: false,
      verified: false,
      error: '請求過於頻繁，請稍候再試。',
    });
    return;
  }

  const { name, nickname, attractionId, cameraId, latitude, longitude, accuracy, requestId, isSimulated } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      verified: false,
      error: '姓名為必填欄位。',
    });
    return;
  }

  if (!attractionId || typeof attractionId !== 'string') {
    res.status(400).json({
      success: false,
      verified: false,
      error: '景點代碼無效。',
    });
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < 20 || lat > 27 || lng < 117 || lng > 124) {
    res.status(400).json({
      success: false,
      verified: false,
      error: '定位經緯度座標超出合理範圍。',
    });
    return;
  }

  // Anti-Replay
  if (requestId && processedRequestIds.has(requestId)) {
    res.status(409).json({
      success: false,
      verified: false,
      error: '偵測到重複提交的請求 ID，請重新發起打卡。',
    });
    return;
  }
  if (requestId) {
    processedRequestIds.set(requestId, Date.now());
  }

  // Find attraction
  const targetAttraction = attractionsData.find((a) => a.attractionId === attractionId);
  if (!targetAttraction) {
    res.status(404).json({
      success: false,
      verified: false,
      error: '查無此景點，不在核准清單中。',
    });
    return;
  }

  if (!targetAttraction.checkinEnabled) {
    res.status(403).json({
      success: false,
      verified: false,
      error: '該景點目前未開放 GPS 打卡功能。',
    });
    return;
  }

  // Strict Server-Side Haversine Verification
  const serverDistanceMeters = calculateHaversineDistance(
    lat,
    lng,
    targetAttraction.latitude,
    targetAttraction.longitude
  );

  const allowedRadius = targetAttraction.checkinRadiusMeters || 1000;

  if (serverDistanceMeters > allowedRadius) {
    res.status(403).json({
      success: false,
      verified: false,
      distanceMeters: serverDistanceMeters,
      allowedRadius,
      error: `實地打卡未通過：您目前距離「${targetAttraction.name}」約 ${serverDistanceMeters} 公尺，超過本景點允許範圍 ${allowedRadius} 公尺。`,
    });
    return;
  }

  const { approxString } = truncateCoordinatesForPrivacy(lat, lng);
  const safeName = sanitizeForSpreadsheet(name.trim().slice(0, 50));
  const safeNickname = sanitizeForSpreadsheet((nickname || '').trim().slice(0, 50));
  const recordId = `CHK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  const cam = camerasData.find((c) => c.cameraId === cameraId);
  const cameraTitle = cam ? cam.title : '指定即時鏡頭';

  const record: CheckinRecord = {
    recordId,
    timestamp,
    name: safeName,
    nickname: safeNickname,
    attractionId: targetAttraction.attractionId,
    attractionName: targetAttraction.name,
    cameraId: cameraId || targetAttraction.cameraIds[0] || 'default-cam',
    cameraTitle,
    region: targetAttraction.region,
    approxLocation: approxString,
    accuracy: Number(accuracy) || 15,
    distanceMeters: serverDistanceMeters,
    requestId: requestId || `AUTO-${Date.now()}`,
    verified: true,
  };

  // Rule: Do NOT write simulated test data to official Google Sheets
  if (!isSimulated) {
    const gasWebhookUrl = process.env.GAS_WEBHOOK_URL;
    if (gasWebhookUrl && gasWebhookUrl.startsWith('https://script.google.com/')) {
      try {
        const gasPayload = {
          action: 'checkin',
          recordId,
          timestamp,
          name: safeName,
          nickname: safeNickname,
          attractionId: targetAttraction.attractionId,
          attractionName: targetAttraction.name,
          cameraId: record.cameraId,
          approxLocation: approxString,
          accuracy: record.accuracy,
          distanceMeters: serverDistanceMeters,
          requestId: record.requestId,
        };

        const gasResponse = await fetch(gasWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload),
          redirect: 'follow',
        });

        if (gasResponse.ok) {
          const gasResult = await gasResponse.json();
          console.log('[GAS Webhook Success]', gasResult);
        }
      } catch (gasErr) {
        console.error('[GAS Webhook Error] Failed to write to Google Sheets:', gasErr);
      }
    }
  }

  checkinDatabase.unshift(record);

  res.json({
    success: true,
    verified: true,
    recordId,
    message: isSimulated
      ? `[模擬打卡成功] 實地距離校驗通過（${serverDistanceMeters}m），已存入本機護照（未寫入正式試算表）。`
      : `恭喜！實地距離驗證通過（${serverDistanceMeters}m），已成功打卡「${targetAttraction.name}」並寫入護照紀錄！`,
    distanceMeters: serverDistanceMeters,
    allowedRadius,
    timestamp,
    record,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Taiwan Live Cam Explorer server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
