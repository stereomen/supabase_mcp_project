# 날씨 표현 문장 가이드

## 개요
`get-weather-tide-data` API의 `weather_forecasts` 데이터를 활용하여 사용자 친화적인 날씨 표현 문장을 생성하는 가이드입니다.

## 데이터 구조 (weather_forecasts)

### 주요 필드
```json
{
  "fcst_datetime_kr": "2025-09-10T15:00:00+09:00", // 예보 시각 (KST)
  "tmp": 25,        // 기온 (°C)
  "tmn": 20,        // 최저기온 (°C) - 해당일 최저
  "tmx": 28,        // 최고기온 (°C) - 해당일 최고
  "sky": 3,         // 하늘상태 (1~4)
  "pty": 0,         // 강수형태 (0~4)
  "pop": 20,        // 강수확률 (%)
  "pcp": "강수없음", // 1시간 강수량
  "wsd": 3.5,       // 풍속 (m/s)
  "vec": 225,       // 풍향 (deg)
  "reh": 65,        // 습도 (%)
  "wav": 0.5        // 파고 (m)
}
```

## 날씨 조건 코드표

### 1. 하늘상태 (SKY)
| 코드 | 상태 | 표현 |
|------|------|------|
| 1 | 맑음 | 맑다, 쾌청하다 |
| 2 | 구름조금 | 구름이 조금 있다 |
| 3 | 구름많음 | 구름이 많다, 흐리다 |
| 4 | 흐림 | 흐리다, 어둡다 |

### 2. 강수형태 (PTY)
| 코드 | 형태 | 표현 |
|------|------|------|
| 0 | 없음 | (강수 표현 없음) |
| 1 | 비 | 비가 온다, 비가 내린다 |
| 2 | 비/눈 | 비와 눈이 온다, 진눈깨비가 온다 |
| 3 | 눈 | 눈이 온다, 눈이 내린다 |
| 4 | 소나기 | 소나기가 온다 |

### 3. 강수확률 구간
| 범위 | 표현 |
|------|------|
| 0~10% | 비 소식 없음 |
| 11~30% | 비 올 가능성 낮음 |
| 31~60% | 비 올 가능성 있음 |
| 61~80% | 비 올 가능성 높음 |
| 81~100% | 비 확실 |

## 시간대별 표현 템플릿

### 시간대 구분
- **새벽**: 03:00~06:00
- **아침**: 06:00~12:00  
- **오후**: 12:00~18:00
- **저녁**: 18:00~21:00
- **밤**: 21:00~03:00

### 기간 표현
- **오늘**: 현재일 00:00~23:59
- **내일**: 현재일+1 00:00~23:59
- **모레**: 현재일+2 00:00~23:59

## 날씨 표현 문장 생성 로직

### 1. 기본 날씨 상태 조합

#### A. 맑음 계열 (SKY: 1-2)
```javascript
// 조건: sky <= 2 && pty == 0
const conditions = [
  {
    time: "오늘",
    sky: 1,
    pty: 0,
    pop: 0-10,
    expression: "오늘은 맑고 쾌청해요"
  },
  {
    time: "내일 오전",
    sky: 2,
    pty: 0,
    pop: 0-10,
    expression: "내일 오전은 구름이 조금 끼지만 대체로 맑아요"
  }
]
```

#### B. 흐림 계열 (SKY: 3-4)
```javascript
// 조건: sky >= 3 && pty == 0
const conditions = [
  {
    time: "오늘 오후",
    sky: 3,
    pty: 0,
    pop: 10-30,
    expression: "오늘 오후는 구름이 많지만 비는 오지 않아요"
  },
  {
    time: "내일",
    sky: 4,
    pty: 0,
    pop: 20-40,
    expression: "내일은 흐리지만 비 소식은 없어요"
  }
]
```

#### C. 강수 계열 (PTY: 1-4)
```javascript
// 조건: pty >= 1
const conditions = [
  {
    time: "오늘 저녁",
    sky: 4,
    pty: 1,
    pop: 70-90,
    expression: "오늘 저녁부터 비가 내려요"
  },
  {
    time: "내일 새벽",
    sky: 4,
    pty: 3,
    pop: 80-100,
    expression: "내일 새벽부터 눈이 내릴 예정이에요"
  }
]
```

### 2. 48시간 통합 표현 패턴

#### 오늘~내일 통합 표현 (48시간 예보)
```javascript
const combinedExpressions = {
  // 지속적 맑음 (현재~내일)
  continuous_clear: {
    condition: "overall_sky <= 2 && overall_pty == 0 && overall_pop <= 20",
    templates: [
      "내일까지 계속 맑은 날씨가 이어져요",
      "내일 밤까지 쾌청한 날씨예요",
      "향후 이틀간 맑고 화창해요"
    ]
  },
  
  // 오늘 맑음 → 내일 흐림
  today_clear_tomorrow_cloudy: {
    condition: "today_sky <= 2 && tomorrow_sky >= 3",
    templates: [
      "오늘은 맑다가 내일부터 흐려져요",
      "지금은 맑지만 내일부터 구름이 많아져요",
      "오늘 밤까지 맑다가 내일 흐려져요"
    ]
  },
  
  // 오늘 밤부터 비
  tonight_rain_starts: {
    condition: "today_evening_pty >= 1 || tonight_pty >= 1",
    templates: [
      "오늘 밤부터 비가 시작돼요",
      "늦은 밤부터 내일까지 비 소식이 있어요",
      "자정 무렵부터 비가 내릴 예정이에요"
    ]
  },
  
  // 내일 새벽까지 비 → 맑음
  rain_until_dawn_then_clear: {
    condition: "current_pty >= 1 && tomorrow_afternoon_sky <= 2",
    templates: [
      "내일 새벽까지 비가 내리다가 맑아져요",
      "비는 내일 오전에 그치고 오후부터 맑아져요",
      "내일 아침까지 비 온 뒤 화창해져요"
    ]
  },
  
  // 한때 소나기 후 맑음
  occasional_shower_then_clear: {
    condition: "(today_pty == 4 || tomorrow_pty == 4) && overall_rain_duration < 6",
    templates: [
      "한때 소나기가 지나간 뒤 맑아져요",
      "오늘 밤 한때 비가 내리고 내일은 맑아요",
      "짧은 소나기 후 내일까지 좋은 날씨예요"
    ]
  },
  
  // 점진적 날씨 악화
  gradual_deterioration: {
    condition: "today_sky < tomorrow_sky && tomorrow_pop > today_pop + 30",
    templates: [
      "점차 흐려지며 내일 비가 올 가능성이 높아요",
      "날씨가 점점 흐려져 내일 비 소식이 있어요",
      "구름이 많아지며 내일부터 우산이 필요해요"
    ]
  },
  
  // 점진적 날씨 호전  
  gradual_improvement: {
    condition: "today_sky > tomorrow_sky && today_pop > tomorrow_pop + 20",
    templates: [
      "점차 맑아져 내일은 좋은 날씨예요",
      "구름이 걷히며 내일까지 화창해져요",
      "날씨가 점점 좋아져 내일은 쾌청해요"
    ]
  },
  
  // 불안정한 날씨
  unstable_weather: {
    condition: "weather_changes >= 3 || (today_pty != tomorrow_pty && both_have_rain)",
    templates: [
      "날씨 변화가 많아 우산을 준비하세요",
      "내일까지 변덕스러운 날씨가 계속돼요",
      "구름과 비가 번갈아가며 나타날 예정이에요"
    ]
  }
}
```

### 3. 복합 조건 표현

#### 시간대별 변화 표현
```javascript
const timeBasedExpressions = {
  // 낮 맑음 → 밤 흐림
  day_clear_night_cloudy: {
    condition: "day_sky <= 2 && night_sky >= 3",
    expression: "낮에는 맑다가 밤부터 구름이 많아져요"
  },
  
  // 오전 비 → 오후 맑음
  morning_rain_afternoon_clear: {
    condition: "morning_pty >= 1 && afternoon_sky <= 2",
    expression: "오전에 비가 내리다가 오후부터 맑아져요"
  },
  
  // 한때 소나기
  occasional_shower: {
    condition: "pty == 4 || (pty == 1 && duration < 3_hours)",
    expression: "한때 소나기가 지나갈 수 있어요"
  }
}
```

## 구현 예시 (JavaScript)

### 48시간 통합 날씨 문장 생성 함수
```javascript
function generate48HourWeatherSentence(weatherData, currentTime) {
  // 현재 시간부터 48시간 데이터 필터링
  const next48Hours = filter48HourData(weatherData, currentTime);
  
  // 오늘/내일 데이터 분리
  const todayData = filterTodayData(next48Hours, currentTime);
  const tomorrowData = filterTomorrowData(next48Hours, currentTime);
  
  // 날씨 패턴 분석
  const weatherPattern = analyze48HourPattern(todayData, tomorrowData);
  
  // 통합 문장 생성
  return buildCombinedWeatherSentence(weatherPattern);
}

function analyze48HourPattern(todayData, tomorrowData) {
  return {
    // 오늘 패턴
    today: {
      avgSky: getAverageValue(todayData.map(d => d.sky)),
      maxPty: getMaxValue(todayData.map(d => d.pty)),
      avgPop: getAverageValue(todayData.map(d => d.pop)),
      hasEvening: todayData.some(d => isEvening(d.fcst_datetime_kr)),
      hasNight: todayData.some(d => isNight(d.fcst_datetime_kr))
    },
    
    // 내일 패턴
    tomorrow: {
      avgSky: getAverageValue(tomorrowData.map(d => d.sky)),
      maxPty: getMaxValue(tomorrowData.map(d => d.pty)),
      avgPop: getAverageValue(tomorrowData.map(d => d.pop)),
      morningData: tomorrowData.filter(d => isMorning(d.fcst_datetime_kr)),
      afternoonData: tomorrowData.filter(d => isAfternoon(d.fcst_datetime_kr))
    },
    
    // 전체 트렌드
    overall: {
      skyTrend: compareTrend(todayData, tomorrowData, 'sky'),
      popTrend: compareTrend(todayData, tomorrowData, 'pop'),
      weatherChanges: countWeatherChanges(todayData.concat(tomorrowData)),
      rainPeriods: analyzeRainPeriods(todayData.concat(tomorrowData))
    }
  };
}

function analyzeWeatherPattern(hourlyData) {
  const patterns = {
    sky: getMostFrequentValue(hourlyData.map(d => d.sky)),
    pty: getMaxValue(hourlyData.map(d => d.pty)),
    pop: getAverageValue(hourlyData.map(d => d.pop)),
    hasRain: hourlyData.some(d => d.pty > 0),
    rainDuration: calculateRainDuration(hourlyData)
  };
  
  return patterns;
}

function buildCombinedWeatherSentence(pattern) {
  const { today, tomorrow, overall } = pattern;
  
  // 1. 지속적 패턴 체크
  if (isContinuousPattern(today, tomorrow)) {
    return buildContinuousWeatherSentence(today, tomorrow);
  }
  
  // 2. 변화 패턴 체크
  if (hasSignificantChange(today, tomorrow)) {
    return buildChangeWeatherSentence(today, tomorrow, overall);
  }
  
  // 3. 특수 패턴 체크 (비/눈)
  if (hasSpecialWeatherPattern(overall)) {
    return buildSpecialWeatherSentence(overall);
  }
  
  // 4. 기본 패턴
  return buildDefaultWeatherSentence(today, tomorrow);
}

function buildContinuousWeatherSentence(today, tomorrow) {
  const avgSky = (today.avgSky + tomorrow.avgSky) / 2;
  const hasRain = today.maxPty > 0 || tomorrow.maxPty > 0;
  
  if (hasRain) {
    if (today.maxPty === 1 && tomorrow.maxPty === 1) {
      return "내일까지 비가 계속 내려요";
    } else if (today.maxPty === 3 || tomorrow.maxPty === 3) {
      return "내일까지 눈 소식이 있어요";
    }
  } else {
    if (avgSky <= 2) {
      return "내일까지 계속 맑은 날씨가 이어져요";
    } else if (avgSky >= 3) {
      return "내일까지 흐린 날씨가 계속돼요";
    }
  }
  
  return "내일까지 현재 날씨가 이어져요";
}

function buildChangeWeatherSentence(today, tomorrow, overall) {
  // 날씨 호전
  if (overall.skyTrend === 'improving') {
    if (today.maxPty > 0 && tomorrow.maxPty === 0) {
      return "비는 내일 오전에 그치고 오후부터 맑아져요";
    } else {
      return "점차 맑아져 내일은 좋은 날씨예요";
    }
  }
  
  // 날씨 악화
  if (overall.skyTrend === 'deteriorating') {
    if (today.avgSky <= 2 && tomorrow.avgPop > 50) {
      return "지금은 맑지만 내일부터 비가 올 가능성이 높아요";
    } else {
      return "점차 흐려지며 내일 비가 올 수도 있어요";
    }
  }
  
  // 밤부터 변화
  if (today.hasNight && tomorrow.maxPty > today.maxPty) {
    return "오늘 밤부터 비가 시작될 예정이에요";
  }
  
  return "날씨 변화가 있을 예정이에요";
}

function buildSpecialWeatherSentence(overall) {
  if (overall.rainPeriods.length > 0) {
    const firstRain = overall.rainPeriods[0];
    
    if (firstRain.type === 'shower') {
      return "한때 소나기가 지나간 뒤 맑아져요";
    } else if (firstRain.duration < 6) {
      return "짧은 비가 내린 후 날씨가 좋아져요";
    } else {
      return "비가 오랫동안 계속될 예정이에요";
    }
  }
  
  return "특별한 날씨 변화가 예상돼요";
}
```

### 시간대별 세부 표현
```javascript
function generateDetailedWeatherSentence(weatherData) {
  const timeRanges = [
    { name: "새벽", start: 3, end: 6 },
    { name: "오전", start: 6, end: 12 },
    { name: "오후", start: 12, end: 18 },
    { name: "저녁", start: 18, end: 21 },
    { name: "밤", start: 21, end: 24 }
  ];
  
  const descriptions = [];
  
  timeRanges.forEach(range => {
    const rangeData = filterByTimeRange(weatherData, range.start, range.end);
    if (rangeData.length > 0) {
      const pattern = analyzeWeatherPattern(rangeData);
      const desc = generateTimeRangeDescription(range.name, pattern);
      if (desc) descriptions.push(desc);
    }
  });
  
  return descriptions.join(', ');
}

function generateTimeRangeDescription(timeName, pattern) {
  if (pattern.hasRain) {
    return `${timeName}에 비가 내려요`;
  } else if (pattern.sky <= 2) {
    return `${timeName}은 맑아요`;
  } else if (pattern.sky >= 3 && pattern.pop > 30) {
    return `${timeName}은 흐리고 비가 올 수도 있어요`;
  }
  return null;
}
```

## 활용 가이드

### 1. 기본 사용법
```javascript
// API 데이터에서 weather_forecasts 추출
const weatherData = apiResponse.weather_forecasts;

// 48시간 통합 날씨 문장 생성 (현재 시간부터 내일 24시까지)
const combinedWeather = generate48HourWeatherSentence(
  weatherData,
  new Date()
);
// 예: "오늘은 맑다가 내일부터 흐려져요"

// 특정 시간 기준 48시간 예보
const specificTimeWeather = generate48HourWeatherSentence(
  weatherData,
  new Date('2025-09-10T15:00:00+09:00') // 사용자 조회 시점
);
```

### 2. 상세 시간대별 표현
```javascript
// 시간대별 상세 날씨
const detailedWeather = generateDetailedWeatherSentence(weatherData);
// 예: "오전은 맑고, 오후부터 구름이 많아지며, 저녁에 비가 내려요"
```

### 3. 커스터마이징
개발 상황에 맞게 표현 문구를 수정하여 사용하세요:
- 지역적 특성 반영 (해안가, 산간지역)
- 사용자 그룹별 톤앤매너 조정
- 앱의 브랜드 보이스에 맞는 문체 적용

## 주의사항

1. **데이터 유효성 검증**: API 응답이 null이거나 빈 배열일 경우 대비
2. **시간대 처리**: KST 기준으로 정확한 시간 계산
3. **예외 상황 처리**: 특수한 기상 상황(태풍, 폭설 등) 별도 처리
4. **지속적 업데이트**: 기상청 코드 변경 시 매핑 테이블 업데이트 필요
