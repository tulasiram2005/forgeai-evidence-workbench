"""Create three distinct, synthetic intake folders for a clean checkout rehearsal."""
import csv, sys
from pathlib import Path
from zipfile import ZipFile
from xml.sax.saxutils import escape
from reportlab.pdfgen.canvas import Canvas
root=Path(sys.argv[1])
for name,topic,person,number in [('bookbinding','Press release','bindery lead',14),('bellringing','Tower access','tower captain',17),('printmaking','Screen pickup','studio host',23)]:
    folder=root/name
    docs=folder/'docs'
    docs.mkdir(parents=True)
    (folder/'brief.txt').write_text('Explain '+name+' procedures and look up inventory records.')
    pdf=Canvas(str(docs/'schedule.pdf'),invariant=True)
    pdf.drawString(40,760,f'{topic}: Allow {number} minutes.')
    pdf.save()
    (docs/'location.md').write_text(f'# Dispatch\n{name.title()} pickup: Use the east counter.')
    with (docs/'inventory.csv').open('w') as f:
        csv.writer(f).writerows([['code','item','qty'],['R12',name+' kit',number]])
    with ZipFile(docs/'approval.docx','w') as f:
        f.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        f.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        f.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+escape('Approval owner: '+person+'.')+'</w:t></w:r></w:p></w:body></w:document>')
