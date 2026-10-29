# 找找台灣鏡頭君 — Google Apps Script (GAS) 後端設定說明

本系統具備嚴格的 **Google Sheets 實地打卡寫入與安全驗證** 機制。為了解決前端直接呼叫 Google Apps Script 可能產生的 302 重新導向與跨網域讀取問題，專案已在 Express 伺服器中內建安全中介代理層（也可選擇 Cloudflare Worker 中介層），確保回傳真實的 JSON 驗證結果，不使用假資料或 `no-cors` opaque 矇混。

---

## 快速設定 5 步驟

### 步驟 1：建立 Google 試算表
1. 前往 [Google Drive](https://drive.google.com/)。
2. 點擊「新增」 -> 「Google 試算表」，命名為：`台灣鏡頭君打卡資料庫`。

### 步驟 2：開啟 Apps Script 編輯器
1. 在試算表上方選單點選 **「擴充功能 (Extensions)」** -> **「Apps Script」**。
2. 將編輯器內原本的內容全部清空。
3. 開啟本專案的 `google-apps-script/Code.gs`，完整複製貼上。
4. 按下儲存圖示（或 `Ctrl + S` / `Cmd + S`）。

### 步驟 3：部署為網頁應用程式 (Web App)
1. 點擊右上角藍色的 **「部署 (Deploy)」** -> **「新增部署 (New deployment)」**。
2. 左側選取齒輪圖示，選擇 **「網頁應用程式 (Web App)」**。
3. 填寫部署設定（**非常重要**）：
   - **說明 (Description)**: `Taiwan Live Cam Checkin API v1`
   - **執行身分 (Execute as)**: `我 (您的 Google 帳戶 / Me)`
   - **誰可以存取 (Who has access)**: `任何人 (Anyone)`
4. 點擊 **「部署 (Deploy)」**。
5. Google 會彈出授權視窗，請點選「核准權限 (Authorize access)」，選擇您的 Google 帳號，點擊「進階 (Advanced)」並前往專案以完成授權。

### 步驟 4：取得 Web App 網址
部署完成後，畫面會顯示「網頁應用程式網址 (Web app URL)」，格式如下：
```
https://script.google.com/macros/s/AKfycb.../exec
```
請複製此 URL。

### 步驟 5：設定環境變數
在專案根目錄的 `.env` 檔案中加入：
```env
GAS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycb.../exec"
```
完成後重新啟動伺服器，後端即可在每次使用者 GPS 打卡時，自動寫入並驗證該筆資料！

---

## 安全防護特色
- **LockService 並發防護**：使用 `LockService.getScriptLock()` 等待鎖定最多 10 秒，杜絕多人同時打卡時的試算表行數覆寫衝突。
- **公式注入過濾 (Formula Injection Prevention)**：使用者姓名與備註若含有 `=, +, -, @` 開頭字元，自動加上單引號 `'` 轉義，防止 Google Sheets 執行惡意公式或外洩資料。
- **重複提交防護 (Anti-Replay Cache)**：以 `CacheService` 紀錄 `requestId` 600 秒，防範重送攻擊。
- **寫入讀回檢驗 (Read-back verification)**：呼叫 `SpreadsheetApp.flush()` 後立刻重新讀取試算表最後一列比對 Record ID，只有真實寫入成功才回傳 `verified: true`。
- **隱私經緯度截斷**：僅儲存約 110 公尺的約略座標，不暴露使用者個人細緻行蹤。
