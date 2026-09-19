import csv
import json
import re

# Profiles
PROFILES = [
    {"id": "a0000000-0000-0000-0000-000000000001", "name": "Alex", "email": "alex@wham.app", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Alex&backgroundColor=ffb703"},
    {"id": "a0000000-0000-0000-0000-000000000002", "name": "Dale", "email": "dale@wham.app", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Dale&backgroundColor=fb8500"},
    {"id": "a0000000-0000-0000-0000-000000000003", "name": "Taiye", "email": "taiye@wham.app", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Taiye&backgroundColor=219ebc"},
    {"id": "a0000000-0000-0000-0000-000000000004", "name": "Euan", "email": "euan@wham.app", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Euan&backgroundColor=023047"},
]

CLIMBER_MAP = {
    "Alex": "a0000000-0000-0000-0000-000000000001",
    "Dale": "a0000000-0000-0000-0000-000000000002",
    "Taiye": "a0000000-0000-0000-0000-000000000003",
    "Euan": "a0000000-0000-0000-0000-000000000004",
}

# Gyms
BOND_ID = "b0000000-0000-0000-0000-000000000001"
HUB_ID = "b0000000-0000-0000-0000-000000000002"

AREAS = [
    {"id": "c0000000-0000-0000-0000-000000000001", "gym_id": BOND_ID, "name": "Slab Wall", "sort_order": 1, "raw": "Bond 1: Slab Wall"},
    {"id": "c0000000-0000-0000-0000-000000000002", "gym_id": BOND_ID, "name": "Gecko Prow", "sort_order": 2, "raw": "Bond 2: Gecko Prow"},
    {"id": "c0000000-0000-0000-0000-000000000003", "gym_id": BOND_ID, "name": "Back Corner", "sort_order": 3, "raw": "Bond 3: Back Corner"},
    {"id": "c0000000-0000-0000-0000-000000000004", "gym_id": BOND_ID, "name": "Cave", "sort_order": 4, "raw": "Bond 4: Cave"},
    {"id": "c0000000-0000-0000-0000-000000000005", "gym_id": BOND_ID, "name": "Comp Wall", "sort_order": 5, "raw": "Bond 5: Comp Wall"},
    {"id": "c0000000-0000-0000-0000-000000000006", "gym_id": BOND_ID, "name": "Top-Out", "sort_order": 6, "raw": "Bond 6: Top-Out"},
    {"id": "c0000000-0000-0000-0000-000000000007", "gym_id": HUB_ID, "name": "Slab Wall", "sort_order": 1, "raw": "Hub: Slab Wall"},
    {"id": "c0000000-0000-0000-0000-000000000008", "gym_id": HUB_ID, "name": "Legacy Wall", "sort_order": 2, "raw": "Hub: Legacy Wall"},
    {"id": "c0000000-0000-0000-0000-000000000009", "gym_id": HUB_ID, "name": "Classic Comp Wall", "sort_order": 3, "raw": "Hub: Classic Comp Wall"},
    {"id": "c0000000-0000-0000-0000-000000000010", "gym_id": HUB_ID, "name": "Right-Hand Wall", "sort_order": 4, "raw": "Hub: Right-Hand Wall"},
    {"id": "c0000000-0000-0000-0000-000000000011", "gym_id": HUB_ID, "name": "Island", "sort_order": 5, "raw": "Hub: Island"},
    {"id": "c0000000-0000-0000-0000-000000000012", "gym_id": HUB_ID, "name": "New Comp Wall", "sort_order": 6, "raw": "Hub: New Comp Wall"}
]

RAW_AREA_MAP = {a["raw"]: a["id"] for a in AREAS}

def parse_attempt(code):
    if not code:
        return None
    code = code.strip().upper()
    if not code:
        return None
    if code == "F":
        return {"status": "flashed", "attempt_count": 1}
    m_s = re.match(r"^S(\d+)(\+)?$", code)
    if m_s:
        return {"status": "sent", "attempt_count": int(m_s.group(1))}
    m_p = re.match(r"^P(\d+)(\+)?$", code)
    if m_p:
        return {"status": "attempted", "attempt_count": int(m_p.group(1))}
    return None

def main():
    boulders = []
    attempts = []
    
    area_order_counter = {}

    with open('initial_seed.csv', mode='r', encoding='utf-8') as f:
        sample = f.read(2048)
        f.seek(0)
        delimiter = '\t' if '\t' in sample else ','
        reader = csv.DictReader(f, delimiter=delimiter)
        row_idx = 1
        for row in reader:
            raw_area = row['Area'].strip()
            area_id = RAW_AREA_MAP.get(raw_area)
            if not area_id:
                raise ValueError(f"Unknown area: {raw_area}")

            order = area_order_counter.get(area_id, 0) + 1
            area_order_counter[area_id] = order

            colour = row['Route Colour'].strip()
            grade = row['Grade'].strip()
            
            # Normalize date DD/MM/YYYY -> YYYY-MM-DD
            raw_date = row.get('Date Added', '').strip()
            if '/' in raw_date:
                parts = raw_date.split('/')
                if len(parts) == 3:
                    date_added = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                else:
                    date_added = "2026-09-10"
            else:
                date_added = "2026-09-10"

            is_archived = row['Removed'].strip().upper() == 'TRUE'

            boulder_id = f"d0000000-0000-0000-0000-{row_idx:012d}"
            row_idx += 1

            boulder = {
                "id": boulder_id,
                "gym_id": BOND_ID,
                "area_id": area_id,
                "hold_colour": colour,
                "grade": grade,
                "position_order": float(order),
                "notes": None,
                "image_url": None,
                "date_added": date_added,
                "is_archived": is_archived,
                "created_by": PROFILES[0]["id"]
            }
            boulders.append(boulder)

            # Parse attempts for 4 climbers
            for climber_name in ["Alex", "Dale", "Taiye", "Euan"]:
                code = row.get(climber_name, "")
                parsed = parse_attempt(code)
                if parsed:
                    attempts.append({
                        "id": f"att-{len(attempts)+1}",
                        "boulder_id": boulder_id,
                        "user_id": CLIMBER_MAP[climber_name],
                        "status": parsed["status"],
                        "attempt_count": parsed["attempt_count"],
                        "logged_at": f"{date_added}T19:00:00Z"
                    })

    print(f"Total Boulders parsed: {len(boulders)} (Archived: {sum(1 for b in boulders if b['is_archived'])})")
    print(f"Total Attempts parsed: {len(attempts)}")

    # 1. Generate src/lib/mockData.ts
    with open('src/lib/mockData.ts', 'w', encoding='utf-8') as f:
        f.write("import { Boulder, Attempt, Comment, Profile, Gym, GymArea } from '../types';\n\n")
        f.write(f"export const INITIAL_PROFILES: Profile[] = {json.dumps([{'id': p['id'], 'display_name': p['name'], 'avatar_url': p['avatar']} for p in PROFILES], indent=2)};\n\n")
        f.write(f"export const INITIAL_GYMS: Gym[] = [\n  {{ id: '{BOND_ID}', name: 'Bond' }},\n  {{ id: '{HUB_ID}', name: 'Hub' }}\n];\n\n")
        f.write(f"export const INITIAL_AREAS: GymArea[] = {json.dumps([{'id': a['id'], 'gym_id': a['gym_id'], 'name': a['name'], 'sort_order': a['sort_order']} for a in AREAS], indent=2)};\n\n")
        f.write(f"export const INITIAL_BOULDERS: Boulder[] = {json.dumps(boulders, indent=2)};\n\n")
        f.write(f"export const INITIAL_ATTEMPTS: Attempt[] = {json.dumps(attempts, indent=2)};\n\n")
        f.write("export const INITIAL_COMMENTS: Comment[] = [];\n\n")

    # 2. Generate seed.sql
    with open('seed.sql', 'w', encoding='utf-8') as f:
        f.write("""-- =========================================================
-- WHAM! - Initial Seed Data for Private Group Bouldering Tracker
-- Climbers: Alex, Dale, Taiye, Euan
-- Gyms: Bond, Hub
-- Source: Google Sheet Historical Data (134 climbs)
-- =========================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES
        ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex@wham.app', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Alex"}', now(), now()),
        ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dale@wham.app', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Dale"}', now(), now()),
        ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'taiye@wham.app', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Taiye"}', now(), now()),
        ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'euan@wham.app', '', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Euan"}', now(), now())
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

INSERT INTO public.profiles (id, display_name, avatar_url)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Alex', 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex&backgroundColor=ffb703'),
    ('a0000000-0000-0000-0000-000000000002', 'Dale', 'https://api.dicebear.com/7.x/bottts/svg?seed=Dale&backgroundColor=fb8500'),
    ('a0000000-0000-0000-0000-000000000003', 'Taiye', 'https://api.dicebear.com/7.x/bottts/svg?seed=Taiye&backgroundColor=219ebc'),
    ('a0000000-0000-0000-0000-000000000004', 'Euan', 'https://api.dicebear.com/7.x/bottts/svg?seed=Euan&backgroundColor=023047')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO public.gyms (id, name)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Bond'),
    ('b0000000-0000-0000-0000-000000000002', 'Hub')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n\n""")

        f.write("INSERT INTO public.gym_areas (id, gym_id, name, sort_order)\nVALUES\n")
        area_values = [
            f"    ('{a['id']}', '{a['gym_id']}', '{a['name']}', {a['sort_order']})"
            for a in AREAS
        ]
        f.write(",\n".join(area_values))
        f.write("""\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;\n\n-- Insert Boulders\nINSERT INTO public.boulders (id, gym_id, area_id, hold_colour, grade, position_order, notes, is_archived, date_added, created_by)\nVALUES\n""")
        boulder_values = []
        for b in boulders:
            notes_str = f"'{b['notes']}'" if b['notes'] else "NULL"
            is_arch = "true" if b['is_archived'] else "false"
            boulder_values.append(f"('{b['id']}', '{b['gym_id']}', '{b['area_id']}', '{b['hold_colour']}', '{b['grade']}', {b['position_order']}, {notes_str}, {is_arch}, '{b['date_added']}', '{b['created_by']}')")
        
        f.write(",\n".join(boulder_values))
        f.write("""\nON CONFLICT (id) DO UPDATE SET
    hold_colour = EXCLUDED.hold_colour,
    grade = EXCLUDED.grade,
    position_order = EXCLUDED.position_order,
    is_archived = EXCLUDED.is_archived;\n\n""")

        # Attempts
        f.write("-- Insert Attempts\nINSERT INTO public.attempts (boulder_id, user_id, status, attempt_count, logged_at)\nVALUES\n")
        att_values = []
        for a in attempts:
            att_values.append(f"('{a['boulder_id']}', '{a['user_id']}', '{a['status']}', {a['attempt_count']}, '{a['logged_at']}')")
        f.write(",\n".join(att_values))
        f.write("""\nON CONFLICT (boulder_id, user_id) DO UPDATE SET
    status = EXCLUDED.status,
    attempt_count = EXCLUDED.attempt_count,
    logged_at = EXCLUDED.logged_at;\n\n""")

        # Remove any old placeholder comments
        f.write("""-- Clean up any placeholder comments
DELETE FROM public.comments
WHERE id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003'
);\n""")

    print("Successfully generated seed.sql and src/lib/mockData.ts with the complete Google Sheet dataset!")

if __name__ == '__main__':
    main()
