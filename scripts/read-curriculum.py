"""Read the supplied PDF without altering it; save reproducible audit evidence."""
from pathlib import Path
import hashlib
import json
import sys
sys.stdout.reconfigure(encoding="utf-8")

workspace = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(workspace / "tmp" / "pdf-deps"))
import pymupdf

source = Path(sys.argv[1])
output = workspace / "audit" / "curriculum-source"
output.mkdir(parents=True, exist_ok=True)
document = pymupdf.open(source)
pages = [page.get_text() for page in document]
matches = [i for i, text in enumerate(pages) if "alternating current" in text.lower()]
manifest = {
    "source": str(source.resolve()),
    "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "page_count": len(document),
    "metadata": document.metadata,
    "matching_pdf_pages": [i + 1 for i in matches],
}
(output / "provenance.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
selected = sorted(set([9, 10] + matches))
for i in selected:
    (output / f"pdf-page-{i+1}.txt").write_text(pages[i], encoding="utf-8")
    document[i].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6)).save(output / f"pdf-page-{i+1}.png")
print(json.dumps(manifest, indent=2))
for i in selected:
    print(f"\n--- PDF PAGE {i+1} ---\n{pages[i]}")
