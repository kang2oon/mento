import sys

content = open("src/db/sheets.ts").read()

start_marker = "return obj.table.rows.map((r: any) => r.c.map((cell: any) => {"
end_marker = "        }));"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx) + len(end_marker)
    
    new_replace = """return obj.table.rows.map((r: any) => {
          const cols = [];
          for (let i = 0; i < 15; i++) {
             const cell = r.c && r.c[i];
             if (!cell) {
               cols.push('');
               continue;
             }
             let val = cell.f ? String(cell.f) : (cell.v === null || cell.v === undefined ? '' : String(cell.v));
             
             if (val.startsWith('Date(') && val.endsWith(')')) {
               const parts = val.substring(5, val.length - 1).split(',').map(Number);
               if (parts.length >= 3) {
                 const [y, m, d, h, mn, s] = parts;
                 if (i === 11) { // sessionNum
                    val = `${Number(m)+1}-${d}`;
                 } else if (y === 1899 && m === 11 && d === 30) {
                    const hh = h !== undefined ? String(h).padStart(2, '0') : '00';
                    const mm = mn !== undefined ? String(mn).padStart(2, '0') : '00';
                    val = `${hh}:${mm}`;
                 } else {
                    const yy = y;
                    const mm = String(Number(m) + 1).padStart(2, '0');
                    const dd = String(d).padStart(2, '0');
                    val = `${yy}-${mm}-${dd}`;
                 }
               }
             }
             cols.push(val);
          }
          return cols;
        });"""
        
    content = content[:start_idx] + new_replace + content[end_idx:]
    open("src/db/sheets.ts", "w").write(content)
    print("Replaced!")
else:
    print("Markers not found.")
