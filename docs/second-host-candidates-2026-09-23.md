# 第二位主持人候選（2026-09-23）

要找的是：**台灣人 · 講美股 · 有 podcast · 單集逐字稿在網路上拿得到**。
排序規則（題目指定）：**先看逐字稿拿不拿得到，再看美股占比**。**這一份不挑人，只給排序與理由。**

標記：`[observed]` 這一輪真的抓到頁面／feed／欄位；`[reported]` 只有第三方說法；`[blocked]` 抓不到。
所有數字都標了讀取日 **2026-09-23**（YouTube 訂閱數、集數、評分數都會變）。

## 怎麼量的（可重跑）

- **節奏／長度／美股占比**：直接讀各家 RSS 的 `<item>`，取**最近 40 集**的 `title + description`，
  數一組美股關鍵詞（美股／那指／標普／輝達／特斯拉／Meta／AMD／聯準會／費半／OpenAI…）與一組台股關鍵詞
  （台股／台積電／加權／櫃買／聯電／法說／央行…），哪一邊命中多就算哪一邊。**這是關鍵詞比數，不是內容時間占比** ——
  用途是排序，不是拿來寫報告的數字。`[observed]`
- **逐字稿**：抓該集 YouTube 播放頁的 `captionTracks`，看有沒有 `zh-TW` 軌、`kind` 是不是 `asr`。`[observed]`
- **訂閱數**：抓頻道 `/about` 的 `subscriberCountText`。`[observed]`

## 排名

### 1. 游庭皓的財經皓角（游庭皓）

一句話：**唯一一家「每天一集 + 當天就有 zh-TW 字幕軌 + 另有第三方逐日結構化整理」的**，逐字稿這一欄沒有對手。

- **平台**：Apple `id1488295306` · Spotify `show/1HOGxT9M7a6kpcDi4q27Q7` · SoundOn player · YouTube `@yutinghaofinance`。
- **RSS**：`https://feeds.soundcloud.com/users/soundcloud:users:735679489/sounds.rss`（SoundCloud 代管，
  **feed 只留最近 500 集**，Apple 記 503 集）`[observed]`
- **節奏／長度**：最近 40 集橫跨 54 天 → **每週約 5.2 集**（週一～週五開盤前 08:30），**中位數 33 分**。
  最新一集 2026-09-22。`[observed]`
- **美股 vs 台股 vs 總經**：最近 40 集裡**美股傾向 22 · 台股傾向 3 · 平手 15**。
  實際上是**總經包著美股**（油價、美債殖利率、Fed、川習會），台股只在央行／房市那幾集是主角。`[observed]`
- **逐字稿**：**兩條路**。
  1. YouTube 直播存檔每天一支，`captionTracks` 有 **`zh-TW`、`kind` 不是 `asr`**（＝上傳的字幕檔，
     不是自動辨識），繁體。2026-09-22 那支 `U4RH_CPe3GQ`（1901 秒）與 09-18 `Ulz539c38mw`（2089 秒）都驗過。`[observed]`
  2. **PodSight 聲見** `https://podsight.tw/yutinghao/` 有 **179 個逐日頁**（`/yutinghao/2025-12-30/` ～ `/yutinghao/2026-09-22/`），
     繁體。**但它不是逐字稿** —— 是 AI 結構化整理，分頁籤「摘要／話題／心法／股票／金句／幽默」，
     單頁約 16k 字，含**股票**專區與逐句金句。頁面沒有「逐字稿」或「全文」字樣。`[observed]`
- **觀眾量體**：YouTube **70.1 萬訂閱**（2026-09-23 讀）；單集直播存檔 **15–28 萬次觀看**。`[observed]`
- **給 pipeline 的適配**：來源穩定、每天一集、字幕軌是上傳的（斷句比 ASR 乾淨）。
  代價是**總經比重高，個股 ticker 密度比股癌低**；PodSight 的「股票」專區可以當**第二來源交叉檢查**，
  但它是別人的 AI 產出，**不能當事實來源**。

### 2. M觀點（Miula）

一句話：**美股科技股占比最高的一家（40 集裡 32 集），字幕軌也驗到了，唯一的傷是 YouTube 停更、逐字稿只蓋到 EP318。**

- **平台**：Apple `id1487378625` · Spotify `show/3q2hc5Zsk9nFEYxXmMqVDW` · SoundOn · YouTube `@miulaviewpoint` · 官網 `miula.tw`。
- **RSS**：`https://feeds.soundon.fm/podcasts/b8f5a471-f4f7-4763-9678-65887beda63a.xml`（**841 集**）`[observed]`
- **節奏／長度**：最近 40 集橫跨 139 天 → **每週 2.0 集**，**中位數 71 分**。最新 EP338（2026-09-21）。`[observed]`
- **美股 vs 台股**：最近 40 集**美股傾向 32 · 台股傾向 1 · 平手 7** —— 五家裡**美股科技股純度最高的長節目**
  （EP338 特斯拉、EP337 PLTR ×輝達、微軟）。`[observed]`
- **逐字稿**：YouTube 單集有 **`zh-TW` 非 ASR 字幕軌**（EP318 `UBqg6zio5SE`、EP317 `gbjZjXkusQo` 都驗過）。
  **問題在覆蓋率**：YouTube 最新一支是 **EP318，2026-07-09** 上傳，而 podcast 已經走到 **EP338（09-21）**——
  **缺 20 集、停更 2 個月半**。`[observed]`
- **觀眾量體**：YouTube **13.1 萬訂閱**（2026-09-23 讀）；Apple/Spotify 合計約 **5,735 則評分、4.6 星** `[reported, podnews.net/podcast/i4ef9]`。
- **給 pipeline 的適配**：內容最對題（美股科技股 + 長篇論述，ticker 密度高），
  但**要嘛只做 EP318 以前的存量、要嘛得自己轉錄新集**。先寫信問他還會不會上 YouTube，是最便宜的下一步。

### 3. 韭菜畢業班（叔叔）

一句話：**YouTube 與 podcast 同步（EP260 只差一天）、字幕軌驗到了，但內容是台股為主，美股只是配菜。**

- **平台**：Apple `id1711618619` · SoundOn · YouTube `@unclestock`（另有 `@uncle_stock7481` 舊頻道）。
- **RSS**：`https://feeds.soundon.fm/podcasts/70907bd6-d0ae-4b64-bc38-2bf48ae4fc36.xml`（**262 集**）`[observed]`
- **節奏／長度**：最近 40 集橫跨 139 天 → **每週 2.0 集**（自述固定週日＋週四不定時 `[reported]`），**中位數 23 分**。
  最新 2026-09-20。`[observed]`
- **美股 vs 台股**：最近 40 集**台股傾向 20 · 美股傾向 13 · 平手 7**。最近三集標的是聯電、宏致、聯亞、大甲、穩懋
  —— **全是台股個股**。`[observed]`
- **逐字稿**：YouTube EP260 `14hbQLT4qro`（2026-09-19 上傳，1279 秒）有 **`zh-TW` 非 ASR 字幕軌**，
  且**集數編號與 podcast 對得起來**（EP260 = feed 最新那一集），繁體。`[observed]`
- **觀眾量體**：YouTube **1.71 萬訂閱**（2026-09-23 讀）。`[observed]`
- **給 pipeline 的適配**：**逐字稿取得最乾淨的一家**（同步、有編號、短、20 分鐘），
  但如果這個站的定位是「美股」，它會讓 ticker 表變成台股表。**它是技術上最好做、題目上最不對的一家。**

### 4. 美股投資學-財女珍妮（JC 財經觀點）

一句話：**美股純度 40/40 滿分、每天一集，但這一輪找不到任何可抓的單集逐字稿來源** —— 排第四純粹輸在逐字稿。

- **平台**：Apple `id1546879892` · Spotify `show/3dTKJkvceKNHaYoh7Przbg` · SoundOn · YouTube `@jcinsight財女珍妮` · 官網 `jcinsight.info`。
- **RSS**：`https://feeds.soundon.fm/podcasts/4a8660a0-e0d0-490b-8d46-c28219606f47.xml`（**935 集**）`[observed]`
- **節奏／長度**：最近 40 集橫跨 59 天 → **每週 4.7 集**（平日早上 08:30），**中位數 31 分**。最新 2026-09-22。`[observed]`
- **美股 vs 台股**：最近 40 集**美股傾向 40 · 台股傾向 0 · 平手 0** —— **五家裡唯一的滿分**
  （AMD 市值破兆、Meta、費半、AI 基建）。`[observed]`
- **逐字稿**：**沒找到**。她的 YouTube 頻道（14.5 萬訂閱）放的是**另一套長片訪談**
  （`Lr2cESm3Yug` ft. 朱楚文、房產經濟學…），**不是每天那一集 podcast**，所以沒有對得上的字幕軌；
  PodSight 沒收她；`statementdog` 那類文字版也沒有。`[blocked]`
  **只剩 Apple/Spotify 平台自動逐字稿**，那是播放器內建、抓不下來。`[observed: 站內無、reported: 平台有]`
- **觀眾量體**：Apple TW **4.8 星 / 2,190 則評分**；YouTube **14.5 萬訂閱**（2026-09-23 讀）。`[observed]`
- **給 pipeline 的適配**：**題目上最對、工程上最貴** —— 要收她就等於自己做 ASR（每天 31 分鐘）。
  如果之後這個站本來就要自己轉錄，她會直接跳到第一名。

### 5. 財報狗 - 掌握台股美股時事議題

一句話：**名字有美股，內容是台股產業；YouTube 有片沒字幕、部落格只有節目摘要而且停在 2024 年。**

- **平台**：Apple `id1513810531` · Firstory · YouTube 播放清單 `PLfNkgzpHbvhADG_wiJub8acTHZErggKIO` · 官網 `statementdog.com/podcast`。
- **RSS**：`https://feed.firstory.me/rss/user/clcftm46z000201z45w1c47fi`（**647 集**）`[observed]`
- **節奏／長度**：最近 40 集橫跨 149 天 → **每週 1.9 集**，**中位數 45 分**（訪談集會到 105 分）。最新 566 集（2026-09-20）。`[observed]`
- **美股 vs 台股**：最近 40 集**台股傾向 20 · 美股傾向 4 · 平手 16**。`[observed]`
- **逐字稿**：**最弱的一家**。YouTube 上的 `CxrpiPcHGi8`（566 集）、`FTBvADoGVTk`（565 集）
  播放頁**完全沒有 `captionTracks`**；官方部落格 podcast 分類**只有節目摘要（show notes），
  而且最新一篇停在 2024-12-27 的 S2E401**。`[observed]`
- **觀眾量體**：Apple/Spotify 合計約 **4,148 則評分、4.7 星** `[reported, podnews.net/podcast/i9m37]`；
  YouTube `@statementdog_official` **1.44 萬訂閱**（2026-09-23 讀）`[observed]`。
- **給 pipeline 的適配**：不建議當第二位主持人 —— 逐字稿與美股占比**兩欄都墊底**。

### 備取：百舜說美股

**美股純度與資歷最好（CSIA 合格、前五大券商美股分析師），但量體與頻率都太小，且沒有任何逐字稿路徑。**
Apple `id1690919899`：**53 集、雙週更、10–28 分、4.9 星 / 41 則評分** `[reported, Apple 頁面]`；
官網 `usstockinvesting.com`（電子報 + PressPlay 訂閱），**沒有 YouTube 頻道**（頻道搜尋 0 命中 `[observed]`），
`itunes.apple.com/lookup` 對這個 id 回 0 筆，**RSS 這一輪沒拿到** `[blocked]`。

## 排名總表

| # | 節目 | 逐字稿（第一排序） | 美股占比（第二排序） | 一句話理由 |
|---|---|---|---|---|
| 1 | 游庭皓的財經皓角 | **每日 zh-TW 上傳字幕軌 + 179 天第三方結構化整理** | 22/40 | 唯一兩條逐字稿路徑都通的，而且天天有 |
| 2 | M觀點 | zh-TW 字幕軌有，但**只到 EP318（缺 20 集）** | **32/40** | 內容最對題，卡在 YouTube 停更 |
| 3 | 韭菜畢業班 | zh-TW 字幕軌 + **集數同步** | 13/40（台股 20） | 技術上最好做，題目上最不對 |
| 4 | 財女珍妮 | **查無可抓來源** | **40/40** | 題目滿分、工程上等於要自己做 ASR |
| 5 | 財報狗 | 無字幕軌、部落格停在 2024 | 4/40（台股 20） | 兩欄都墊底 |
| 備 | 百舜說美股 | 無 | 高（未量化） | 雙週更 53 集 41 則評分，量體太小 |

## 三個一定要先處理的坑

1. **YouTube 字幕軌「看得到」不等於「拿得到」。** `captionTracks` 裡的 `baseUrl` 這一輪直接 curl
   回 **0 bytes**（2026-09-23 試 `U4RH_CPe3GQ`）—— 現在要靠 `yt-dlp` 之類的工具帶參數才取得下來。
   **這一份只證明了字幕軌存在、語言是 `zh-TW`、不是 ASR；沒有證明整段文字已經到手。** `[observed]`
2. **PodSight 不是逐字稿。** 它是 AI 摘要，而且**它已經在做股癌**（`https://podsight.tw/gooaye/`，
   **84 集，EP0615–EP0698**，2026-09-23 讀）。要嘛把它當交叉檢查的第二來源，要嘛當競品看，
   **兩種用法都不能把它的文字當事實** `[observed]`。
3. **radiotaiwan.tw 的「逐字稿」頁籤不要當來源。** 節目頁是 client render，
   `sitemap-podcasts-1.xml.gz` 裡**只有 `/podcasts` 一個網址、沒有任何單集頁**，
   那個頁籤看起來是內嵌播放器的 UI。`[observed]`

## 讀過的網址

RSS／API：
- `https://feeds.soundcloud.com/users/soundcloud:users:735679489/sounds.rss`
- `https://feeds.soundon.fm/podcasts/4a8660a0-e0d0-490b-8d46-c28219606f47.xml`
- `https://feeds.soundon.fm/podcasts/b8f5a471-f4f7-4763-9678-65887beda63a.xml`
- `https://feeds.soundon.fm/podcasts/70907bd6-d0ae-4b64-bc38-2bf48ae4fc36.xml`
- `https://feed.firstory.me/rss/user/clcftm46z000201z45w1c47fi`
- `https://itunes.apple.com/lookup?id=<1546879892|1711618619|1488295306|1513810531|1487378625|1690919899>&country=tw`

Apple／目錄：
- `https://podcasts.apple.com/tw/podcast/%E7%BE%8E%E8%82%A1%E6%8A%95%E8%B3%87%E5%AD%B8-%E8%B2%A1%E5%A5%B3%E7%8F%8D%E5%A6%AE/id1546879892`
- `https://podcasts.apple.com/tw/podcast/%E7%99%BE%E8%88%9C%E8%AA%AA%E7%BE%8E%E8%82%A1/id1690919899`
- `https://podcasts.apple.com/tw/podcast/%E8%B2%A1%E5%A0%B1%E7%8B%97-%E6%8E%8C%E6%8F%A1%E5%8F%B0%E8%82%A1%E7%BE%8E%E8%82%A1%E6%99%82%E4%BA%8B%E8%AD%B0%E9%A1%8C/id1513810531`
- `https://podcasts.apple.com/tw/podcast/%E9%9F%AD%E8%8F%9C%E7%95%A2%E6%A5%AD%E7%8F%AD/id1711618619`
- `https://podnews.net/podcast/i9m37` · `https://podnews.net/podcast/i4ef9`
- `https://www.radiotaiwan.tw/podcasts/cai-bao-gou` · `https://www.radiotaiwan.tw/podcasts/you-ting-hao-de-cai-jing-hao-jiao`
- `https://www.radiotaiwan.tw/podcasts/cai-nu-jenny` · `https://www.radiotaiwan.tw/sitemap.xml` · `https://www.radiotaiwan.tw/robots.txt`

逐字稿／文字來源：
- `https://podsight.tw/` · `https://podsight.tw/yutinghao/` · `https://podsight.tw/yutinghao/2026-09-22/` · `https://podsight.tw/gooaye/`
- `https://statementdog.com/blog/archives/category/podcast` · `https://statementdog.com/podcast`
- `https://unclestocknotes.substack.com/podcast`（大叔美股筆記，**查不到 podcast 單集與逐字稿** `[blocked]`）
- `https://usstockinvesting.com/`

YouTube（頻道頁與單集播放頁，均 2026-09-23 讀）：
- `https://www.youtube.com/@yutinghaofinance/about` · `/videos` · `/streams`
- `https://www.youtube.com/@miulaviewpoint/about` · `/videos`
- `https://www.youtube.com/@jcinsight%E8%B2%A1%E5%A5%B3%E7%8F%8D%E5%A6%AE/about` · `/videos`
- `https://www.youtube.com/@unclestock/about` · `/videos`
- `https://www.youtube.com/@statementdog_official/about` · `/videos`
- `https://www.youtube.com/watch?v=` `U4RH_CPe3GQ` · `Ulz539c38mw` · `UBqg6zio5SE` · `gbjZjXkusQo` · `14hbQLT4qro` · `ZJFcXrKYRLI` · `CxrpiPcHGi8` · `FTBvADoGVTk` · `Lr2cESm3Yug` · `Lv57oHCe4mM`
- `https://www.youtube.com/playlist?list=PLfNkgzpHbvhADG_wiJub8acTHZErggKIO`

---

樣本說明：美股占比是**最近 40 集的關鍵詞比數**，不是內容時間占比，**樣本 40 集、單一時間窗（約 2–5 個月）**；
訂閱數與評分數是 2026-09-23 當天讀的快照。本頁只做來源盤點與排序，**不挑人、不是投資建議**。
