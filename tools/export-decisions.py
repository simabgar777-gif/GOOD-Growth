# -*- coding: utf-8 -*-
"""Собирает decisions.json из DECISIONS.md — только ID, заголовок и тезисы.
Полный текст остаётся в репозитории: двойник читает ID, а не копию канона."""
import io, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "DECISIONS.md")
OUT = os.path.join(ROOT, "decisions.json")

text = io.open(SRC, encoding="utf-8").read()

# Решения: "###/## Решение DD.MM · заголовок"
decisions = []
pattern = re.compile(r"^#{2,3}\s+Решение\s+(\d{2}\.\d{2})\s*·\s*(.+)$", re.M)
matches = list(pattern.finditer(text))
for i, m in enumerate(matches):
    body_start = m.end()
    body_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    body = text[body_start:body_end]
    # обрезаем по следующему заголовку ## (не решение)
    cut = re.search(r"^#{1,2}\s+(?!#)(?!Решение)", body, re.M)
    if cut:
        body = body[:cut.start()]
    lines = [ln.strip(" -•\t") for ln in body.split("\n") if ln.strip()]
    bullets = [ln for ln in lines if ln.startswith(("—", "-", "•", "·")) or ln[:1].isdigit()]
    thesis = []
    for ln in lines[:6]:
        clean = ln.lstrip("-—•· ").strip()
        if 8 <= len(clean) <= 220:
            thesis.append(clean)
    decisions.append({
        "id": "D-" + m.group(1).replace(".", ""),
        "date": m.group(1),
        "title": m.group(2).strip(),
        "thesis": thesis[:3],
        "source": "DECISIONS.md",
    })

# Незыблемое
immutable = []
m_imm = re.search(r"^##\s+Незыблемое.*$", text, re.M)
if m_imm:
    tail = text[m_imm.end():]
    cut = re.search(r"^##\s+", tail, re.M)
    block = tail[:cut.start()] if cut else tail
    for ln in block.split("\n"):
        clean = ln.strip(" -—•·\t")
        if len(clean) >= 10:
            immutable.append(clean[:220])

data = {
    "generated_from": "ship/good-growth/DECISIONS.md",
    "note": "Только ID и тезисы. Полный текст — в DECISIONS.md, копировать нельзя.",
    "count": len(decisions),
    "immutable": immutable[:10],
    "decisions": decisions,
}
io.open(OUT, "w", encoding="utf-8", newline="\n").write(json.dumps(data, ensure_ascii=False, indent=1))
print("  decisions.json: решений %d · незыблемых пунктов %d" % (len(decisions), len(immutable)))
for d0 in decisions:
    print("   ", d0["id"], "·", d0["title"][:60])
