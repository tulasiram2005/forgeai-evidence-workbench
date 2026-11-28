"""Extract bounded document text for the optional structured intake path."""
import json
import re
import sys
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

path = Path(sys.argv[1])
if path.suffix.lower() == '.pdf':
    from pypdf import PdfReader
    reader = PdfReader(path)
    if len(reader.pages) > 250:
        sys.exit('PDF exceeds 250 pages.')
    pages = [(p.extract_text(extraction_mode='layout') or '').strip().splitlines() for p in reader.pages]
    if any(not any(s.strip() for s in lines) for lines in pages):
        sys.exit('PDF contains a page without extractable text. Supply OCR text or a transcript.')
    edges = Counter(s.strip() for lines in pages for s in set(lines[:1] + lines[-1:]))
    cleaned = []
    for lines in pages:
        rows = [s.strip() for i,s in enumerate(lines) if not (
            i in (0,len(lines)-1) and (re.fullmatch(r'Page\s+\d+(\s+of\s+\d+)?',s.strip(),re.I)
            or (len(lines)>2 and edges[s.strip()] >= max(2,len(pages)*0.75))))]
        cleaned.append('\n'.join(rows))
    print(json.dumps({'text':'\n'.join(cleaned),'pages':cleaned}))
else:
    tag = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    with ZipFile(path) as archive:
        info = archive.getinfo('word/document.xml')
        if info.file_size > 2000000:
            sys.exit('DOCX document XML exceeds 2 MB.')
        data = archive.read(info)
    if b'<!DOCTYPE' in data.upper():
        sys.exit('Unsupported DOCX document type declaration.')
    root = ET.fromstring(data)
    lines = [''.join(t.text or '' for t in p.iter(tag+'t')) for p in root.iter(tag+'p')]
    print(json.dumps({'text':'\n'.join(lines)}))
