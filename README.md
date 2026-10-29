# 找找台灣鏡頭君 V2.1 — Taiwan Live Cam Explorer

> 🇹🇼 以指定官方 YouTube 播放清單為唯一核心的動態景點地圖、3D 景觀地標與 GPS 雙重防偽旅行護照系統。

---

## 🌟 V2.1 升級重點

1. **唯一指定 YouTube 直播來源（零虛構景點）**
   - 播放清單唯一鎖定：`https://www.youtube.com/playlist?list=PLPHAdGv_-C_60UemaeORmThSvCPluiTtv`。
   - 所有鏡頭 100% 來自清單中實際存在的 99 部影片，取消固定景點數量限制。
   - 若為非觀光或無精確位置之影片（如地震監測儀），安全歸類至「待定位鏡頭」，絕不標示於地圖錯誤位置。

2. **多鏡頭景點智慧聚合 (Attraction Clustering)**
   - 相同景點的多支攝影機（如桃園機場跑道與雙視角、合歡山武嶺亭、陽明山冷水坑/小油坑/七星山、阿里山二延平/太平雲梯/生力農場、墾丁核三廠海底珊瑚等）自動聚合為單一地標。
   - 景點卡片與播放器提供「多視角鏡頭切換鈕」，保留每支影片獨立的直播狀態。

3. **3D 地圖修復與動態地標 (Three.js)**
   - **徹底移除地圖中央的矩形色塊**：完全依據台灣真實島嶼海岸輪廓建立平滑地形，中央山脈自然隆起，無任何浮空色塊。
   - **依景點分類動態生成 8 類 Low-Poly 3D 微縮地標模型**：
     - **都市 (city)**：摩天大樓與頂部天線
     - **山區 (mountain)**：雪覆峰巒與低多邊形杉樹
     - **海岸 (coast)**：紅白條紋燈塔與浪花光環
     - **港口 (port)**：貨櫃貨輪與碼頭
     - **湖泊 (lake)**：碧綠水潭與白色小帆船
     - **寺廟 (temple)**：飛簷重檐殿閣與紅柱
     - **車站 (station)**：通勤列車與月台雨棚
     - **其他 (other)**：精緻攝影機吉祥物信標
   - 保留 2D 正交俯視與 3D 透視平滑阻尼切換及 SVG 向量地圖自動降級備援。

4. **資料庫獨立結構 (`cameras.json` & `attractions.json`)**
   - `cameras.json`：`cameraId`, `videoId`, `playlistItemId`, `title`, `description`, `thumbnailUrl`, `streamStatus`, `embeddable`, `videoUrl`, `lastCheckedAt`, `attractionId`。
   - `attractions.json`：`attractionId`, `name`, `city`, `region`, `latitude`, `longitude`, `coordinateSource`, `coordinateAccuracy`, `landmarkType`, `cameraIds`, `checkinEnabled`, `checkinRadiusMeters`。

5. **自動同步服務 (`PlaylistSyncService`)**
   - 具備 `playlistItems.list` 分頁取得所有項目（直到 `nextPageToken` 為空）。
   - 搭配 `videos.list` 校驗直播狀態與內嵌權限（`embeddable`）。
   - 金鑰安全防護：絕不在 React 前端暴露 API 金鑰，透過 Express 後端 `/api/sync-playlist` 代理執行。
   - 若未設定 `YOUTUBE_API_KEY`，系統安全保留上次成功產生的靜態 JSON 資料庫與時間戳記。

6. **GPS 實地打卡與 Google Sheets 防弊機制**
   - 必須由使用者主動點擊按鈕才讀取經緯度，不追蹤背景位置。
   - 座標隱私截斷保護（約 110 公尺精度），防止行蹤外洩。
   - 經後端以 Haversine 公式嚴格校驗距離與白名單，只有 `checkinEnabled: true` 景點可打卡。
   - 嚴格落實**模擬測試模式資料絕不寫入正式 Google Sheets**，避免污染生產資料庫。
   - 支援防公式注入（Formula Injection Prevention，過濾 `=, +, -, @` 開頭內容）。

7. **鏡頭資料庫管理介面 (Camera Manager)**
   - 數據總覽儀表板：播放清單影片總數、已確認直播數、可嵌入影片數、已成功定位景點數、待定位影片數、無法觀看數、最後同步時間。
   - 管理員通行密碼保護（預設 `admin888`），支援手動指定待定位影片之景點與經緯度。

---

## 🛠️ 本地執行與環境變數

在 `.env` 中設定（選填）：
```env
# Google Apps Script Webhook 網址（用於實地打卡寫入試算表）
GAS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycb.../exec"

# YouTube Data API Key（供後端 PlaylistSyncService 自動同步清單）
YOUTUBE_API_KEY=""
```

啟動開發伺服器：
```bash
npm run dev
```
開啟瀏覽器訪問 `http://localhost:3000`。
