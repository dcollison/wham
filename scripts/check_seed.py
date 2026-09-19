import csv
import re

with open('initial_seed.csv', 'r', encoding='utf-8') as f:
    sample = f.read(2048)
    f.seek(0)
    delimiter = '\t' if '\t' in sample else ','
    csv_rows = list(csv.DictReader(f, delimiter=delimiter))

with open('seed.sql', 'r', encoding='utf-8') as f:
    sql_text = f.read()

# Extract boulders from seed.sql
# Format: ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Purple', 'V2', 1.0, NULL, false, '2026-09-10', 'a0000000-0000-0000-0000-000000000001')
boulder_matches = re.findall(
    r"\('(d[0-9a-f\-]+)',\s*'(b[0-9a-f\-]+)',\s*'(c[0-9a-f\-]+)',\s*'([^']+)',\s*'([^']+)',\s*([0-9\.]+),\s*([^,]+),\s*(true|false),\s*'([^']+)',\s*'([^']+)'\)",
    sql_text
)

print(f"Parsed {len(boulder_matches)} boulders from seed.sql")

area_map = {
    'c0000000-0000-0000-0000-000000000001': 'Bond 1: Slab Wall',
    'c0000000-0000-0000-0000-000000000002': 'Bond 2: Gecko Prow',
    'c0000000-0000-0000-0000-000000000003': 'Bond 3: Back Corner',
    'c0000000-0000-0000-0000-000000000004': 'Bond 4: Cave',
    'c0000000-0000-0000-0000-000000000005': 'Bond 5: Comp Wall',
    'c0000000-0000-0000-0000-000000000006': 'Bond 6: Top-Out',
}

def parse_date(d_str):
    parts = d_str.strip().split('/')
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return d_str

# Compare first 134 boulders
mismatches = []
for idx, csv_row in enumerate(csv_rows):
    if idx >= len(boulder_matches):
        mismatches.append(f"Row {idx+1} missing in SQL")
        continue
    b = boulder_matches[idx]
    b_id, b_gym, b_area, b_color, b_grade, b_pos, b_notes, b_archived, b_date, b_user = b
    
    expected_area = csv_row['Area'].strip()
    actual_area = area_map.get(b_area, b_area)
    
    expected_color = csv_row['Route Colour'].strip()
    actual_color = b_color
    
    expected_grade = csv_row['Grade'].strip()
    actual_grade = b_grade
    
    expected_date = parse_date(csv_row['Date Added'])
    actual_date = b_date
    
    expected_archived = csv_row['Removed'].strip().lower() == 'true'
    actual_archived = b_archived.lower() == 'true'
    
    diffs = []
    if actual_area != expected_area:
        diffs.append(f"area: {actual_area} vs {expected_area}")
    if actual_color != expected_color:
        diffs.append(f"color: {actual_color} vs {expected_color}")
    if actual_grade != expected_grade:
        diffs.append(f"grade: {actual_grade} vs {expected_grade}")
    if actual_date != expected_date:
        diffs.append(f"date: {actual_date} vs {expected_date}")
    if actual_archived != expected_archived:
        diffs.append(f"archived: {actual_archived} vs {expected_archived}")
    
    if diffs:
        mismatches.append(f"Row {idx+1}: {', '.join(diffs)}")

print(f"Boulder comparison mismatches: {len(mismatches)}")
for m in mismatches[:10]:
    print("  ", m)

# Check attempts
attempt_matches = re.findall(
    r"\('(d[0-9a-f\-]+)',\s*'(a[0-9a-f\-]+)',\s*'([^']+)',\s*([0-9]+),\s*'([^']+)'\)",
    sql_text
)
print(f"Parsed {len(attempt_matches)} attempts from seed.sql")

user_map = {
    'Alex': 'a0000000-0000-0000-0000-000000000001',
    'Dale': 'a0000000-0000-0000-0000-000000000002',
    'Taiye': 'a0000000-0000-0000-0000-000000000003',
    'Euan': 'a0000000-0000-0000-0000-000000000004'
}

def parse_code(code):
    c = code.strip()
    if not c:
        return None
    if c == 'F':
        return ('flashed', 1)
    if c.startswith('S'):
        tries = int(c[1:].replace('+', ''))
        return ('sent', tries)
    if c.startswith('P'):
        tries = int(c[1:].replace('+', ''))
        return ('attempted', tries)
    raise ValueError(f"Unknown code: {code}")

expected_attempts = {}
for idx, csv_row in enumerate(csv_rows):
    b_id = f"d0000000-0000-0000-0000-{idx+1:012d}"
    for climber in ['Alex', 'Dale', 'Taiye', 'Euan']:
        parsed = parse_code(csv_row[climber])
        if parsed:
            u_id = user_map[climber]
            expected_attempts[(b_id, u_id)] = parsed

actual_attempts = {}
for a in attempt_matches:
    b_id, u_id, status, count, logged_at = a
    actual_attempts[(b_id, u_id)] = (status, int(count))

print(f"Expected attempts from CSV: {len(expected_attempts)}")
print(f"Actual attempts in seed.sql: {len(actual_attempts)}")

attempt_mismatches = []
for k, exp in expected_attempts.items():
    if k not in actual_attempts:
        attempt_mismatches.append(f"Missing {k}: expected {exp}")
    elif actual_attempts[k] != exp:
        attempt_mismatches.append(f"Mismatch {k}: actual {actual_attempts[k]} vs expected {exp}")

for k in actual_attempts:
    if k not in expected_attempts:
        attempt_mismatches.append(f"Extra in SQL {k}: actual {actual_attempts[k]}")

print(f"Attempt comparison mismatches: {len(attempt_mismatches)}")
for m in attempt_mismatches[:10]:
    print("  ", m)
