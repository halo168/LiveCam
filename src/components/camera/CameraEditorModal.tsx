/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Attraction, CameraItem, SyncStats } from '../../types/camera';
import { TARGET_PLAYLIST_URL } from '../../services/PlaylistSyncService';
import {
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Video,
  MapPin,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  KeyRound,
  Edit2,
} from 'lucide-react';

interface CameraEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraItem[];
  attractions: Attraction[];
  stats: SyncStats;
  onTriggerSync: (apiKey?: string) => Promise<{ success: boolean; message: string }>;
  onAssignCoordinates: (
    cameraId: string,
    attractionName: string,
    city: string,
    lat: number,
    lng: number
  ) => void;
}

export const CameraEditorModal: React.FC<CameraEditorModalProps> = ({
  isOpen,
  onClose,
  cameras,
  attractions,
  stats,
  onTriggerSync,
  onAssignCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'pending' | 'all' | 'sync'>('stats');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');

  // Manual sync input
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Editing pending camera
  const [editingCamera, setEditingCamera] = useState<CameraItem | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualLat, setManualLat] = useState('24.000');
  const [manualLng, setManualLng] = useState('121.000');

  if (!isOpen) return null;

  const pendingCameras = cameras.filter((c) => c.attractionId === null);
  const geocodedCameras = cameras.filter((c) => c.attractionId !== null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode === 'admin888' || adminPasscode === 'taiwan') {
      setIsAdminUnlocked(true);
      setAdminError('');
    } else {
      setAdminError('管理員通行密碼錯誤 (預設為 admin888)');
    }
  };

  const handleStartManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback('正在連線後端 PlaylistSyncService 與 YouTube Data API v3 執行分頁同步...');
    try {
      const result = await onTriggerSync(apiKeyInput.trim() || undefined);
      setSyncFeedback(result.message);
    } catch (e: any) {
      setSyncFeedback(`同步失敗: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveManualCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCamera) return;

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('請輸入有效數值經緯度。');
      return;
    }

    onAssignCoordinates(editingCamera.cameraId, manualName, manualCity, lat, lng);
    setEditingCamera(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#071B29] border border-white/10 shadow-2xl overflow-hidden text-[#F4F0E7]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#49A88B]/20 text-[#49A88B]">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F4F0E7]">鏡頭資料庫與 YouTube 播放清單同步</h3>
              <p className="text-xs text-white/60">
                嚴格限定來源清單 · 支援 YouTube Data API v3 自動分頁同步與景點座標校驗
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={TARGET_PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>查看原始清單</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-white/[0.02] border-b border-white/10 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'stats' ? 'bg-[#F6C66B] text-[#071B29]' : 'text-white/60 hover:text-white'
            }`}
          >
            同步數據總覽
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending' ? 'bg-[#F6C66B] text-[#071B29]' : 'text-white/60 hover:text-white'
            }`}
          >
            <span>待定位鏡頭清單</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px]">
              {pendingCameras.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'all' ? 'bg-[#F6C66B] text-[#071B29]' : 'text-white/60 hover:text-white'
            }`}
          >
            清單全部影片 ({cameras.length})
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'sync' ? 'bg-[#49A88B] text-[#071B29]' : 'text-white/60 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>後端執行自動同步</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-[#F4F0E7] font-mono block">
                    {stats.totalPlaylistVideos}
                  </span>
                  <span className="text-xs text-white/60">播放清單影片總數</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-[#49A88B] font-mono block">
                    {stats.liveConfirmedCount}
                  </span>
                  <span className="text-xs text-white/60">已確認直播中 (LIVE)</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-[#F6C66B] font-mono block">
                    {stats.embeddableCount}
                  </span>
                  <span className="text-xs text-white/60">可內嵌播放影片數</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-[#49A88B] font-mono block">
                    {stats.geocodedAttractionsCount}
                  </span>
                  <span className="text-xs text-white/60">已成功定位景點數 (地標)</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-amber-300 font-mono block">
                    {stats.pendingGeocodeCount}
                  </span>
                  <span className="text-xs text-white/60">待定位影片數 (不放錯位置)</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-2xl font-black text-rose-300 font-mono block">
                    {stats.offlineCount}
                  </span>
                  <span className="text-xs text-white/60">無法觀看或離線數</span>
                </div>
              </div>

              {/* Notice Card */}
              <div className="p-4 rounded-2xl bg-[#092233] border border-[#49A88B]/30 text-xs space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-[#F6C66B]">
                  <Shield className="w-4 h-4" />
                  <span>資料來源唯一性規範</span>
                </div>
                <p className="text-white/80">
                  依據專案規範，本網站所有景點鏡頭資料皆取自指定 YouTube 播放清單
                  <code className="text-[#49A88B] font-mono ml-1">PLPHAdGv_-C_60UemaeORmThSvCPluiTtv</code>。
                  若影片為河川水情監測站或無明確觀光景點座標，已安全歸類至「待定位鏡頭」，絕不產生假景點或猜測座標。
                </p>
                <div className="text-[11px] text-white/50 pt-1">
                  最後同步確認時間：{new Date(stats.lastSyncTime).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                以下 {pendingCameras.length} 支影片已載入，但尚未在景點庫中確認精準座標。依規範不顯示在地圖錯誤位置。
                {!isAdminUnlocked && ' （需輸入管理員密碼以手動指派景點座標）'}
              </div>

              {!isAdminUnlocked ? (
                <form onSubmit={handleAdminLogin} className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#F6C66B]">
                    <KeyRound className="w-4 h-4" />
                    <span>管理員身分驗證</span>
                  </div>
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="請輸入管理密碼 (預設: admin888)"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  />
                  {adminError && <p className="text-[11px] text-rose-400">{adminError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-[#F6C66B] text-[#071B29] font-bold text-xs"
                  >
                    解鎖管理指派功能
                  </button>
                </form>
              ) : null}

              {editingCamera && (
                <form onSubmit={handleSaveManualCoordinates} className="p-4 rounded-xl bg-white/10 border border-[#49A88B] space-y-3">
                  <h4 className="font-bold text-xs text-[#F6C66B]">手動指定景點座標</h4>
                  <p className="text-[11px] text-white/70">{editingCamera.title}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-white/60 mb-1">景點名稱</label>
                      <input
                        type="text"
                        required
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 mb-1">行政區</label>
                      <input
                        type="text"
                        required
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 mb-1">緯度 Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 mb-1">經度 Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCamera(null)}
                      className="px-3 py-1.5 rounded bg-white/10 text-xs"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-[#49A88B] text-[#071B29] font-bold text-xs"
                    >
                      儲存並生成地標
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {pendingCameras.map((cam) => (
                  <div
                    key={cam.cameraId}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h5 className="font-bold text-white">{cam.title}</h5>
                      <span className="font-mono text-[11px] text-[#49A88B]">ID: {cam.videoId}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={cam.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20"
                      >
                        觀看
                      </a>
                      {isAdminUnlocked && (
                        <button
                          onClick={() => {
                            setEditingCamera(cam);
                            setManualName(cam.title.split(' ')[0] || '景點名稱');
                            setManualCity('台灣某縣市');
                          }}
                          className="px-2.5 py-1 rounded bg-[#F6C66B] text-[#071B29] font-bold"
                        >
                          指定座標
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="space-y-2">
              {cameras.map((c, i) => (
                <div
                  key={c.cameraId}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white/40 text-[11px]">#{i + 1}</span>
                    <div>
                      <h5 className="font-bold text-white line-clamp-1">{c.title}</h5>
                      <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                        <span className="font-mono text-[#49A88B]">{c.videoId}</span>
                        <span>·</span>
                        <span className={c.streamStatus === 'live' ? 'text-[#49A88B]' : 'text-amber-300'}>
                          {c.streamStatus === 'live' ? 'LIVE 直播中' : '待命'}
                        </span>
                        <span>·</span>
                        <span>{c.embeddable ? '允許內嵌' : '需外部觀看'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={c.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4 max-w-lg">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs leading-relaxed">
                <h4 className="font-bold text-[#F6C66B] text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>後端自動同步服務 (PlaylistSyncService)</span>
                </h4>
                <p className="text-white/70">
                  點擊下方按鈕將由 Express 後端執行 <code>playlistItems.list</code> 分頁請求與 <code>videos.list</code> 直播狀態校驗，
                  產生最新 <code>cameras.json</code> 與 <code>attractions.json</code>。
                </p>

                <div>
                  <label className="block text-white/70 mb-1">
                    YouTube Data API Key (選填，若後端 .env 已設定可留空)
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-white/40 mt-1">
                    金鑰僅直接送往伺服器端請求，絕不在 React 前端程式碼中暴露存儲。
                  </p>
                </div>

                <button
                  onClick={handleStartManualSync}
                  disabled={isSyncing}
                  className="w-full py-2.5 rounded-xl bg-[#49A88B] hover:bg-[#3ca084] text-[#071B29] font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-[#071B29] border-t-transparent animate-spin" />
                      <span>正在同步中...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>由後端執行播放清單同步</span>
                    </>
                  )}
                </button>

                {syncFeedback && (
                  <div className="p-3 rounded-lg bg-white/10 text-xs text-white/90">
                    {syncFeedback}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
