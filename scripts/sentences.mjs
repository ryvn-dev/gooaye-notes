// 段落 → 句子。**站上每一個螢光標記的座標都是 `<段序>:<句序>`**，所以這個切法
// 一旦兩邊不一致，標記就會指到別的句子去 —— 以前它只住在 build-content.mjs 裡，
// 摘要腳本要算「引用句是第幾句」也得用同一套（flip_gate 看的就是那個 index）。
//
// 規則三條：句末標點斷句、以轉折詞收尾的句子跟下一句黏回去（「但是」單獨成句沒有意義）、
// 太長的句子再按逗號切（超過 200 字的螢光句在畫面上等於整段被塗黃）。
const SENT_END = /(?<=[。！？!?])/;
const TURN_END = /(但是|可是|不過|然而|而且|所以|然後|因為)[，。！？,.!?]*$/;
const MAX_SENT = 200;
const AIM_SENT = 120;

const splitByComma = (t) => {
  const out = [];
  let rest = t;
  while (rest.length > MAX_SENT) {
    const window = rest.slice(0, MAX_SENT);
    let cut = -1;
    for (const mark of ['，', '；', '、', ',']) cut = Math.max(cut, window.lastIndexOf(mark));
    const at = cut >= AIM_SENT ? cut + 1 : MAX_SENT;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) out.push(rest);
  return out;
};

export const splitSentences = (t) => {
  const raw = t.split(SENT_END).map((x) => x.trim()).filter(Boolean);
  const joined = [];
  for (const piece of raw) {
    if (joined.length && TURN_END.test(joined[joined.length - 1])) joined[joined.length - 1] += piece;
    else joined.push(piece);
  }
  return joined.flatMap(splitByComma).map((x) => x.trim()).filter(Boolean);
};
