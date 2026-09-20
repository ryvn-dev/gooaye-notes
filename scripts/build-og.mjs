// OG 圖（1200×630 文字圖）。用庫：satori（HTML→SVG，字形轉 path）+ sharp（SVG→PNG）。
// 字型檔留在 ~/.ryvn-finance/fonts/huninn.ttf（4.9 MB，不進 repo）；產出的 PNG 進 repo，
// 所以 CI 只跑 next build 就好。字型不在就跳過，不讓 build 失敗。
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const FONT = process.env.OG_FONT || `${process.env.HOME}/.ryvn-finance/fonts/huninn.ttf`;
const OUT = path.join(ROOT, 'public', 'og');

if (!fs.existsSync(FONT)) {
  console.log(`og: 找不到字型 ${FONT}，跳過`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
const font = fs.readFileSync(FONT);
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', p), 'utf8'));
const plain = (s) => (s ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]/gu, '').trim();

const card = (title, sub, tag) => ({
  type: 'div',
  props: {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      background: '#ffffff', padding: '72px', fontFamily: 'Huninn', color: '#242424',
    },
    children: [
      { type: 'div', props: { style: { fontSize: 28, color: '#9a9a9a', display: 'flex' }, children: tag } },
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', gap: '24px' },
          children: [
            { type: 'div', props: { style: { fontSize: 72, fontWeight: 700, lineHeight: 1.25, display: 'flex' }, children: title } },
            { type: 'div', props: { style: { fontSize: 32, color: '#6b6b6b', lineHeight: 1.5, display: 'flex' }, children: sub } },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: 30, color: '#9a9a9a' },
          children: [
            { type: 'div', props: { style: { width: '10px', height: '10px', borderRadius: '9999px', background: '#C0392B', display: 'flex' }, children: '' } },
            { type: 'div', props: { style: { display: 'flex' }, children: '股癌筆記 · 非官方個人筆記' } },
          ],
        },
      },
    ],
  },
});

const render = async (name, title, sub, tag) => {
  const svg = await satori(card(title, sub, tag), {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Huninn', data: font, weight: 400, style: 'normal' }],
  });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${name}.png`));
};

const idx = readJson('index.json');
const tickers = readJson('tickers.json').tickers;

await render('default', '股癌筆記', '每一集的重點、相關個股與看多看空，附原話與可跳播的段落。', '');
for (const e of idx.episodes) {
  const sub = (e.summary_answer_first ?? '').slice(0, 60);
  await render(`${e.show}-${e.slug}`, plain(e.site_title) || `EP${e.ep_number}`, sub, `${e.show_name} · ${e.published_at}`);
}
for (const t of tickers) {
  const code = t.ticker.replace('TW:', '');
  await render(
    `ticker-${t.ticker.replace(/[.:]/g, '-')}`,
    `${t.display_name} ${code}`,
    `節目中出現 ${t.episode_count} 集，最近一次 ${t.last_seen}。每一次提到都標在價量圖上。`,
    '個股',
  );
}
console.log(`og: ${1 + idx.episodes.length + tickers.length} 張`);
