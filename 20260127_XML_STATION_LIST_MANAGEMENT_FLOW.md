# XML 조석관측소 목록 관리 플로우

작성일: 2026-01-27

## 개요

Firebase Remote Config 페이지에서 업로드한 XML 파일이 조석-해양 관측소 매칭 시스템에서 어떻게 활용되는지 설명합니다.

## 시스템 구성

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Firebase Storage (Master Data)                       │
│  - locations_v{N}_{YYYYMMDD}.xml (버전별 보관)                           │
│  - locations_latest.xml (항상 최신 버전)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌──────────────────────────┴──────────────────────────┐
        ↓                                                      ↓
┌────────────────────────────┐                    ┌────────────────────────────┐
│ tide-marine-station-       │                    │ tide-abs-region-editor.html│
│ matcher.html               │                    │                            │
│                            │                    │ - 최신 XML 로드            │
│ - 조석관측소 목록 로드      │                    │ - DB 데이터와 비교         │
│ - 해양관측소와 거리 계산    │                    │ - 변경사항 시각적 표시      │
│ - 매칭 결과 tide_abs_region│                    │ - 직접 편집 및 저장        │
│   테이블에 저장             │                    │                            │
└────────────────────────────┘                    └────────────────────────────┘
                  ↓                                              ↓
        ┌─────────────────────────────────────────────────────────────┐
        │            Supabase DB: tide_abs_region Table                │
        │  - Code, Name, wt/swh/wd/ws/at 매칭 정보 저장              │
        └─────────────────────────────────────────────────────────────┘
```

## 페이지별 역할

### 1. firebase-remote-config.html (XML 업로드 - Master)

**위치**: `/netlify/firebase-remote-config.html`

**역할**: 조석관측소 목록의 **단일 진실 공급원(Single Source of Truth)**

**주요 기능**:
- XML 파일 선택 및 업로드 (locations_with_addresses.xml 등)
- Firebase Storage에 두 가지 방식으로 저장:
  1. **버전별 보관**: `locations_v{N}_{YYYYMMDD}.xml` (예: `locations_v2_20260127.xml`)
  2. **최신 버전 고정**: `locations_latest.xml` (항상 덮어쓰기)

**업로드 로직**:
```javascript
// 1. 버전별 파일 업로드
const versionedFileName = `locations_v${version}_${formattedDate}.xml`;
await supabaseClient.storage
    .from('location-files')
    .upload(versionedFileName, blob, {
        contentType: 'application/xml',
        cacheControl: 'public, max-age=31536000'
    });

// 2. 최신 버전 고정 파일명으로 업로드 (덮어쓰기)
const latestFileName = 'locations_latest.xml';
await supabaseClient.storage
    .from('location-files')
    .upload(latestFileName, blob, {
        contentType: 'application/xml',
        cacheControl: 'no-cache, no-store, must-revalidate',
        upsert: true  // 덮어쓰기 허용
    });
```

**XML 파일 구조**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Locations>
    <Location>
        <Code>DT_0001</Code>
        <Name>인천</Name>
        <Latitude>37.4519</Latitude>
        <Longitude>126.5917</Longitude>
        <marine_reg_name>서해중부</marine_reg_name>
        <!-- 기타 필드들... -->
    </Location>
    <!-- 반복... -->
</Locations>
```

---

### 2. tide-marine-station-matcher.html (매칭 도구)

**위치**: `/netlify/tide-marine-station-matcher.html`

**역할**: XML에서 조석관측소 목록을 읽어 해양관측소와 자동/수동 매칭

**XML 로드 방식**:
```javascript
async function loadMatchingData() {
    // Firebase Storage에서 최신 XML 로드
    const timestamp = new Date().getTime(); // 캐시 우회
    const xmlUrl = `${SUPABASE_URL}/storage/v1/object/public/location-files/locations_latest.xml?t=${timestamp}`;

    const xmlResponse = await fetch(xmlUrl, {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        }
    });

    const xmlText = await xmlResponse.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // XML 파싱하여 조석관측소 목록 추출
    const locations = xmlDoc.getElementsByTagName('Location');
    const tideStations = {};

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        const code = location.getElementsByTagName('Code')[0]?.textContent;
        const name = location.getElementsByTagName('Name')[0]?.textContent;
        const latText = location.getElementsByTagName('Latitude')[0]?.textContent;
        const lonText = location.getElementsByTagName('Longitude')[0]?.textContent;
        const marineReg = location.getElementsByTagName('marine_reg_name')[0]?.textContent;

        if (code && name) {
            tideStations[code] = {
                tide_station_name: name,
                tide_station_lat: parseFloat(latText),
                tide_station_lon: parseFloat(lonText),
                marine_reg_name: marineReg,
                nearest_marine_stations: []
            };
        }
    }

    STATION_MATCHING_DATA = tideStations;
}
```

**주요 기능**:
1. **조석관측소 목록 표시**: XML에서 로드한 조석관측소를 드롭다운에 표시
2. **가까운 관측소 계산**:
   - Haversine 공식으로 실시간 거리 계산
   - marine_observations 테이블에서 해양관측소 데이터 쿼리
   - 거리순 상위 10개 관측소 표시
3. **데이터 품질 분석**:
   - 지정 기간 동안 각 해양관측소의 데이터 수집 통계 분석
   - 유효 데이터 비율, 평균 수집 간격, 품질 평가
4. **매칭 결과 업로드**:
   - 선택된 매칭 정보를 `tide_abs_region` 테이블에 저장
   - 각 필드(wt, swh, wd, ws, at)별로 최적의 해양관측소 매핑

**데이터 흐름**:
```
locations_latest.xml
    ↓ (XML 파싱)
STATION_MATCHING_DATA (JavaScript 객체)
    ↓ (사용자 선택 + 분석)
selectedMappings (선택된 매칭 정보)
    ↓ (업로드)
tide_abs_region 테이블 (Supabase DB)
```

---

### 3. tide-abs-region-editor.html (데이터 편집 도구)

**위치**: `/netlify/tide-abs-region-editor.html`

**역할**: XML의 최신 조석관측소 정보와 DB의 기존 정보를 비교하여 편집

**XML 로드 방식**:
```javascript
let latestTideStationsXML = {}; // 최신 XML 데이터 저장

async function loadLatestTideStationsXML() {
    const timestamp = new Date().getTime();
    const xmlUrl = `${SUPABASE_URL}/storage/v1/object/public/location-files/locations_latest.xml?t=${timestamp}`;

    const xmlResponse = await fetch(xmlUrl, {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        }
    });

    const xmlText = await xmlResponse.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const locations = xmlDoc.getElementsByTagName('Location');

    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        const code = location.getElementsByTagName('Code')[0]?.textContent;
        const name = location.getElementsByTagName('Name')[0]?.textContent;
        const lat = location.getElementsByTagName('Latitude')[0]?.textContent;
        const lon = location.getElementsByTagName('Longitude')[0]?.textContent;

        if (code) {
            latestTideStationsXML[code] = {
                name: name,
                lat: parseFloat(lat),
                lon: parseFloat(lon)
            };
        }
    }
}
```

**주요 기능**:
1. **DB 데이터 로드**: `tide_abs_region` 테이블에서 현재 매칭 정보 로드
2. **XML 데이터 비교**:
   - XML의 최신 조석관측소 정보(name, lat, lon)와 DB 값 비교
   - 변경된 값은 **주황색으로 표시** (`#ff6b00`)
   - 툴팁에 "DB: 구값 → XML: 신값" 형식으로 차이 표시
3. **직접 편집**:
   - 테이블의 모든 셀을 직접 클릭하여 편집 가능
   - 매칭된 해양관측소 정보(STN_ID, 위도, 경도, 지역명) 수정
4. **변경사항 저장**:
   - 수정된 값을 `tide_abs_region` 테이블에 업데이트
   - 엑셀 다운로드 지원

**변경사항 시각화**:
```javascript
// renderTable() 함수 내부
const latestName = latestTideStationsXML[rowData.Code]?.name;
nameCell.textContent = latestName || rowData.Name || '';

if (latestName && latestName !== rowData.Name) {
    // DB와 XML 값이 다른 경우
    nameCell.title = `DB: ${rowData.Name} → XML: ${latestName}`;
    nameCell.style.color = '#ff6b00'; // 주황색으로 강조
    nameCell.style.fontWeight = 'bold';
}
```

---

## 데이터 업데이트 시나리오

### 시나리오 1: 새로운 조석관측소 추가

1. **firebase-remote-config.html**:
   - 새 관측소가 포함된 XML 파일 업로드
   - Firebase Storage에 `locations_latest.xml` 업데이트

2. **tide-marine-station-matcher.html**:
   - 페이지 새로고침 시 새 관측소가 드롭다운에 표시됨
   - 해당 관측소 선택 시 실시간으로 가까운 해양관측소 계산
   - 매칭 실행 후 `tide_abs_region` 테이블에 신규 행 추가

3. **tide-abs-region-editor.html**:
   - 새 관측소가 테이블에 추가됨 (DB에 없는 경우 빈 행)
   - 매칭 정보 편집 및 저장 가능

### 시나리오 2: 기존 관측소 정보 변경 (이름, 위도, 경도)

1. **firebase-remote-config.html**:
   - 수정된 XML 파일 업로드
   - Firebase Storage 업데이트

2. **tide-marine-station-matcher.html**:
   - 페이지 새로고침 시 변경된 정보로 조석관측소 목록 갱신
   - 변경된 위치 기준으로 거리 재계산
   - 필요 시 매칭 재실행

3. **tide-abs-region-editor.html**:
   - 변경된 필드가 **주황색으로 강조 표시**
   - 툴팁에서 기존 값과 새 값 비교 가능
   - XML의 새 값을 DB에 반영하려면 수동으로 편집 후 저장

### 시나리오 3: 관측소 코드는 동일, 이름만 변경

예: `DT_0023`의 이름이 "강화도" → "강화도(갑곶)"로 변경

1. **firebase-remote-config.html**:
   - 수정된 XML 업로드

2. **tide-marine-station-matcher.html**:
   - 드롭다운에 새 이름으로 표시: `DT_0023 - 강화도(갑곶)`
   - 기존 매칭 정보는 그대로 유지 (코드 기반)

3. **tide-abs-region-editor.html**:
   - `Name` 컬럼이 주황색으로 표시
   - 툴팁: "DB: 강화도 → XML: 강화도(갑곶)"
   - 관리자가 확인 후 DB 업데이트 여부 결정

---

## 캐시 관리 전략

### Firebase Storage 캐시 설정

**버전별 파일** (`locations_v{N}_{YYYYMMDD}.xml`):
```javascript
cacheControl: 'public, max-age=31536000' // 1년 캐싱 (불변)
```

**최신 파일** (`locations_latest.xml`):
```javascript
cacheControl: 'no-cache, no-store, must-revalidate' // 캐싱 금지
```

### 클라이언트 측 캐시 우회

모든 페이지에서 `locations_latest.xml`을 로드할 때:
1. **타임스탬프 쿼리 파라미터**: `?t=${new Date().getTime()}`
2. **fetch 헤더**:
   ```javascript
   {
       cache: 'no-store',
       headers: {
           'Cache-Control': 'no-cache, no-store, must-revalidate',
           'Pragma': 'no-cache'
       }
   }
   ```

이 전략으로 브라우저가 항상 최신 XML을 가져옵니다.

---

## 데이터 일관성 유지

### 마스터 데이터 원칙

- **Firebase Storage의 `locations_latest.xml`이 항상 최신 상태**
- DB(`tide_abs_region`)는 매칭 정보만 저장 (조석관측소 메타데이터는 XML 참조)
- 불일치 발생 시:
  1. XML 데이터를 신뢰
  2. tide-abs-region-editor.html에서 시각적 확인 후 수동 업데이트
  3. 또는 tide-marine-station-matcher.html에서 재매칭 실행

### 버전 관리

- 모든 업로드는 버전별 파일로 보관 (`locations_v{N}_{YYYYMMDD}.xml`)
- 문제 발생 시 이전 버전으로 수동 롤백 가능
- 버전 히스토리는 firebase-remote-config.html의 "📜 업로드 히스토리" 섹션에서 확인

---

## 실시간 거리 계산 로직

### Haversine 공식

tide-marine-station-matcher.html에서 사용:

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // km 단위 거리
}
```

### 가까운 관측소 자동 계산

```javascript
async function calculateNearestStations(tideLat, tideLon) {
    // 1. marine_observations 테이블에서 최근 관측소 데이터 쿼리
    const { data, error } = await supabaseClient
        .from('marine_observations')
        .select('station_id, station_name, latitude, longitude, ...')
        .order('observation_time_kst', { ascending: false })
        .limit(1000);

    // 2. 유니크한 관측소 목록 생성 (station_id 중복 제거)
    const uniqueStations = {};
    data.forEach(row => {
        if (row.station_id && !uniqueStations[row.station_id]) {
            uniqueStations[row.station_id] = {
                station_id: row.station_id,
                name: row.station_name,
                lat: row.latitude,
                lon: row.longitude,
                provides: ['wt', 'swh', ...]  // 제공 필드 목록
            };
        }
    });

    // 3. 거리 계산 및 정렬
    const stationsWithDistance = Object.values(uniqueStations).map(station => {
        const distance = calculateDistance(tideLat, tideLon, station.lat, station.lon);
        return { ...station, distance_km: Math.round(distance * 100) / 100 };
    });

    stationsWithDistance.sort((a, b) => a.distance_km - b.distance_km);
    return stationsWithDistance.slice(0, 10); // 상위 10개
}
```

---

## 주요 테이블 구조

### tide_abs_region (Supabase DB)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| Code | TEXT (PK) | 조석관측소 코드 (예: DT_0001) |
| Name | TEXT | 조석관측소 이름 |
| wt_STN_ID | TEXT | 수온 제공 해양관측소 ID |
| wt_위도(LAT) | FLOAT | 수온 관측소 위도 |
| wt_경도(LON) | FLOAT | 수온 관측소 경도 |
| wt_지역명(한글) | TEXT | 수온 관측소 지역명 |
| swh_STN_ID | TEXT | 파고 제공 해양관측소 ID |
| ... | ... | (swh, wd, ws, at 필드도 동일 구조) |

---

## 문제 해결 가이드

### Q1. tide-marine-station-matcher.html에서 조석관측소 목록이 안 보여요

**원인**: Firebase Storage에 `locations_latest.xml` 파일이 없거나 접근 불가

**해결**:
1. firebase-remote-config.html에서 XML 파일 재업로드
2. Firebase Storage 권한 확인 (public 읽기 허용 필요)
3. 브라우저 콘솔에서 에러 메시지 확인

### Q2. 가까운 관측소 계산이 너무 오래 걸려요

**원인**: marine_observations 테이블 크기가 큰 경우

**해결**:
- 현재 최근 1000건만 쿼리하도록 제한되어 있음
- 필요 시 `.limit(1000)` 값 조정

### Q3. tide-abs-region-editor.html에서 변경사항이 주황색으로 표시 안 돼요

**원인**: 브라우저 캐시로 인해 구 XML 로드

**해결**:
1. 강력 새로고침 (Ctrl+Shift+R / Cmd+Shift+R)
2. 브라우저 캐시 삭제 후 재로드
3. Firebase Storage에서 최신 XML 파일 확인

### Q4. XML 업로드 후에도 이전 데이터가 보여요

**원인**: 브라우저 캐시 또는 CDN 캐시

**해결**:
1. 타임스탬프 쿼리 파라미터가 제대로 작동하는지 확인
2. Network 탭에서 실제 로드된 XML 내용 확인
3. Firebase Storage에서 파일 업로드 시간 확인

---

## 정리

```
[Master: firebase-remote-config.html]
          ↓ (XML Upload)
[Firebase Storage: locations_latest.xml]
          ↓ (Fetch XML)
[tide-marine-station-matcher.html] → [tide_abs_region 테이블]
          ↑ (Compare & Edit)          ↓
[tide-abs-region-editor.html] ← (Load DB Data)
```

**핵심 원칙**:
1. Firebase Storage의 `locations_latest.xml`이 **마스터 데이터**
2. 모든 페이지는 **캐시를 우회**하여 최신 XML을 로드
3. DB는 **매칭 정보만 저장**, 조석관측소 메타데이터는 XML 참조
4. 변경사항은 **시각적으로 표시**하여 관리자가 확인 후 수동 반영
5. 버전별 파일 보관으로 **롤백 가능**

---

**관련 파일**:
- `/netlify/firebase-remote-config.html`
- `/netlify/tide-marine-station-matcher.html`
- `/netlify/tide-abs-region-editor.html`
- Firebase Storage: `location-files/locations_latest.xml`
- Supabase DB: `tide_abs_region` 테이블
