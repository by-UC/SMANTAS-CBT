// parser.worker.js
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function(e) {
  let { arrayBuffer, fileName } = e.data;
  
  try {
    let decoder = new TextDecoder("utf-8");
    let text = "";
    try { text = decoder.decode(arrayBuffer); } catch(err){}

    let lowerName = (fileName || "").toLowerCase();
    let isHtmlDoc = lowerName.endsWith('.doc') || lowerName.endsWith('.htm') || lowerName.endsWith('.html') || text.includes('<table') || text.includes('<html');

    let rows = [];

    if (isHtmlDoc && (text.includes('<table') || text.includes('<TABLE'))) {
      let parser = new DOMParser();
      let doc = parser.parseFromString(text, 'text/html');
      let tables = doc.querySelectorAll('table');
      
      tables.forEach(table => {
        let trs = table.querySelectorAll('tr');
        trs.forEach(tr => {
          let rowCols = [];
          let tds = tr.querySelectorAll('td, th');
          tds.forEach(td => {
            let clone = td.cloneNode(true);
            clone.querySelectorAll('img').forEach(img => {
              let src = img.getAttribute('src');
              if (src) {
                let txtNode = doc.createTextNode(` [img]${src.trim()}[/img] `);
                img.parentNode.replaceChild(txtNode, img);
              }
            });
            let cellText = (clone.textContent || "").trim().replace(/\s+/g, ' ');
            rowCols.push(cellText);
          });
          if (rowCols.some(c => c !== '')) rows.push(rowCols);
        });
      });
    } else {
      let workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array', dense: true});
      let firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, raw: false});
    }

    self.postMessage({ success: true, rows: rows });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
