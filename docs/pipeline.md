# 一集是怎麼進來的（2026-09-23 起）

> 這一份是**操作手冊**：新的一集從 RSS 到上站要跑哪幾行、哪幾關還是人在做、一集花多少錢。
> 口徑（立場怎麼判、逐字稿怎麼守）在 ryvn-finance 的 `docs/podcast-pipeline.md` 與
> `docs/podcast-summary-schema.md`，這一份不重寫那些規則，只講**怎麼跑**。
>
> 位元組（音檔、whisper 稿、`structured.md`、摘要 JSON）**全部在 repo 外**：
> `~/.ryvn-finance/podcasts/<show>/`。repo 裡只有 `content/`（站端吃的 JSON）
> 與 `content/_meta/`（成本帳，不上站）。

## 一、新的一集

```bash
# 1. RSS：pubDate／時長／音檔／原標題（ryvn-finance）
cd ~/code/gh-ryvn-dev/ryvn-finance && npm run podcast:fetch

# 1b. 逐集連結與原作者（本 repo，寫 <cache>/links.json）
npm run feed

# 2. 逐字稿 —— 二選一
#    a) 社群稿（EP693 以前）：入庫後跟我們的時間碼對齊
uv run --project py python py/tools/podcast_community_store.py
uv run --project py python py/tools/podcast_align.py --map "EP694=2026-09-18"
#    b) 沒有社群稿：自家 whisper（large-v3-turbo + OpenCC s2twp 逐行）
cd ~/code/gh-ryvn-dev/ryvn-finance && npm run podcast:transcribe

# 3. 排版 ＋ 摘要 ＋ 段落級立場（本 repo，這一支就是 RF-1126）
npm run summarise -- --episode 694
npm run summarise -- --from 681 --to 690        # 一批
npm run summarise -- --episode 694 --dry-run    # 只算 prompt 大小與段數，不呼叫模型

# 4. 站端組裝 ＋ 三個閘門
npm run content && npm run check:transcript && npm run check:marks
npm run og                                      # 新的一集／新的代號要補 OG 圖，少一張 check:render 就紅
npm run build                                   # postbuild 跑 check:render

# 5. 報價（可選；抓不到就顯示「報價暫時抓不到」，不補 0）
npm run prices

# 6. 部署：push 就部署（.github/workflows/deploy.yml）
git push
```

## 二、第 3 步那一支在做什麼

`scripts/episode_ingest/summarise.mjs`。**一集一次，可重跑，閘門沒過就不寫檔。**

1. **逐字稿來源**由 `sources.mjs` 的 adapter 決定（社群稿優先，沒有才自家 whisper）。
   - 社群稿：`structured.md` 由 `structure-transcript.mjs` **機械**產生，模型一個字都不碰正文。
   - 自家 whisper：模型只准改標點／簡繁／錯字，切 9,000 字一塊逐塊清；
     `check-structured.mjs` 用 **0.90 bigram-Dice 相似度**守著（今晚量到 0.96–0.97）。
2. **摘要 ＋ 段落級立場**：`prompts/summary-v2.1.md`，schema v2.1
   （`key_points[].p`、`tickers[] = {ticker, p, stance[], basis, quote, caveat, reason, t}`）。
   段號 `p-<n>` 就是 `structured.md` 的段序（0 起算，`:::` 圍籬不算一段）。
3. **四個機械閘門**（`RF-1124`）：`quote_gate`／`entity_gate`／`flip_gate`／`one_per_paragraph`。
   規則只有一份實作，住在 ryvn-finance 的 `py/ryvn_finance/podcasts/stance_gates.py`，
   本 repo 只有轉接（`stance_gates.py`）與站端算段落的那一半（`gates.mjs`）。
   `reject` 的列丟掉、`needs_review` 的列留著標灰點。
4. **寫檔前的形狀檢查**：禁字（模型／買進／賣出／建議／目標價／Jev／簡單說／簡單講）、
   每一列的 `p` 要對得到段、代號要在 `ticker-names.json` 且 `confirmed`、重點 ≥6 筆、
   立場列所在的那一段真的有提到那一檔。**任何一條紅就整集不寫**，帳照樣落。
5. **帳**：`content/_meta/EP<n>.ingest.json` —— 模型、每一次呼叫的 prompt sha256、
   token、美元、閘門丟掉了哪幾列。**跑失敗也寫**（token 已經花掉了）。這個資料夾不上站。

常用旗標：`--episode N`／`--from A --to B`／`--dry-run`／`--force`（重做已經有的集）／
`--reuse-raw`（沿用快取裡的模型回覆，改站端檢查後重跑不用再花錢）／
`--reclean`（自家 whisper 的清稿也重做）／`--model`。

**模型後端只有一條：訂閱制 CLI。** 無頭 `claude -p --output-format json --model claude-opus-5`
（OAuth 憑證，不需要也不讀任何 key），`usage` 與 `total_cost_usd` 由它回報。
**以 key 計費的 API 路徑由主人拍板禁止**（2026-09-23：「不能用 api 沒儲值也絕對不能用 用訂閱」
「直接把key那個做法刪掉」），`client.mjs` 裡那一條已經整段刪掉 —— 沒有後端選項、沒有 key 查找、
沒有任何 HTTP endpoint。要再開那條路要先有新的拍板。

## 三、還是人在做的那幾件

- **小標**（`headings/EP<n>.json`）：社群稿那一路的分段小標是人寫的，沒有就整集不分小標。
- **`ticker-names.json` 的 `confirmed`**：新代號第一次出現要人確認中文名與別名，確認前那一列會被擋。
- **`needs_review` 的灰點**：`flip_gate` 判要覆核的列上站時是灰點，要不要改成實心由人看。
- **報價**：`npm run prices` 要手跑（或排程）；抓不到就顯示抓不到。
- **新節目的授權**：`transcript_display` 是**授權欄**，只有主人能改（見第五節）。

## 四、一集多少錢（2026-09-23 實測）

| 模式 | 集數 | 呼叫／集 | 輸入（含 cache write） | 輸出 | 一集美元（中位） | 區間 |
|---|---|---|---|---|---|---|
| `community` | 9 | 1 | 35,421 | 18,716 | **0.82 USD** | 0.60–1.13 |
| `own-whisper` | 1 | 4 | 101,064 | 98,286 | **3.48 USD** | 3.48–3.48 |

量到的是 10 集（2026-09-23，無頭 `claude -p`，模型 claude-opus-5）——
合計 **11.01 USD**。

一集就是**一次到多次模型呼叫**，其它關（RSS、對齊、組裝、閘門、build）不花錢。
社群稿那一路只呼叫一次（摘要＋立場）；自家 whisper 那一路多了逐塊清稿
（EP695 是 3 塊，4 次呼叫合計 3.48 USD，其中清稿佔大部分）。

**沒有量到的兩集**：EP690 與 EP694 的第一趟在閘門臭蟲上紅掉，第二趟用 `--reuse-raw`
免費補完，帳被覆寫成 0（那個覆寫本身現在補好了 —— 沒有付費呼叫的那一趟會保留舊帳）。
兩集的實際花費就用同模式的中位數當代表：EP690 ≈ 0.82 USD、EP694 ≈ 3.48 USD。

**一整批 12 集今晚實際花掉約 15 USD**（10 集量到 11.01 ＋ 兩集代表值 4.30）。

## 五、欄位與節目登記表

節目登記在 `scripts/episode_ingest/sources.mjs` 的 `SHOWS`，**站上的順序就是那個陣列的順序**。
每一集固定帶這幾個欄位（`lib/content.ts` 的 `Episode`／`IndexEntry`，站端與 JSON 同名）：

| 欄位 | 是什麼 | 來源 |
|---|---|---|
| `show` ／ `show_name` | 節目 id 與名稱 | `SHOWS` |
| `host` | 原作者 | RSS `<dc:creator>`，沒有才用 `SHOWS[].host` |
| `source_url` ／ `source_is_episode` | 那一集在節目端的原始連結 | RSS `<link>`，沒有才退到節目頁（那時 `source_is_episode=false`） |
| `show_site` | 節目頁 | `SHOWS[].site` |
| `published_at` ／ `published_at_rss` | 日期（排序用）／ RSS `pubDate` 逐字 | feed |
| `audio_url` | 音檔 | feed |
| `transcript_display` ／ `transcript_mode` | `full`｜`excerpt`｜`notes` | `SHOWS[].transcript_display` |
| `evidence` ／ `notes_ratio` | notes 模式的立場證據與筆記佔比 | 摘要 JSON |

`transcript_display` 是**授權欄，不是排版欄**：

- `full` —— 整份逐字稿上站。**股癌永久留在這一格**（2026-09-23 01:59 拍）。
- `excerpt` —— 只放摘要與被標到的那幾段短引用。
- `notes` —— **聽打筆記**：每一段用我們自己的話寫 1–2 句，只有標到立場的地方附一句
  ≤40 字的逐字原話當證據；整集筆記 ≤ 逐字稿的 35%。
  **全文一個字都不進 `content/`、不進 `out/`**，原稿只留在本機快取。
- 沒寫這一欄的節目一律當 `notes`（預設不替別人決定要不要放全文）。

已登記但**今晚沒有抓任何東西**的兩個節目（`ingested: false`，站上看不到）：
游庭皓的財經皓角、M觀點 —— 兩個都是 `notes`，下一批才做。

## 六、站上的限額

- **`/search/` 的索引是整包塞進頁面的**：6 集時 486 KB。到 ~15 集之前要換成 pagefind
  （`RF-1127`）。**`out/search/index.html` 超過 1.5 MB 就停下來，不要再加集數。**
  每次 build 後 `npm run check:render` 會把這個大小印出來。
- OG 圖（`public/og/`）少一張就 `check:render` 紅 —— 404 的 OG 圖只有貼連結的人看得到。
