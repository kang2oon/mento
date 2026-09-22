import sys

content = open("src/db/sheets.ts").read()

to_replace = """        return obj.table.rows.map((r: any) => r.c.map((cell: any) => cell ? (cell.f ? String(cell.f) : (cell.v === null || cell.v === undefined ? '' : String(cell.v))) : ''));"""
new_replace = """        return obj.table.rows.map((r: any) => r.c.map((cell: any) => {
          if (!cell) return '';
          let val = cell.f ? String(cell.f) : (cell.v === null || cell.v === undefined ? '' : String(cell.v));
          // Parse Google Sheets Date(y,m,d,h,m,s) format if it leaks through
          if (val.startsWith('Date(') && val.endsWith(')')) {
            const parts = val.substring(5, val.length - 1).split(',').map(Number);
            if (parts.length >= 3) {
              const [y, m, d, h, mn, s] = parts;
              if (y === 1899 && m === 11 && d === 30) {
                // It's a time value
                const hh = h !== undefined ? String(h).padStart(2, '0') : '00';
                const mm = mn !== undefined ? String(mn).padStart(2, '0') : '00';
                val = `${hh}:${mm}`;
              } else {
                // It's a date value
                const yy = y;
                const mm = String(m + 1).padStart(2, '0'); // Month is 0-indexed
                const dd = String(d).padStart(2, '0');
                val = `${yy}-${mm}-${dd}`;
              }
            }
          }
          return val;
        }));"""

content = content.replace(to_replace, new_replace)

open("src/db/sheets.ts", "w").write(content)

