# get-ad-weather-data 함수 수정 사항

## 개요
기존 `get-weather-tide-data` 함수를 복사하여 광고 기능을 추가한 `get-ad-weather-data` 함수 생성

## 수정 위치
파일: `supabase/functions/get-ad-weather-data/index.ts`

### 1. 파일 상단 주석 수정 (라인 1-10)
```typescript
// supabase/functions/get-ad-weather-data/index.ts
// *** v16: 광고 통합 버전 - 관측소별 활성 광고 조회 기능 추가 ***
// v15: weatherapi 데이터 플래그로 제어 (기본값: false)
// v14: OpenWeatherMap 데이터 추가
```

### 2. 광고 조회 로직 추가 (라인 85 이후 삽입)
Supabase 클라이언트 초기화 직후에 다음 코드 추가:

```typescript
// === 광고 조회 로직 시작 ===
// 관측소에 대한 활성 광고 조회
let adData = null;
try {
  const adResult = await supabaseClient
    .rpc('get_active_ads_for_station', {
      p_station_id: locationCode,
      p_date: date
    });

  if (!adResult.error && adResult.data && adResult.data.length > 0) {
    adData = adResult.data[0]; // 우선순위 가장 높은 광고 1개
    console.log(`Active ad found for station ${locationCode}:`, adData.id);

    // 광고 노출 이벤트 기록 (비동기, 실패해도 응답에 영향 없음)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-ad-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        ad_repo_id: adData.id,
        event_type: 'impression',
        station_id: locationCode
      })
    }).catch(err => console.error('Failed to track ad impression:', err));
  } else {
    console.log(`No active ad for station ${locationCode}`);
  }
} catch (error) {
  console.error('Error fetching ad:', error);
  // 광고 조회 실패 시에도 날씨/조석 데이터는 정상 반환
}
// === 광고 조회 로직 끝 ===
```

### 3. 응답 데이터에 광고 추가 (파일 끝부분)
최종 응답 객체에 `ad` 필드 추가:

기존:
```typescript
return new Response(JSON.stringify({
  weather: mergedForecasts,
  tide: tideDataArray,
  // ... 기타 필드
}), {
  status: 200,
  headers: corsHeaders
});
```

수정 후:
```typescript
return new Response(JSON.stringify({
  ad: adData,  // 광고 데이터 추가 (없으면 null)
  weather: mergedForecasts,
  tide: tideDataArray,
  // ... 기타 필드
}), {
  status: 200,
  headers: corsHeaders
});
```

## 작동 방식

1. **파라미터 추출**: code (관측소), date (날짜)
2. **광고 조회**: `get_active_ads_for_station()` 함수로 활성 광고 확인
3. **광고 있을 경우**:
   - 광고 데이터 저장
   - track-ad-event API 호출하여 노출 수 기록
4. **광고 없을 경우**: adData는 null로 유지
5. **응답**: 광고 + 날씨 + 조석 데이터 통합 반환

## API 응답 형식

```json
{
  "ad": {
    "id": "uuid",
    "partner_name": "바다낚시 전문점",
    "campaign_name": "여름 시즌 프로모션",
    "ad_type_a": "banner",
    "image_a_url": "https://...",
    "landing_url": "https://...",
    "priority": 5
  },
  "weather": [...],
  "tide": [...],
  "a": {...},
  "b": {...},
  "marine": [...],
  "temper": [...],
  "openweather": {...}
}
```

광고가 없으면 `"ad": null`
