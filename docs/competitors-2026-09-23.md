# 競品盤點：誰已經在做股癌／游庭皓／M觀點的摘要與逐字稿（2026-09-23）

全部以 WebSearch / WebFetch 讀取，讀取日期一律 **2026-09-23**（無瀏覽器、無登入頁）。
`[observed]` = 該頁面上直接讀到的字；`[inferred]` = 我的推論。沒讀到的欄位寫「頁面未顯示」，不推算。

## A. 做「摘要 + 逐字稿 + 標的」的產品型競品

### A1. PodSight 聲見 — https://podsight.tw/ ｜ https://podsight.tw/gooaye/ ｜ https://podsight.tw/yutinghao/
- 提供：每集完整逐字稿（自稱「不截取、不省略」）+ AI 結構化摘要（主題、提及實體、關鍵引述、提及個股）+ 站內搜尋。明講「不加個人觀點，不做延伸解讀」。[observed]
- 覆蓋：股癌 **84 集，EP615–EP698**；游庭皓 **179 集，最新 2026-09-22**；首頁未列 M觀點。[observed]
- 更新：GitHub Actions 每日兩次自動跑（RSS→Whisper→Gemini→靜態站→Telegram）。[observed，見 A2]
- 受眾訊號：頁面未顯示流量或訂閱數。Telegram 頻道 `@podsight_tw` 於頁尾連出，但 t.me 預覽頁讀不到訂閱數。[observed]
- 變現：頁面上看不到廣告或付費方案。[observed]
- 相對我們缺什麼：**沒有段落級立場標記、沒有跨節目的個股頁、沒有跨節目搜尋、沒有主理人自己的判斷**；它刻意不表態。

### A2. PodSight 原始碼 — https://github.com/jazzpujols34/podsight
- 提供：整條 pipeline 開源（Groq Whisper 轉錄、Gemini 摘要、個股提及標記、全文搜尋、Telegram 推播、可編輯摘要的 dashboard、Vercel 靜態站）。新增節目只要在 `podcasts.yaml` 加一行。[observed]
- 覆蓋：README 寫追三檔節目 —— 股癌（27+ 摘要）、游庭皓（42+）、**兆華與股惑仔（39+）**，與線上站數字不同步。[observed]
- 社群訊號：**0 stars、734 commits**、MIT。[observed]
- 意義：**「每集摘要 + 逐字稿 + 個股標記 + 搜尋」這一組已經是商品化的開源零件**，不是護城河。

### A3. Gooaye Tracker — https://github.com/jiawei0601/gooaye-tracker ｜ 儀表板 https://jiawei0601.github.io/gooaye-tracker/data/dashboard.html
- 提供：每集摘要 + **個股／產業「立場時間軸」**，每次提及標 `看多／看空／持有中／已出場` 並附論據，另有互動儀表板與（後端未公開的）問答 AI persona。[observed]
- 覆蓋：**EP1–EP678（2020-02 起）**，追蹤 **758 檔個股、751 條產業觀點**，每週三／六自動更新。[observed]
- 社群訊號：**0 stars**，新建立。[observed]
- 變現：無。[observed]
- 相對我們缺什麼：立場是**「每次提及」級**不是**段落級**；只有股癌一檔（README 說改 RSS 即可擴充）；逐字稿不公開展示；無主理人分析。
- **這是目前最接近我們規劃的一個專案。**

### A4. AI 智慧產業地圖 — https://aistockmap.com/influencer/Gooaye/ ｜ https://aistockmap.com/
- 提供：把節目內容整成題材（PCB、HBM、AI PC…），可依情緒（正／中／負）篩選，接產業鏈與個股頁；摘要標「人工整理」，**不提供逐字稿**，每集連回 Apple Podcasts／YouTube。[observed]
- 覆蓋：該頁只有 **5 集，2026-09-05 ~ 09-19**；influencer 目前只有股癌一位。[observed]
- 變現：頁面無廣告；有 iOS／Android App。[observed]
- 相對我們缺什麼：集數極少、沒有逐字稿、情緒是題材級不是段落級、跨節目未做。
- 值得注意：**它的重心是個股／產業鏈頁，把 podcast 當訊號源接進去** —— 方向跟我們的個股頁一致。

### A5. 其他開源嘗試
- https://github.com/allen-hsu/gooaye-transcripts — MLX Whisper 轉錄站，瀑布卡片、全文搜尋、自動標籤（台積電／AI／衛星）；**1 commit、0 stars、無線上網址**。[observed]
- https://github.com/HaoweiChan/tinboker（PR #790，2026）— 台美股儀表板 + 關係圖 + AI 摘要財經 podcast 的 monorepo，其中一條 pipeline 在本地 Whisper 轉錄股癌。私人專案性質。[observed]

## B. 純逐字稿（社群）

### B1. 股癌逐字稿全集 — https://whatmkreallysaid.com/
- 提供：**AI 轉錄 + 人工校正的全集逐字稿**，關鍵字搜尋、依集數／日期篩選、11 集「經典集數」精選。自述非商業、僅供學習交流，非官方。[observed]
- 覆蓋：首頁自述 **580+ 集**；集數列表為動態載入，**本次讀不到最新集號與日期**（最新集數待確認）。[observed]
- 變現：無廣告、無贊助資訊，只留聯絡信箱。[observed]
- 相對我們缺什麼：沒有摘要、沒有個股標記、沒有立場、沒有個股頁、只有股癌一檔。

### B2. Gooaye Transcript — https://www.gooayetranscript.com/ ｜ /about
- 提供：股癌逐字稿分享 + 搜尋，另做節目中提過的旅遊／餐廳／電影／書籍索引。站長署名 Trent。[observed]
- 覆蓋：關於頁「最後更新 2024-10-30、發布 2024-09-04」，文章列表動態載入讀不到；**[inferred] 已停更或長期未動**。
- 變現：頁面上看不到。[observed]

## C. 人寫的筆記（訂閱 / 平台文）

### C1. 閱讀股癌（方格子）— https://vocus.cc/user/@read_gooaye ｜ salon https://vocus.cc/salon/read_gooaye
- 提供：「(非官方)股癌 Podcast 摘要與整理過的逐字稿」。[observed]
- 覆蓋：**174 篇**，列表可見 2026-08-19 ~ 2026-09-19，最新 **EP698（2026-09-19）**，每週二篇跟播。[observed]
- 受眾／變現：**187 會員、40 追蹤者，多數文章「付費限定」**（價格未顯示）。[observed]
- 相對我們缺什麼：鎖在方格子、無個股頁、無跨節目、無結構化立場；但**它證明「摘要+整理稿」有人願意付錢**。

### C2. 股癌筆記（方格子 GoodStocks room）— https://vocus.cc/salon/GoodStocks/room/gooaye
- 覆蓋：約 20 篇，2026-06-23 ~ **2026-08-27（EP691）**，19 篇免費公開。作者 Shoung Liao。[observed]
- 相對我們缺什麼：已落後最新集數、無標的結構、無搜尋。

### C3. 股人筆記（Substack）— https://gdinvestornotes.substack.com/
- 提供：GordonHsu 的逐集「學習筆記」，含個人心得與研究主題；同步發方格子。可見 EP659、EP676、EP678、EP684、EP693–EP697。[observed]
- 變現：免費訂閱（付費層與訂閱數頁面未顯示）。[observed]
- 相對我們缺什麼：無逐字稿、無個股頁、無搜尋；但**有「主理人自己的分析」這一格，是我們要打的同一格**。

### C4. Medium 股癌筆記 — https://medium.com/股癌筆記（EP501 例：/股癌ep501筆記整理-acd5cdb6f495）
- 本次 WebFetch 被 Medium 擋（HTTP 403）；搜尋結果顯示作者 Kevin Malamute，最近可見的是 EP501 等較舊集數。**覆蓋與最新日期待確認**。[observed: 403]

### C5. 零散筆記
- Threads `@wangli0608`：股癌 EP604 / EP610「AI 整理筆記」，2025-10 / 2025-11，單篇貼文形式。[observed]
- 社工日常 https://socialworkerdaily.com/index/invest/notes-of-gooaye/ ：部落格式心得筆記，非逐集。[observed，搜尋結果]
- 游庭皓：https://roo.cash/community/post/840586（2024-06-07 單集筆記）、方格子「楷文備忘錄」https://vocus.cc/article/6756eb8cfd89780001a19865（2024-12-09 單集）。**沒有任何人在逐集持續做游庭皓的筆記**（除了 PodSight 的機器摘要）。[inferred，基於搜尋未命中]

## D. 平台與官方管道（不是競品，但是替代品）

- **Radio Taiwan** https://www.radiotaiwan.tw/podcasts/gooaye-gu-yan ｜ https://www.radiotaiwan.tw/podcasts/you-ting-hao-de-cai-jing-hao-jiao ｜ https://www.radiotaiwan.tw/podcasts/mguan-dian —— 目錄站：播放器 + 集數列表 + 搜尋，**無逐字稿、無摘要**（多數集描述顯示「沒有可用的單集描述」）。股癌最新 EP698（2026-09-19）；游庭皓列 **2007 集**，最新 2026-09-22。同站另列 12 檔台灣商業 podcast。[observed]
- **Apple Podcasts** 股癌 https://podcasts.apple.com/tw/podcast/id1500839292 —— **4.8 星／36,201 則評分、698 集**。[observed] M觀點 https://podcasts.apple.com/tw/podcast/id1487378625 —— 官方頁自述 3000+ 則評分、4.7 星。[observed] Apple 的自動逐字稿只在 App 內、不可被搜尋引擎索引。[inferred]
- **官方 Telegram**：股癌 https://t.me/s/Gooaye **106,000 訂閱**，貼產業評論與連結、最新 2026-09-21，**不貼逐字稿或筆記**；游庭皓 https://t.me/s/yu_finance；M觀點 https://t.me/s/miulaviewpoint。[observed]
- **主持人自己的文字版**：Miula 方格子「科技巨頭解碼」https://vocus.cc/user/@miula —— **352 篇、23.7K 會員、11,907 追蹤者，最新 2026-09-16**，是原創長文不是節目筆記。[observed] 游庭皓：官網 https://yutinghao.finance/ 與聯合新聞網專欄 https://udn.com/author/articles/2/5528/pv。[observed]
  → **[inferred] M觀點的「文字需求」已被主持人自己的付費專欄吃掉一大半，第三方筆記幾乎不存在。**

## E. 三檔節目的競爭密度（一句話）

| 節目 | 逐字稿 | 每集摘要 | 個股標記 | 立場 | 跨節目 |
|---|---|---|---|---|---|
| 股癌 | 多（whatmkreallysaid、PodSight、2 個 GitHub） | 很多（PodSight、方格子×2、Substack、Medium、Threads） | 有（PodSight、aistockmap、gooaye-tracker） | 只有 gooaye-tracker（提及級） | 無 |
| 游庭皓 | 只有 PodSight | 只有 PodSight（179 集）+ 兩篇 2024 年單集筆記 | 無 | 無 | 無 |
| M觀點 | 查無 | 查無第三方 | 無 | 無 | 無 |

## 定位判斷（≤10 行，zh-TW）

1. **沒有人在做我們那一整組。** 逐字稿、每集摘要、個股標記、立場、跨節目搜尋 —— 五格同時有的，一個都沒有。
2. **最接近的是 gooaye-tracker**（個股立場時間軸、EP1–678、0 star、只有股癌、立場是提及級不是段落級）；**其次是 aistockmap**（個股／產業鏈頁 + 情緒，但只 5 集、沒逐字稿）。
3. **已經商品化、不要拿來當賣點的**：AI 每集摘要、全集逐字稿、全文搜尋 —— PodSight 免費做完而且**整條 pipeline 開源（MIT、0 star）**，任何人一天可複製。
4. 逐字稿本身也商品化：whatmkreallysaid 580+ 集免費且人工校正過。
5. **真正的空白有三塊**：(a) **段落級立場**（誰都只做到「這集提到 X」）；(b) **跨節目的個股頁**（同一檔股票，股癌怎麼說、游庭皓怎麼說、時間怎麼變）；(c) **游庭皓與 M觀點幾乎無人整理**，M觀點連逐字稿都查不到。
6. 付費意願是有的：方格子「閱讀股癌」187 會員在付錢買「摘要 + 整理稿」，而它沒有個股頁也沒有搜尋。
7. **建議打的第一張牌：跨節目的個股頁 +（段落級）立場**。同一個代號把三檔節目的原話、日期、方向擺在一頁，是現存任何一家都做不到的，而且它是後面所有東西（搜尋、追蹤、回測）的骨架。
8. 摘要與逐字稿照做，但**當基礎建設不當賣點**；對外的一句話是「三個節目、同一個代號、看得到他什麼時候改口」。
9. **先補游庭皓**（PodSight 只做了 179 集機器摘要，無人做立場）；M觀點文字需求已被 Miula 自己的付費專欄吃走，優先序放最後。
10. 先行者的弱點是**採用度**：兩個 GitHub 競品都 0 star、aistockmap 只 5 集 —— 這一局還沒有人贏，但也還沒有人證明有人要。

**非投資建議。** 所有數字以上列 URL 於 2026-09-23 的頁面內容為準；標「待確認」者未讀到。
