#!/usr/bin/env python3
"""Template scanner (T1): renders every approved template PDF in docs/templates
to PNG (for visual layout review) and dumps positioned text blocks to JSON so
the docgen renderer can be made layout-faithful. Build-time tool only — never
runs in production.

Usage: python scripts/scan-templates.py [outdir]
"""
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
TPL = ROOT / "docs" / "templates"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "templates" / "_scan"
OUT.mkdir(parents=True, exist_ok=True)

index = []
for pdf in sorted(TPL.rglob("*.pdf")):
    rel = pdf.relative_to(TPL)
    name = str(rel).replace("\\", "/").replace("/", "__").removesuffix(".pdf")
    doc = fitz.open(pdf)
    page = doc[0]
    w, h = page.rect.width, page.rect.height

    # 1. PNG render at 2x for visual review
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    png = OUT / f"{name}.png"
    pix.save(png)

    # 2. Positioned text spans (x0,y0,x1,y1, size, font, text)
    spans = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for s in line["spans"]:
                t = s["text"].strip()
                if not t:
                    continue
                spans.append({
                    "bbox": [round(v, 1) for v in s["bbox"]],
                    "size": round(s["size"], 1),
                    "font": s["font"],
                    "bold": "Bold" in s["font"] or "bold" in s["font"],
                    "text": t,
                })
    # 3. Drawn lines/rects (table grid hints)
    rects = []
    for d in page.get_drawings():
        r = d["rect"]
        rects.append([round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1)])

    (OUT / f"{name}.json").write_text(json.dumps({
        "file": str(rel), "page_w": round(w, 1), "page_h": round(h, 1),
        "spans": spans, "rects": rects[:400],
    }, indent=1), encoding="utf-8")
    index.append({"name": name, "file": str(rel), "pages": doc.page_count, "size": [round(w), round(h)]})
    doc.close()

(OUT / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")
print(f"scanned {len(index)} templates -> {OUT}")
for i in index:
    print(f"  {i['name']}  pages={i['pages']} size={i['size']}")
