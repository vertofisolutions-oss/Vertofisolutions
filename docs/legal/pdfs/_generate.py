"""
Generate printable PDFs from the markdown legal documents.

  python legal-pdfs/_generate.py

Reads ../legal-docs/*.md and writes matching .pdf files here. Pure-Python
(fpdf2 + markdown), no system dependencies. Output is plain, readable, archival
quality — for fully branded PDFs use pandoc+LaTeX or a designer later.
"""
from __future__ import annotations

import re
from pathlib import Path

import markdown
from fpdf import FPDF

SRC = Path(__file__).resolve().parent.parent / "markdown"
OUT = Path(__file__).resolve().parent

# Map non-latin-1 characters to ASCII so the core font can render them.
REPLACE = {
    "₹": "Rs ", "—": "-", "–": "-", "™": "(TM)", "©": "(c)",
    "✅": "[x]", "⚠": "[!]", "️": "", "•": "- ", "…": "...",
    "“": '"', "”": '"', "‘": "'", "’": "'", "→": "->",
    "×": "x", "≥": ">=", "≤": "<=", " ": " ", "·": "-",
    "✓": "[x]", "❌": "[no]",
}


def sanitize(text: str) -> str:
    for k, v in REPLACE.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "ignore").decode("latin-1")


def strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", "", html)
    return re.sub(r"\n{3,}", "\n\n", text)


def build_pdf(md_text: str, title: str) -> FPDF:
    html = markdown.markdown(sanitize(md_text), extensions=["tables", "fenced_code"])
    pdf = FPDF(format="A4")
    pdf.set_title(title)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)
    pdf.add_page()
    try:
        pdf.write_html(html)
    except Exception:  # fall back to plain text if HTML rendering trips
        pdf.set_font("Helvetica", size=11)
        pdf.multi_cell(0, 6, strip_html(html))
    return pdf


def main() -> None:
    files = sorted(SRC.glob("*.md"))
    for md in files:
        title = md.stem.replace("-", " ").title()
        pdf = build_pdf(md.read_text(encoding="utf-8"), f"Vertofi - {title}")
        out = OUT / f"{md.stem}.pdf"
        pdf.output(str(out))
        print(f"  {out.name}")
    print(f"Generated {len(files)} PDFs in {OUT}")


if __name__ == "__main__":
    main()
