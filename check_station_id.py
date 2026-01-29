#!/usr/bin/env python3
"""
Check tide_abs_region table for AD_0001 station IDs
"""
import os
import requests
import json

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    exit(1)

headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# Check tide_abs_region table
url = f"{SUPABASE_URL}/rest/v1/tide_abs_region?Code=eq.AD_0001&select=Code,a_STN ID,b_STN ID"
response = requests.get(url, headers=headers)

print("=== tide_abs_region 테이블 조회 결과 ===")
print(f"Status: {response.status_code}")
print(f"Data: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

# Also check what the function would return
print("\n=== get-ad-weather-data API 테스트 ===")
function_url = f"{SUPABASE_URL}/functions/v1/get-ad-weather-data?code=AD_0001&date=2026-01-18"
function_headers = {
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}'
}
function_response = requests.get(function_url, headers=function_headers)
print(f"Status: {function_response.status_code}")
if function_response.status_code == 200:
    data = function_response.json()
    print(f"marine_observations.a: {json.dumps(data.get('marine_observations', {}).get('a', [])[:2], indent=2, ensure_ascii=False)}")
else:
    print(f"Error: {function_response.text}")
