"""四個機械立場閘門的呼叫端（`RF-1124`）。**規則本身一行都不在這裡。**

規則住在 ryvn-finance 的 `py/ryvn_finance/podcasts/stance_gates.py`
（`quote_gate` ／ `entity_gate` ／ `flip_gate` ／ `one_per_paragraph`）。
這一支只做三件事：把站端算好的「哪一段、哪一句、哪一檔」餵進去、收四個判決、印成 JSON。

**為什麼不在 JS 那邊重寫一份**：那四條是同一套定義（轉折詞第三版、反問句型、
別名表第一欄），兩份實作遲早會分岔，而分岔的那一天沒有人會發現 ——
站上顯示的立場是它們決定的（CLAUDE.md：有庫就用庫，不重複造輪子）。

用法（stdin / stdout 都是 JSON）：

    uv run --project py python scripts/episode_ingest/stance_gates.py < rows.json

進：``{"rows": [{"ticker", "p", "quote", "paragraph_kind", "sentences": [...],
"idx": <quote 是第幾句>, "alias_hits": [...], "score": <float>}]}``

出：``{"verdicts": [{"i", "ticker", "quote_gate", "entity_gate", "flip_gate",
"verdict", "needs_review", "reason"}], "dropped": [<被 one_per_paragraph 丟掉的 i>]}``
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

FIN = Path(os.environ.get("FIN_REPO") or (Path.home() / "code/gh-ryvn-dev/ryvn-finance"))
sys.path.insert(0, str(FIN / "py"))

from ryvn_finance.podcasts.stance_gates import (  # noqa: E402
    entity_gate,
    flip_gate,
    one_per_paragraph,
    quote_gate,
)


def main() -> int:
    payload = json.load(sys.stdin)
    rows = payload.get("rows", [])

    verdicts = []
    for i, r in enumerate(rows):
        q = quote_gate(r.get("quote"))
        e = entity_gate(
            r.get("ticker", ""),
            r.get("paragraph_kind", "p"),
            r.get("alias_hits", []) or [],
        )
        f = flip_gate(r.get("sentences", []) or [], int(r.get("idx", 0) or 0))
        # reject 是紅燈（那一列不准自動上站）；needs_review 是正常結果，走灰點。
        if q.verdict == "reject":
            verdict, reason = "reject", f"quote_gate：{q.reason}"
        elif e.verdict == "reject":
            verdict, reason = "reject", f"entity_gate：{e.reason}"
        elif f.verdict == "needs_review":
            verdict, reason = "needs_review", f"flip_gate：{f.reason}"
        else:
            verdict, reason = "ok", ""
        verdicts.append(
            {
                "i": i,
                "ticker": r.get("ticker"),
                "quote_gate": q.verdict,
                "entity_gate": e.verdict,
                "flip_gate": f.verdict,
                "verdict": verdict,
                "needs_review": verdict == "needs_review",
                "reason": reason,
            }
        )

    # 同段同檔只留分數最高的那一筆。索引用 `_i` 帶進去再帶回來。
    tagged = [dict(r, _i=i) for i, r in enumerate(rows)]
    kept = {m["_i"] for m in one_per_paragraph(tagged)}
    dropped = [i for i in range(len(rows)) if i not in kept]

    json.dump(
        {"verdicts": verdicts, "dropped": dropped}, sys.stdout, ensure_ascii=False
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
