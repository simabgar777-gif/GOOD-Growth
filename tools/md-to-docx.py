# -*- coding: utf-8 -*-
"""Markdown → DOCX: чтобы пакет открывался в Word двойным щелчком."""
import io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Cm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK = RGBColor(0x1C, 0x1A, 0x17)
MUT = RGBColor(0x6B, 0x65, 0x5C)
COPPER = RGBColor(0xB8, 0x76, 0x2A)


def shade(paragraph, hex_fill):
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    pPr.append(shd)


def inline_runs(par, text):
    """**жирный** и `код` внутри строки."""
    for part in re.split(r"(\*\*.+?\*\*|`[^`]+`)", text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            r = par.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("`") and part.endswith("`"):
            r = par.add_run(part[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(9.5)
        else:
            par.add_run(part)


def build(src, dst, title, subtitle):
    md = io.open(src, encoding="utf-8").read()
    lines = md.split("\n")
    doc = Document()

    # поля и базовый шрифт
    for section in doc.sections:
        section.top_margin = Cm(1.8)
        section.bottom_margin = Cm(1.8)
        section.left_margin = Cm(2.0)
        section.right_margin = Cm(2.0)
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)

    # обложка
    p = doc.add_paragraph()
    r = p.add_run("GOOD Growth")
    r.font.size = Pt(24)
    r.font.color.rgb = INK
    r.bold = True
    p2 = doc.add_paragraph()
    r2 = p2.add_run(subtitle)
    r2.font.size = Pt(9)
    r2.font.color.rgb = COPPER
    r2.bold = True
    doc.add_paragraph()

    i = 0
    in_code = False
    buf = []
    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith("```"):
            if in_code:
                cp = doc.add_paragraph()
                shade(cp, "F2EDE3")
                cr = cp.add_run("\n".join(buf))
                cr.font.name = "Consolas"
                cr.font.size = Pt(9)
                buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            buf.append(ln)
            i += 1
            continue

        s = ln.rstrip()
        if not s.strip():
            i += 1
            continue

        if s.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not re.fullmatch(r"[-: ]+", "".join(cells)):
                    rows.append(cells)
                i += 1
            if rows:
                cols = max(len(r) for r in rows)
                table = doc.add_table(rows=0, cols=cols)
                table.style = "Light Grid Accent 1"
                for r_i, row in enumerate(rows):
                    cells = table.add_row().cells
                    for c_i in range(cols):
                        txt = row[c_i] if c_i < len(row) else ""
                        par = cells[c_i].paragraphs[0]
                        inline_runs(par, txt)
                        for run in par.runs:
                            run.font.size = Pt(9)
                            if r_i == 0:
                                run.bold = True
                doc.add_paragraph()
            continue

        m = re.match(r"^(#{1,3})\s+(.+)$", s)
        if m:
            lvl = len(m.group(1))
            if lvl == 1:
                h = doc.add_heading(level=0)
                rr = h.add_run(m.group(2))
                rr.font.size = Pt(17)
                rr.font.color.rgb = INK
            else:
                h = doc.add_heading(level=1 if lvl == 2 else 2)
                rr = h.add_run(m.group(2))
                rr.font.size = Pt(13.5 if lvl == 2 else 11.5)
                rr.font.color.rgb = INK
            i += 1
            continue

        if re.fullmatch(r"-{3,}", s.strip()):
            doc.add_paragraph()
            i += 1
            continue

        if s.startswith(">"):
            q = doc.add_paragraph()
            rr = q.add_run(s.lstrip("> ").strip())
            rr.italic = True
            rr.font.color.rgb = MUT
            shade(q, "F6F1E7")
            i += 1
            continue

        if s.startswith(("·", "- ")):
            b = doc.add_paragraph(style="List Bullet")
            inline_runs(b, s.lstrip("·- ").strip())
            i += 1
            continue

        par = doc.add_paragraph()
        inline_runs(par, s)
        i += 1

    doc.save(dst)
    print("  %s · %.1f КБ" % (os.path.basename(dst), os.path.getsize(dst) / 1024))


build(os.path.join(ROOT, "marketing", "social-media-kit.md"),
      os.path.join(ROOT, "marketing", "GOOD-Growth-social-kit-RU.docx"),
      "GOOD Growth", "ПАКЕТ ДЛЯ СОЦСЕТЕЙ · ДЛЯ МАРИАМ")
build(os.path.join(ROOT, "marketing", "social-media-kit.en.md"),
      os.path.join(ROOT, "marketing", "GOOD-Growth-social-kit-EN.docx"),
      "GOOD Growth", "SOCIAL MEDIA KIT · FOR MARIAM")
