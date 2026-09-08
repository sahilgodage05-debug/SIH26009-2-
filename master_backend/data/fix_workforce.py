import csv

file_path = 'moil_all_equipments_master.csv'

def get_exact_number(range_str):
    if not range_str:
        return range_str
    # Remove quotes and commas
    s = range_str.replace('"', '').replace(',', '').strip()
    if '-' in s:
        parts = s.split('-')
        try:
            low = int(parts[0].strip())
            high = int(parts[1].strip())
            return str((low + high) // 2)
        except:
            pass
    return range_str

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == '':
        new_lines.append(line)
        continue
    # Splitting by comma is tricky if there are quotes around the range (e.g. "2,500 - 3,000")
    # Python's csv module is better for reading/writing.
    pass

import tempfile
import os

with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

header = rows[0]
idx = header.index('Workers_Count')

for row in rows[1:]:
    if len(row) > idx:
        row[idx] = get_exact_number(row[idx])

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print("Updated moil_all_equipments_master.csv")
