# find_closest_station.py 스크립트 설명

이 파이썬 스크립트(`find_closest_station.py`)는 여러 CSV 파일을 기반으로 데이터를 분석하고 병합하여, 최종적으로 `tide-abs_info_ab.csv` 파일을 생성하는 역할을 합니다.

## 주요 기능

스크립트는 `tidedata-station_info_rows.csv` 파일에 있는 각 조위 관측소의 위치(위도, 경도)를 기준으로, `abs_region_data_a.csv`와 `abs_region_data_b.csv` 파일에 각각 등록된 해양 관측소 중에서 지리적으로 가장 가까운 곳을 찾습니다.

그 후, 원본 조위 관측소 데이터에 아래와 같은 정보를 추가하여 새로운 CSV 파일을 생성합니다.

-   **가장 가까운 'a' 지역 정보**:
    -   `a_지역명(한글)`
    -   `a_STN ID`
    -   `a_위도(LAT)`
    -   `a_경도(LON)`
    -   `a_제공 정보`
-   **가장 가까운 'b' 지역 정보**:
    -   `b_STN ID`
    -   `b_위도(LAT)`
    -   `b_경도(LON)`
    -   `b_제공 정보`

## 사용된 파일

-   **입력 파일**:
    1.  `tidedata-station_info_rows.csv`: 기준이 되는 조위 관측소 정보.
    2.  `abs_region_data_a.csv`: 비교 대상인 해양 관측소 그룹 'a' 정보.
    3.  `abs_region_data_b.csv`: 비교 대상인 해양 관측소 그룹 'b' 정보.
-   **출력 파일**:
    -   `tide-abs_info_ab.csv`: 모든 정보가 병합된 최종 결과 파일.

## 실행 방법

스크립트는 다음 명령어로 실행할 수 있습니다.

```bash
python3 find_closest_station.py
```
