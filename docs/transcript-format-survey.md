# 逐字稿版型調查（2026-09-21）

只看**格式**，不存任何競品文字。標記：`[observed]` 這一輪真的抓到頁面／程式碼；`[reported]` 只有搜尋摘要
或第三方說法；`[blocked]` 抓不到。每家三行：段落怎麼切 · 段首放什麼 · 有沒有反白／章節／跳播。

## whatmkreallysaid.com（股癌逐字稿站，最接近我們要做的）`[observed]`

- **段落**：逐字稿存成 markdown，用**空行**切段；`<h1>`～`<h3>`、`<ul>`、`<blockquote>` 原樣保留，
  其餘包成 `<p>`，段內單換行轉 `<br>`。（`episode-viewer.js` 的 `split('\n\n')`）
- **段首**：什麼都沒有 —— 沒有時間碼、沒有說話者、沒有章節標籤。每段只多一個 `id="p-<n>" data-paragraph="true">`，
  用途是**分享單一段落**（網址 `#p-12`）。
- **反白／跳播**：有反白但不是我們要的那種 —— `createElement('mark')` 只用在**搜尋關鍵字**與
  `highlightFromHash()`（從分享連結進來把那一段整段打亮）。**沒有音檔播放器、沒有跳播**。
  站內搜尋支援 word／date／episode number 三種模式。

## gooayetranscript.com（另一個股癌逐字稿站）`[observed 前端框架，內容為 SvelteKit 動態載入]`

- SvelteKit 靜態殼 + client render；HTML 裡看不到逐字稿標籤，段落結構抓不到 `[blocked]`。
- 有載 `tippy`（tooltip 套件）→ 頁面上有 hover 註解這種互動。
- 自述是「逐字稿分享 + 重點查找」，賣點是**索引**（提到的餐廳、書、電影），不是閱讀體驗。

## gooaye-tracker（GitHub 開源，AI 立場時間軸）`[reported]`

- 不做逐字稿閱讀，做的是**立場時間軸**：每檔股票一條「看多／看空／續抱／出場」時間線，涵蓋 EP1–678。
- 段落單位是「一次提及」而不是文字段落；產出是儀表板不是文章。
- 對我們的用處：證明「一檔 × 時間軸」這個視圖有人做且有人看，但**沒有人把它接回逐字稿段落**。

## Podscribe `[blocked]`

- `app.podscribe.ai` 301 到 `app.podscribe.com`，內容是 client render，抓到的 HTML 只有站名。
- 已知賣點是廣告歸因（ad attribution）不是閱讀體驗 `[reported]`。

## Tapesearch `[blocked]`

- 單集頁 HTTP 403（同日另一份研究 E 檔也是 403）。已知定位是跨節目**全文檢索**，不判立場 `[reported]`。

## Snipd `[blocked]`

- 分享頁需要真實 snip id，手上沒有 → 404。已知格式是「一個 snip = 一段音檔 + AI 標題 + 該段逐字稿」`[reported]`。

## Apple Podcasts 網頁版 / YouTube 逐字稿面板 `[reported]`

- Apple：逐字稿隨播放**逐句捲動並打亮當前句**，點一句就跳播；沒有段落標籤。
- YouTube：右側面板一列一句，**每列前面一個時間碼**，點了跳播；可切「切換時間戳記」。
  兩家的共同點：**單位是句子，錨點是時間**，不是主題。

## 結論：抄哪一家、加什麼

**沒有一家做到「段落 × 主題標籤 × 個股 × 反白」**。

- 從 whatmkreallysaid 抄：**markdown 空行切段 + 每段一個穩定 anchor id**（分享／回捲都靠它）、
  以及「反白是一個 `<mark>` 而不是換整段樣式」。
- 從 Apple／YouTube 抄：**點了就跳播**（我們放在段首的 ▶，不印秒數）。
- 從 gooaye-tracker 抄：**立場屬於某一檔而不是某一句**，所以個股 chip 放段首那一列，不埋在內文裡。
- 我們多做的三件（競品都沒有）：段首的**主題標籤**（來自摘要的 segment_tags）、段首的**個股 chip**
  （紅上箭／綠下箭／灰點）、以及**重點 ↔ 逐字稿句子的雙向反白跳轉**。
