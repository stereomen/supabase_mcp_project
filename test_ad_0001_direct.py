#!/usr/bin/env python3
"""
Direct test of AD_0001 station ID mapping and marine observations
"""

SUPABASE_URL = "https://iwpgvdtfpwazzfeniusk.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA3MTM5NCwiZXhwIjoyMDY2NjQ3Mzk0fQ.DNYEYOBWemhE5sg5eZYd3PrRAq_W04nCBmuJdGSjIIc"

import urllib.request
import json

headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# 1. Check tide_abs_region
print("=== 1. tide_abs_region 조회 ===")
url = f"{SUPABASE_URL}/rest/v1/tide_abs_region?Code=eq.AD_0001&select=Code,a_STN%20ID,b_STN%20ID"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    print(json.dumps(data, indent=2, ensure_ascii=False))

    if data and len(data) > 0:
        station_a = data[0].get('a_STN ID')
        station_b = data[0].get('b_STN ID')

        print(f"\n✅ a_STN ID: {station_a}")
        print(f"✅ b_STN ID: {station_b}")

        # 2. Check marine_observations for station A
        if station_a:
            print(f"\n=== 2. marine_observations 조회 (station_id={station_a}) ===")
            obs_url = f"{SUPABASE_URL}/rest/v1/marine_observations?station_id=eq.{station_a}&observation_time_kst=like.20260118*&select=station_id,observation_time_kst,water_temperature,significant_wave_height&order=observation_time_kst.asc&limit=3"
            obs_req = urllib.request.Request(obs_url, headers=headers)
            with urllib.request.urlopen(obs_req) as obs_response:
                obs_data = json.loads(obs_response.read().decode())
                print(f"총 조회 항목: {len(obs_data)}개")
                if obs_data:
                    print("\n첫 번째 항목:")
                    print(json.dumps(obs_data[0], indent=2, ensure_ascii=False))
