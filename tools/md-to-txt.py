# -*- coding: utf-8 -*-
"""Markdown → простой текст: открывается всегда, в Блокноте."""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def convert(src, dst):
    md = io.open(src, encoding="utf-8").read()
    out = []
    in_code = False
    for ln in md.split("\n"):
        if ln.strip().startswith("```"):
            in_code = not in_code
            if in_code:
                out.append("")
            out.append("")
            continue
        if in_code:
            out.append("    " + ln)
            continue
        s = ln.rstrip()
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if re.fullmatch(r"[-: ]+", "".join(cells)):
                continue
            out.append("  " + " | ".join(cells))
            continue
        m = re.match(r"^(#{1,3})\s+(.+)$", s)
        if m:
            lvl = len(m.group(1))
            t = m.group(2)
            out.append("")
            out.append(t.upper() if lvl == 1 else t)
            out.append(("=" if lvl == 1 else "-") * min(len(t), 60))
            continue
        if re.fullmatch(r"-{3,}", s.strip()):
            out.append("")
            out.append("-" * 60)
            continue
        s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
        s = re.sub(r"`([^`]+)`", r"\1", s)
        out.append(s)
    txt = "\n".join(out)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    io.open(dst, "w", encoding="utf-8-sig", newline="\r\n").write(txt)
    print("  %s · %.1f КБ" % (os.path.basename(dst), os.path.getsize(dst) / 1024))


if len(sys.argv) > 2:
    convert(sys.argv[1], sys.argv[2])
    raise SystemExit
convert(os.path.join(ROOT, "marketing", "social-media-kit.md"),
        os.path.join(ROOT, "marketing", "GOOD-Growth-social-kit-RU.txt"))
convert(os.path.join(ROOT, "marketing", "social-media-kit.en.md"),
        os.path.join(ROOT, "marketing", "GOOD-Growth-social-kit-EN.txt"))
