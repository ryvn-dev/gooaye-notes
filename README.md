# 股癌筆記（gooaye-notes）

非官方的第三方整理站：股癌 podcast 每一集提到哪幾檔個股、提到幾次、講在第幾分幾秒。
純靜態（Next.js `output: 'export'`），GitHub Pages 部署，**repo 裡沒有任何 key**。

## 怎麼跑

```bash
npm ci
npm run content   # 由 ryvn-finance 的公開統計檔重建 content/*.json
npm run build     # 產出 out/
NEXT_PUBLIC_BASE_PATH= npm run dev   # 本機開發（不帶子路徑）
```

## 內容契約

- `content/index.json`：集數列表（首頁、搜尋、sitemap 用）
- `content/episodes/EP<nnnn>.json`：一集一檔
- `content/tickers.json`：個股索引與提及時間線

欄位缺值一律 `null`，頁面顯示「待補」——**不填估計值**。
立場（`stances`）、`jev_prob`、`quote`、`px_1d/5d/21d`、`summary`、`key_points`、
`segment_tags` 等待上游 lane 的真資料產出後直接覆蓋。

全文逐字稿**不進這個 repo**（版權邊界）。`transcript_available` 目前一律 `false`。

## 規矩

- 站上不出現買、賣、建議、目標價、進出場價位、勝率、報酬率。
- 每個數字帶樣本數與起算日；樣本不足就寫樣本不足。
- 立場標籤的呈現文字是「模型對這一段話的讀法」。

## POC 範圍

目前 `content/` 只放最新 3 集（`POC_EPISODES=3`，主人 2026-09-21 拍）。
要回補更多集：`POC_EPISODES=52 npm run content`。

## 字體

`public/fonts/huninn-subset.woff2` 是 jf open 粉圓（jf-openhuninn v2.1，SIL OFL 1.1）子集化後的版本：
Big5 常用字 ＋ 目前內容用到的字，5,620 字、1.1 MB。要重新產生：

```bash
python3 -m fontTools.subset jf-openhuninn-2.1.ttf --text-file=chars.txt \
  --flavor=woff2 --layout-features='*' --no-hinting --desubroutinize \
  --output-file=public/fonts/huninn-subset.woff2
```
