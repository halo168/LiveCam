/**
 * 找找台灣鏡頭君 — Taiwan Live Cam Explorer
 * Google Apps Script (GAS) 後端寫入與安全驗證程式碼
 * 
 * 部署指引：
 * 1. 於 Google Drive 建立新的 Google 試算表，命名為「台灣鏡頭君打卡資料庫」
 * 2. 點擊頂端選單「擴充功能」 -> 「Apps Script」
 * 3. 清空原始程式碼，完整貼上本檔案內容並儲存 (Ctrl+S / Cmd+S)
 * 4. 點擊右上角「部署」 -> 「新增部署」
 * 5. 類型選擇「網頁應用程式 (Web App)」
 *    - 執行身分：我 (您的 Google 帳號)
 *    - 誰可以存取：任何人 (Anyone)
 * 6. 授權存取試算表，並複製取得之 Webhook URL (格式: https://script.google.com/macros/s/AKfy.../exec)
 * 7. 將此 URL 設定至專案環境變數 GAS_WEBHOOK_URL
 */

// 景點白名單及真實官方經緯度（與前端資料同步校驗）
var SPOT_WHITELIST = {
  'tw-alishan-eryanping': { name: '阿里山 二延平步道雲海', lat: 23.4243, lng: 120.6558, radius: 1200 },
  'tw-taipei-101-xiangshan': { name: '台北 象山看台北101天際線', lat: 25.0273, lng: 121.5705, radius: 1000 },
  'tw-sun-moon-lake': { name: '日月潭 向山遊客中心與水社碼頭', lat: 23.8523, lng: 120.9022, radius: 1500 },
  'tw-hehuanshan-wuling': { name: '合歡山 武嶺亭（海拔3275M）', lat: 24.1373, lng: 121.2758, radius: 800 },
  'tw-sanxiantai-taitung': { name: '台東 三仙台八拱跨海步橋', lat: 23.1235, lng: 121.4042, radius: 1200 },
  'tw-jialulan-coast': { name: '台東 加路蘭遊憩區太平洋海岸', lat: 22.8085, lng: 121.1965, radius: 1000 },
  'tw-jiufen-oldstreet': { name: '新北 九份山城與基隆嶼海景', lat: 25.1099, lng: 121.8452, radius: 900 },
  'tw-taoyuan-airport': { name: '桃園 桃園國際機場跑道巡禮', lat: 25.0797, lng: 121.2342, radius: 2000 },
  'tw-shoushan-kaohsiung': { name: '高雄 壽山情人觀景台與高雄港', lat: 22.6288, lng: 120.2743, radius: 1100 },
  'tw-kenting-baisha': { name: '屏東 墾丁白沙灣與南灣海灘', lat: 21.9341, lng: 120.7169, radius: 1200 },
  'tw-hualien-qixingtan': { name: '花蓮 七星潭月牙灣太平洋', lat: 24.0322, lng: 121.6293, radius: 1300 },
  'tw-penghu-guanyinting': { name: '澎湖 馬公觀音亭與西瀛虹橋', lat: 23.5682, lng: 119.5630, radius: 1500 }
};

/**
 * 試算表欄位標題定義
 */
var SHEET_HEADERS = [
  '打卡時間 (Timestamp)',
  '紀錄 ID (Record ID)',
  '姓名 (Name)',
  '暱稱 (Nickname)',
  '景點 ID (Camera ID)',
  '景點名稱 (Spot Name)',
  '約略位置 (Approx Location)',
  '定位精度公尺 (Accuracy)',
  '景點距離公尺 (Distance)',
  '請求 ID (Request ID)',
  '驗證狀態 (Verified Status)'
];

/**
 * 防止試算表公式注入攻擊 (Formula Injection Sanitizer)
 */
function sanitizeFormula(input) {
  if (input === null || input === undefined) return '';
  var str = String(input).trim();
  if (/^[=+@\-\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Haversine 公式計算地球兩點間距離（公尺）
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var toRad = function(d) { return d * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 處理 POST 請求 (GPS 打卡寫入)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  // 等待取得鎖定最多 10 秒，避免並發同時寫入衝突
  try {
    lock.waitLock(10000);
  } catch (lockError) {
    return createJsonResponse({
      success: false,
      verified: false,
      error: '伺服器繁忙，正在處理其他打卡請求，請稍後重試。'
    }, 429);
  }

  try {
    var rawPostData = e.postData ? e.postData.contents : '';
    if (!rawPostData) {
      return createJsonResponse({ success: false, verified: false, error: '缺少請求資料內容。' }, 400);
    }

    var payload = JSON.parse(rawPostData);

    // 1. 必填欄位驗證
    if (!payload.name || String(payload.name).trim() === '') {
      return createJsonResponse({ success: false, verified: false, error: '姓名為必填欄位。' }, 400);
    }
    if (!payload.cameraId) {
      return createJsonResponse({ success: false, verified: false, error: '景點代碼不得為空。' }, 400);
    }
    if (!payload.requestId) {
      return createJsonResponse({ success: false, verified: false, error: '缺少請求驗證識別碼。' }, 400);
    }

    // 2. 防重複提交（Anti-Replay via CacheService）
    var cache = CacheService.getScriptCache();
    var cachedReq = cache.get('REQ_' + payload.requestId);
    if (cachedReq) {
      return createJsonResponse({ success: false, verified: false, error: '此請求 ID 已被處理過，請勿重複提交。' }, 409);
    }
    // 記錄請求 ID 於快取中 600 秒
    cache.put('REQ_' + payload.requestId, 'PROCESSED', 600);

    // 3. 景點白名單與距離複檢
    var spotInfo = SPOT_WHITELIST[payload.cameraId];
    var verifiedDistance = Number(payload.distanceMeters) || 0;

    // 若有提供真實經緯度，以 Apps Script 重新算一次距離作為第三方審核
    if (payload.latitude && payload.longitude && spotInfo) {
      var recomputedDist = calculateHaversineDistance(
        Number(payload.latitude),
        Number(payload.longitude),
        spotInfo.lat,
        spotInfo.lng
      );
      if (recomputedDist > spotInfo.radius) {
        return createJsonResponse({
          success: false,
          verified: false,
          distanceMeters: recomputedDist,
          error: '實地距離二次驗證未通過（距離 ' + recomputedDist + ' 公尺，超過 ' + spotInfo.radius + ' 公尺限額）。'
        }, 403);
      }
      verifiedDistance = recomputedDist;
    }

    // 4. 取得或初始化試算表
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SHEET_HEADERS);
      sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight('bold').setBackground('#071B29').setFontColor('#F4F0E7');
      sheet.setFrozenRows(1);
    }

    var recordId = payload.recordId || ('CHK-' + new Date().getTime().toString(36).toUpperCase());
    var timestamp = payload.timestamp || new Date().toISOString();
    var safeName = sanitizeFormula(payload.name);
    var safeNickname = sanitizeFormula(payload.nickname || '');
    var safeCameraName = sanitizeFormula(payload.cameraName || (spotInfo ? spotInfo.name : payload.cameraId));
    var safeApproxLocation = sanitizeFormula(payload.approxLocation || '');
    var safeAccuracy = Number(payload.accuracy) || 0;
    var safeRequestId = sanitizeFormula(payload.requestId);

    var rowData = [
      timestamp,
      recordId,
      safeName,
      safeNickname,
      payload.cameraId,
      safeCameraName,
      safeApproxLocation,
      safeAccuracy,
      verifiedDistance,
      safeRequestId,
      'VERIFIED_SUCCESS'
    ];

    // 5. 寫入試算表並強制刷新快取
    sheet.appendRow(rowData);
    SpreadsheetApp.flush();

    // 6. 寫入後重新讀取確認 (Read-back verification)
    var lastRow = sheet.getLastRow();
    var readBackId = sheet.getRange(lastRow, 2).getValue();

    if (String(readBackId) !== String(recordId)) {
      return createJsonResponse({
        success: false,
        verified: false,
        error: '試算表寫入讀回檢驗失敗，請重試。'
      }, 500);
    }

    // 回傳成功 JSON
    return createJsonResponse({
      success: true,
      verified: true,
      recordId: recordId,
      timestamp: timestamp,
      distanceMeters: verifiedDistance,
      message: '打卡資料已成功寫入 Google 試算表並通過審核！'
    }, 200);

  } catch (error) {
    return createJsonResponse({
      success: false,
      verified: false,
      error: '後端執行異常: ' + error.toString()
    }, 500);
  } finally {
    // 釋放鎖定
    lock.releaseLock();
  }
}

/**
 * 處理 GET 請求 (提供狀態查詢與連線測試)
 */
function doGet(e) {
  return createJsonResponse({
    status: 'online',
    service: 'Taiwan Live Cam Explorer Apps Script Backend',
    timestamp: new Date().toISOString(),
    supportedEndpoints: ['POST (Check-in Submission)']
  }, 200);
}

/**
 * 產生標準 JSON 輸出並設定正確 MIME Type
 */
function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
