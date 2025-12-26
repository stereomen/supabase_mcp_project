# 관측소 목록 관리 가이드

## 개요

관측소 데이터는 `total_locations.xml` 파일에서 중앙 관리되며, 이를 변환하여 `netlify/shared/locations.js` 파일을 생성합니다.

**파일 구조:**
```
add_location/
├── total_locations.xml              # 원본 관측소 데이터 (178개)
├── convert_to_js.py                 # XML → JavaScript 변환 스크립트
└── README.md                        # 이 문서

netlify/shared/
└── locations.js                     # 웹에서 사용하는 JavaScript 파일
```

---

## 1. 관측소 추가하기

### 1단계: XML 파일 편집

`total_locations.xml` 파일을 열어 새 관측소 정보를 추가합니다:

```xml
<Location>
  <Code>AD_0043</Code>
  <Name>새로운항</Name>
  <Latitude>37.123456</Latitude>
  <Longitude>126.123456</Longitude>
  <marine_reg_name>서해북부</marine_reg_name>
  <AddressA>경기도</AddressA>
  <AddressB>시군구</AddressB>
  <AddressC>상세주소</AddressC>
</Location>
```

**필수 필드:**
- `Code`: 관측소 코드 (SO_*, DT_*, IE_*, AD_* 형식)
- `Name`: 관측소 이름

**선택 필드:**
- `Latitude`, `Longitude`: 위도/경도
- `marine_reg_name`: 해역명 (서해북부, 서해중부, 서해남부, 남해동부, 남해서부, 동해중부, 동해남부 등)
- `AddressA`, `AddressB`, `AddressC`: 주소 정보

### 2단계: JavaScript 파일 생성

아래 Python 스크립트를 실행하여 XML을 JavaScript로 변환합니다:

```bash
cd add_location
python3 convert_to_js.py
```

**또는 직접 Python 코드 실행:**

```bash
python3 << 'EOF'
import xml.etree.ElementTree as ET

# XML 파일 읽기
tree = ET.parse('total_locations.xml')
root = tree.getroot()

# JavaScript 파일 생성
js_content = """// 관측소 목록 데이터
// 자동 생성: total_locations.xml에서 변환됨
// 총 {count}개 관측소

const locations = [
""".format(count=len(root.findall('Location')))

# 각 관측소를 JavaScript 객체로 변환
for location in root.findall('Location'):
    code = location.find('Code').text
    name = location.find('Name').text
    js_content += f'    {{code: "{code}", name: "{name}"}},\n'

# 배열 닫기 및 export
js_content += """];

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = locations;
}
"""

# JavaScript 파일 저장
with open('../netlify/shared/locations.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"✅ netlify/shared/locations.js 생성 완료: {len(root.findall('Location'))}개 관측소")
EOF
```

### 3단계: Git 커밋 및 배포

```bash
git add add_location/total_locations.xml netlify/shared/locations.js
git commit -m "feat: Add new observation station (새로운항)"
git push
```

Netlify가 자동으로 배포합니다 (1-2분 소요).

---

## 2. 관측소 수정하기

### 기존 관측소 정보 변경

1. `total_locations.xml`에서 해당 `<Code>` 찾기
2. 수정할 필드 변경 (예: 이름, 좌표 등)
3. 위의 **2단계, 3단계** 동일하게 진행

**예시: 이름 변경**
```xml
<!-- 변경 전 -->
<Name>미조항</Name>

<!-- 변경 후 -->
<Name>미조항(갱신)</Name>
```

---

## 3. 관측소 삭제하기

1. `total_locations.xml`에서 해당 `<Location>` 블록 전체 삭제
2. 위의 **2단계, 3단계** 진행

**주의:** 삭제 전 해당 관측소를 사용하는 광고 캠페인이 있는지 확인하세요!

---

## 4. 변환 스크립트 (convert_to_js.py)

파일 생성을 자동화하려면 아래 스크립트를 `convert_to_js.py`로 저장하세요:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
관측소 XML 데이터를 JavaScript 파일로 변환
사용법: python3 convert_to_js.py
"""

import xml.etree.ElementTree as ET
import os

def convert_xml_to_js():
    # XML 파일 읽기
    xml_file = 'total_locations.xml'
    js_file = '../netlify/shared/locations.js'

    if not os.path.exists(xml_file):
        print(f"❌ 오류: {xml_file} 파일을 찾을 수 없습니다.")
        return

    tree = ET.parse(xml_file)
    root = tree.getroot()

    locations = root.findall('Location')
    count = len(locations)

    # JavaScript 파일 생성
    js_content = f"""// 관측소 목록 데이터
// 자동 생성: total_locations.xml에서 변환됨
// 총 {count}개 관측소

const locations = [
"""

    # 각 관측소를 JavaScript 객체로 변환
    for location in locations:
        code = location.find('Code').text
        name = location.find('Name').text
        js_content += f'    {{code: "{code}", name: "{name}"}},\n'

    # 배열 닫기 및 export
    js_content += """];

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = locations;
}
"""

    # JavaScript 파일 저장
    os.makedirs(os.path.dirname(js_file), exist_ok=True)
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"✅ {js_file} 생성 완료")
    print(f"   총 {count}개 관측소 데이터 변환됨")

if __name__ == '__main__':
    convert_xml_to_js()
```

**실행 방법:**
```bash
cd add_location
chmod +x convert_to_js.py
python3 convert_to_js.py
```

---

## 5. 주의사항

### 관측소 코드 규칙
- **SO_XXXX**: 조석 관측소 (Sea Observation)
- **DT_XXXX**: 해양기상 관측소 (Data Terminal)
- **IE_XXXX**: 해양과학기지 (Island Equipment)
- **AD_XXXX**: 추가 관측소 (Additional)

### XML 형식 유지
- 들여쓰기는 공백 2칸 사용
- UTF-8 인코딩 필수
- `<?xml version="1.0" encoding="UTF-8"?>` 헤더 유지

### 테스트 확인
변환 후 브라우저에서 확인:
1. https://mancool.netlify.app/ad-post (광고 등록 페이지)
2. https://mancool.netlify.app/api-validator (API 검증 페이지)
3. "매핑 관측소" 드롭다운에서 새 관측소 확인

---

## 6. 문제 해결

### Q1. JavaScript 파일이 생성되지 않아요
**A:** Python이 설치되어 있는지 확인하세요:
```bash
python3 --version
```

### Q2. 웹사이트에 반영이 안 돼요
**A:**
1. Git push가 완료되었는지 확인
2. Netlify 배포 대기 (1-2분)
3. 브라우저 캐시 삭제 (`Ctrl+F5` 또는 `Cmd+Shift+R`)

### Q3. 관측소가 중복되어 있어요
**A:** `total_locations.xml`에서 중복된 `<Code>` 검색 후 제거:
```bash
grep -o '<Code>.*</Code>' total_locations.xml | sort | uniq -d
```

---

## 7. 참고 자료

- **전체 관측소 목록**: `total_locations.xml` 참조
- **사용 중인 페이지**:
  - `netlify/ad-post.html` (광고 캠페인 등록)
  - `netlify/api-validator.html` (API 테스트)
- **데이터 원본**:
  - `locations_with_addresses.xml` (SO, DT, IE 코드)
  - `add_location_with_address.xml` (AD 코드)

---

**최종 업데이트:** 2025-12-26
**총 관측소 개수:** 178개
