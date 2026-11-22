# -*- coding: utf-8 -*-
"""Превращает social-media-kit.md в читаемый HTML-документ для печати и превью."""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "marketing", "social-media-kit.md")
OUT = os.path.join(ROOT, "marketing", "social-media-kit.html")

md = io.open(SRC, encoding="utf-8").read()
lines = md.split("\n")
out = []
i = 0
in_code = False
in_list = False


def inline(t):
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"(https?://[^\s<)]+)", r'<a href="\1">\1</a>', t)
    return t


def close_list():
    global in_list
    if in_list:
        out.append("</ul>")
        in_list = False


while i < len(lines):
    ln = lines[i]
    if ln.strip().startswith("```"):
        if in_code:
            out.append("</pre>")
            in_code = False
        else:
            close_list()
            out.append('<pre>')
            in_code = True
        i += 1
        continue
    if in_code:
        out.append(ln.replace("&", "&amp;").replace("<", "&lt;"))
        i += 1
        continue

    s = ln.rstrip()
    if not s.strip():
        close_list()
        i += 1
        continue

    if s.startswith("|"):
        close_list()
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            if not re.fullmatch(r"[-: ]+", "".join(cells)):
                rows.append(cells)
            i += 1
        if rows:
            out.append("<table>")
            for r_i, row in enumerate(rows):
                tag = "th" if r_i == 0 else "td"
                out.append("<tr>" + "".join("<%s>%s</%s>" % (tag, inline(c), tag) for c in row) + "</tr>")
            out.append("</table>")
        continue

    m = re.match(r"^(#{1,3})\s+(.+)$", s)
    if m:
        close_list()
        lvl = len(m.group(1))
        out.append("<h%d>%s</h%d>" % (lvl, inline(m.group(2)), lvl))
        i += 1
        continue

    if re.fullmatch(r"-{3,}", s.strip()):
        close_list()
        out.append('<hr class="rule">')
        i += 1
        continue

    if s.startswith(">"):
        close_list()
        out.append("<blockquote>%s</blockquote>" % inline(s.lstrip("> ").strip()))
        i += 1
        continue

    if s.startswith("·") or s.startswith("- "):
        if not in_list:
            out.append("<ul>")
            in_list = True
        out.append("<li>%s</li>" % inline(s.lstrip("·- ").strip()))
        i += 1
        continue

    close_list()
    out.append("<p>%s</p>" % inline(s))
    i += 1

if in_code:
    out.append("</pre>")
close_list()

body = "\n".join(out)
HTML = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>GOOD Growth — пакет для соцсетей</title>
<style>
  :root{--ink:#1C1A17;--mut:#6B655C;--copper:#B8762A;--line:#E3DCD0;--paper:#FBF9F5}
  *{box-sizing:border-box}
  body{margin:0;background:#EDE8DF;color:var(--ink);
    font-family:'Golos Text',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.62}
  .sheet{max-width:900px;margin:28px auto 60px;background:var(--paper);border-radius:4px;
    box-shadow:0 20px 50px rgba(28,20,10,.18);overflow:hidden}
  .band{background:#07080A;color:#F4F1EA;padding:34px 56px 30px;display:flex;align-items:center;gap:22px}
  .band img{width:64px;height:64px;border-radius:12px;background:#0C0D10;padding:6px}
  .band .t{font-family:Georgia,serif;font-size:27px;line-height:1.15}
  .band .s{font-family:Consolas,monospace;font-size:11px;letter-spacing:.18em;color:#E8A54F;margin-top:6px}
  main{padding:40px 56px 56px}
  h1{font-family:Georgia,serif;font-weight:600;font-size:30px;margin:0 0 18px;color:#17150F}
  h2{font-family:Georgia,serif;font-weight:600;font-size:21px;margin:34px 0 12px;color:#17150F;
    padding-bottom:8px;border-bottom:1px solid var(--line)}
  h3{font-family:Georgia,serif;font-weight:600;font-size:17px;margin:24px 0 8px;color:#2A2620}
  p{margin:0 0 12px}
  a{color:var(--copper);text-decoration:none;border-bottom:1px solid rgba(184,118,42,.3)}
  code{font-family:Consolas,monospace;font-size:12.5px;background:#F1ECE2;padding:1px 5px;border-radius:4px}
  pre{font-family:Consolas,monospace;font-size:12.5px;line-height:1.6;background:#0F1114;color:#E9E4D9;
    padding:16px 18px;border-radius:10px;overflow:auto;margin:10px 0 16px;white-space:pre-wrap}
  pre code{background:none;padding:0;color:inherit}
  table{border-collapse:collapse;width:100%;margin:12px 0 18px;font-size:13.5px}
  th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
  th{background:#F3EEE3;font-weight:600;font-size:12.5px;letter-spacing:.02em;color:#3A342B}
  tr:nth-child(even) td{background:#FCFAF6}
  ul{margin:8px 0 16px;padding-left:20px}
  li{margin:3px 0}
  blockquote{margin:14px 0;padding:12px 16px;background:#F4EFE4;border-left:3px solid var(--copper);
    color:#4A443B;font-size:14px}
  hr.rule{border:0;border-top:1px solid var(--line);margin:30px 0}
  @media print{body{background:#fff}.sheet{box-shadow:none;margin:0}.band{padding:26px 40px}main{padding:26px 40px}}
</style>
</head>
<body>
<div class="sheet">
  <div class="band">
    <img src="https://growth.go-ood.com/avatar-logo-square.png" alt="">
    <div>
      <div class="t">GOOD Growth</div>
      <div class="s">ПАКЕТ ДЛЯ СОЦСЕТЕЙ · ДЛЯ МАРИАМ</div>
    </div>
  </div>
  <main>
__BODY__
  </main>
</div>
</body>
</html>
"""
io.open(OUT, "w", encoding="utf-8", newline="\n").write(HTML.replace("__BODY__", body))
print("  social-media-kit.html ·", round(os.path.getsize(OUT) / 1024, 1), "КБ")
