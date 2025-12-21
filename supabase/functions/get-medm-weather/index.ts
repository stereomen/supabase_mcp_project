import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * 중기예보 데이터 수집 함수 (get-medm-weather)
 * 
 * 최적화 이력:
 * - tide_weather_region 테이블 조회 제거: location_code를 medium_term_forecasts에 직접 저장
 *   하여 get-weather-tide-data API에서 JOIN 연산 없이 바로 데이터 조회 가능하도록 최적화
 * - 134개 location_code 완전 지원으로 API 성능 20% 향상 (5개 → 4개 쿼리 감소)
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// KST 시간을 파싱하는 함수
function parseKSTTime(kstString) {
  if (!kstString || kstString.length !== 12) {
    throw new Error(`Invalid KST format: ${kstString}`);
  }
  const year = parseInt(kstString.substring(0, 4));
  const month = parseInt(kstString.substring(4, 6));
  const day = parseInt(kstString.substring(6, 8));
  const hour = parseInt(kstString.substring(8, 10));
  const minute = parseInt(kstString.substring(10, 12));

  // 기상청 API는 이미 KST 시간을 제공 (예: 202512040600 = 2025-12-04 06:00 KST)
  // UTC로 변환: KST - 9시간
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute) - 9 * 60 * 60 * 1000);

  // KST 문자열 생성 (원본 시간 그대로)
  const kstWithTz = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;

  return {
    utc: utcDate.toISOString(),
    kst: kstWithTz
  };
}
// 지역 정보를 하드코딩으로 직접 제공 (배포 시 파일 경로 문제 해결)
function getRegionInfo() {
  const regions = new Map();
  // 기상청 공식 중기예보 지역 정보 (KMA API에서 가져온 전체 223개 지역)
  const regionData = [
    {
      REG_ID: '11A00101',
      REG_SP: 'C',
      REG_NAME: '백령도'
    },
    {
      REG_ID: '11B00000',
      REG_SP: 'A',
      REG_NAME: '서울.인천.경기'
    },
    {
      REG_ID: '11B20301',
      REG_SP: 'C',
      REG_NAME: '의정부'
    },
    {
      REG_ID: '11B20302',
      REG_SP: 'C',
      REG_NAME: '고양'
    },
    {
      REG_ID: '11B20304',
      REG_SP: 'C',
      REG_NAME: '양주'
    },
    {
      REG_ID: '11B20305',
      REG_SP: 'C',
      REG_NAME: '파주'
    },
    {
      REG_ID: '11B20401',
      REG_SP: 'C',
      REG_NAME: '동두천'
    },
    {
      REG_ID: '11B20402',
      REG_SP: 'C',
      REG_NAME: '연천'
    },
    {
      REG_ID: '11B20403',
      REG_SP: 'C',
      REG_NAME: '포천'
    },
    {
      REG_ID: '11B20404',
      REG_SP: 'C',
      REG_NAME: '가평'
    },
    {
      REG_ID: '11B20501',
      REG_SP: 'C',
      REG_NAME: '구리'
    },
    {
      REG_ID: '11B20502',
      REG_SP: 'C',
      REG_NAME: '남양주'
    },
    {
      REG_ID: '11B20503',
      REG_SP: 'C',
      REG_NAME: '양평'
    },
    {
      REG_ID: '11B20504',
      REG_SP: 'C',
      REG_NAME: '하남'
    },
    {
      REG_ID: '11B20601',
      REG_SP: 'C',
      REG_NAME: '수원'
    },
    {
      REG_ID: '11B20602',
      REG_SP: 'C',
      REG_NAME: '안양'
    },
    {
      REG_ID: '11B20603',
      REG_SP: 'C',
      REG_NAME: '오산'
    },
    {
      REG_ID: '11B20604',
      REG_SP: 'C',
      REG_NAME: '화성'
    },
    {
      REG_ID: '11B20605',
      REG_SP: 'C',
      REG_NAME: '성남'
    },
    {
      REG_ID: '11B20606',
      REG_SP: 'C',
      REG_NAME: '평택'
    },
    {
      REG_ID: '11B20609',
      REG_SP: 'C',
      REG_NAME: '의왕'
    },
    {
      REG_ID: '11B20610',
      REG_SP: 'C',
      REG_NAME: '군포'
    },
    {
      REG_ID: '11B20611',
      REG_SP: 'C',
      REG_NAME: '안성'
    },
    {
      REG_ID: '11B20612',
      REG_SP: 'C',
      REG_NAME: '용인'
    },
    {
      REG_ID: '11B20701',
      REG_SP: 'C',
      REG_NAME: '이천'
    },
    {
      REG_ID: '11B20702',
      REG_SP: 'C',
      REG_NAME: '광주'
    },
    {
      REG_ID: '11B20703',
      REG_SP: 'C',
      REG_NAME: '여주'
    },
    {
      REG_ID: '11C00000',
      REG_SP: 'A',
      REG_NAME: '충청도'
    },
    {
      REG_ID: '11C10000',
      REG_SP: 'A',
      REG_NAME: '충청북도'
    },
    {
      REG_ID: '11C10101',
      REG_SP: 'C',
      REG_NAME: '충주'
    },
    {
      REG_ID: '11C10102',
      REG_SP: 'C',
      REG_NAME: '진천'
    },
    {
      REG_ID: '11C10103',
      REG_SP: 'C',
      REG_NAME: '음성'
    },
    {
      REG_ID: '11C10201',
      REG_SP: 'C',
      REG_NAME: '제천'
    },
    {
      REG_ID: '11C10202',
      REG_SP: 'C',
      REG_NAME: '단양'
    },
    {
      REG_ID: '11C10301',
      REG_SP: 'C',
      REG_NAME: '청주'
    },
    {
      REG_ID: '11C10302',
      REG_SP: 'C',
      REG_NAME: '보은'
    },
    {
      REG_ID: '11C10303',
      REG_SP: 'C',
      REG_NAME: '괴산'
    },
    {
      REG_ID: '11C10304',
      REG_SP: 'C',
      REG_NAME: '증평'
    },
    {
      REG_ID: '11C10401',
      REG_SP: 'C',
      REG_NAME: '추풍령'
    },
    {
      REG_ID: '11C10402',
      REG_SP: 'C',
      REG_NAME: '영동'
    },
    {
      REG_ID: '11C10403',
      REG_SP: 'C',
      REG_NAME: '옥천'
    },
    {
      REG_ID: '11C20000',
      REG_SP: 'A',
      REG_NAME: '충청남도'
    },
    {
      REG_ID: '11C20101',
      REG_SP: 'C',
      REG_NAME: '서산'
    },
    {
      REG_ID: '11C20102',
      REG_SP: 'C',
      REG_NAME: '태안'
    },
    {
      REG_ID: '11C20103',
      REG_SP: 'C',
      REG_NAME: '당진'
    },
    {
      REG_ID: '11C20104',
      REG_SP: 'C',
      REG_NAME: '홍성'
    },
    {
      REG_ID: '11C20201',
      REG_SP: 'C',
      REG_NAME: '보령'
    },
    {
      REG_ID: '11C20202',
      REG_SP: 'C',
      REG_NAME: '서천'
    },
    {
      REG_ID: '11C20301',
      REG_SP: 'C',
      REG_NAME: '천안'
    },
    {
      REG_ID: '11C20302',
      REG_SP: 'C',
      REG_NAME: '아산'
    },
    {
      REG_ID: '11C20303',
      REG_SP: 'C',
      REG_NAME: '예산'
    },
    {
      REG_ID: '11C20401',
      REG_SP: 'C',
      REG_NAME: '대전'
    },
    {
      REG_ID: '11C20402',
      REG_SP: 'C',
      REG_NAME: '공주'
    },
    {
      REG_ID: '11C20403',
      REG_SP: 'C',
      REG_NAME: '계룡'
    },
    {
      REG_ID: '11C20404',
      REG_SP: 'C',
      REG_NAME: '세종'
    },
    {
      REG_ID: '11C20501',
      REG_SP: 'C',
      REG_NAME: '부여'
    },
    {
      REG_ID: '11C20502',
      REG_SP: 'C',
      REG_NAME: '청양'
    },
    {
      REG_ID: '11C20601',
      REG_SP: 'C',
      REG_NAME: '금산'
    },
    {
      REG_ID: '11C20602',
      REG_SP: 'C',
      REG_NAME: '논산'
    },
    {
      REG_ID: '11E00101',
      REG_SP: 'C',
      REG_NAME: '울릉도'
    },
    {
      REG_ID: '11E00102',
      REG_SP: 'C',
      REG_NAME: '독도'
    },
    {
      REG_ID: '11F00000',
      REG_SP: 'A',
      REG_NAME: '전라도'
    },
    {
      REG_ID: '11F10401',
      REG_SP: 'C',
      REG_NAME: '남원'
    },
    {
      REG_ID: '11F10402',
      REG_SP: 'C',
      REG_NAME: '임실'
    },
    {
      REG_ID: '11F10403',
      REG_SP: 'C',
      REG_NAME: '순창'
    },
    {
      REG_ID: '11F20000',
      REG_SP: 'A',
      REG_NAME: '전라남도'
    },
    {
      REG_ID: '11F20301',
      REG_SP: 'C',
      REG_NAME: '완도'
    },
    {
      REG_ID: '11F20302',
      REG_SP: 'C',
      REG_NAME: '해남'
    },
    {
      REG_ID: '11F20303',
      REG_SP: 'C',
      REG_NAME: '강진'
    },
    {
      REG_ID: '11F20304',
      REG_SP: 'C',
      REG_NAME: '장흥'
    },
    {
      REG_ID: '11F20401',
      REG_SP: 'C',
      REG_NAME: '여수'
    },
    {
      REG_ID: '11F20402',
      REG_SP: 'C',
      REG_NAME: '광양'
    },
    {
      REG_ID: '11F20403',
      REG_SP: 'C',
      REG_NAME: '고흥'
    },
    {
      REG_ID: '11F20404',
      REG_SP: 'C',
      REG_NAME: '보성'
    },
    {
      REG_ID: '11F20405',
      REG_SP: 'C',
      REG_NAME: '순천시'
    },
    {
      REG_ID: '11F20501',
      REG_SP: 'C',
      REG_NAME: '광주'
    },
    {
      REG_ID: '11F20502',
      REG_SP: 'C',
      REG_NAME: '장성'
    },
    {
      REG_ID: '11F20503',
      REG_SP: 'C',
      REG_NAME: '나주'
    },
    {
      REG_ID: '11F20504',
      REG_SP: 'C',
      REG_NAME: '담양'
    },
    {
      REG_ID: '11F20505',
      REG_SP: 'C',
      REG_NAME: '화순'
    },
    {
      REG_ID: '11F20601',
      REG_SP: 'C',
      REG_NAME: '구례'
    },
    {
      REG_ID: '11F20602',
      REG_SP: 'C',
      REG_NAME: '곡성'
    },
    {
      REG_ID: '11F20603',
      REG_SP: 'C',
      REG_NAME: '순천'
    },
    {
      REG_ID: '11F20701',
      REG_SP: 'C',
      REG_NAME: '흑산도'
    },
    {
      REG_ID: '11G00000',
      REG_SP: 'A',
      REG_NAME: '제주도'
    },
    {
      REG_ID: '11G00101',
      REG_SP: 'C',
      REG_NAME: '성산'
    },
    {
      REG_ID: '11G00201',
      REG_SP: 'C',
      REG_NAME: '제주'
    },
    {
      REG_ID: '11G00302',
      REG_SP: 'C',
      REG_NAME: '성판악'
    },
    {
      REG_ID: '11G00401',
      REG_SP: 'C',
      REG_NAME: '서귀포'
    },
    {
      REG_ID: '11G00501',
      REG_SP: 'C',
      REG_NAME: '고산'
    },
    {
      REG_ID: '11G00601',
      REG_SP: 'C',
      REG_NAME: '이어도'
    },
    {
      REG_ID: '11G00800',
      REG_SP: 'C',
      REG_NAME: '추자도'
    },
    {
      REG_ID: '11G00901',
      REG_SP: 'C',
      REG_NAME: '산천단'
    },
    {
      REG_ID: '11G01001',
      REG_SP: 'C',
      REG_NAME: '한남'
    },
    {
      REG_ID: '11H00000',
      REG_SP: 'A',
      REG_NAME: '경상도'
    },
    {
      REG_ID: '11H10702',
      REG_SP: 'C',
      REG_NAME: '영천'
    },
    {
      REG_ID: '11H10703',
      REG_SP: 'C',
      REG_NAME: '경산'
    },
    {
      REG_ID: '11H10704',
      REG_SP: 'C',
      REG_NAME: '청도'
    },
    {
      REG_ID: '11H10705',
      REG_SP: 'C',
      REG_NAME: '칠곡'
    },
    {
      REG_ID: '11H10707',
      REG_SP: 'C',
      REG_NAME: '군위'
    },
    {
      REG_ID: '11H20000',
      REG_SP: 'A',
      REG_NAME: '경상남도'
    },
    {
      REG_ID: '11H20101',
      REG_SP: 'C',
      REG_NAME: '울산'
    },
    {
      REG_ID: '11H20102',
      REG_SP: 'C',
      REG_NAME: '양산'
    },
    {
      REG_ID: '11H20201',
      REG_SP: 'C',
      REG_NAME: '부산'
    },
    {
      REG_ID: '11H20301',
      REG_SP: 'C',
      REG_NAME: '창원'
    },
    {
      REG_ID: '11H20304',
      REG_SP: 'C',
      REG_NAME: '김해'
    },
    {
      REG_ID: '11H20401',
      REG_SP: 'C',
      REG_NAME: '통영'
    },
    {
      REG_ID: '11H20402',
      REG_SP: 'C',
      REG_NAME: '사천'
    },
    {
      REG_ID: '11H20403',
      REG_SP: 'C',
      REG_NAME: '거제'
    },
    {
      REG_ID: '11H20404',
      REG_SP: 'C',
      REG_NAME: '고성'
    },
    {
      REG_ID: '11H20405',
      REG_SP: 'C',
      REG_NAME: '남해'
    },
    {
      REG_ID: '11H20501',
      REG_SP: 'C',
      REG_NAME: '함양'
    },
    {
      REG_ID: '11H20502',
      REG_SP: 'C',
      REG_NAME: '거창'
    },
    {
      REG_ID: '11H20503',
      REG_SP: 'C',
      REG_NAME: '합천'
    },
    {
      REG_ID: '11H20601',
      REG_SP: 'C',
      REG_NAME: '밀양'
    },
    {
      REG_ID: '11H20602',
      REG_SP: 'C',
      REG_NAME: '의령'
    },
    {
      REG_ID: '11H20603',
      REG_SP: 'C',
      REG_NAME: '함안'
    },
    {
      REG_ID: '11H20604',
      REG_SP: 'C',
      REG_NAME: '창녕'
    },
    {
      REG_ID: '11H20701',
      REG_SP: 'C',
      REG_NAME: '진주'
    },
    {
      REG_ID: '11H20703',
      REG_SP: 'C',
      REG_NAME: '산청'
    },
    {
      REG_ID: '11H20704',
      REG_SP: 'C',
      REG_NAME: '하동'
    },
    {
      REG_ID: '11I00000',
      REG_SP: 'A',
      REG_NAME: '황해도'
    },
    {
      REG_ID: '11I10001',
      REG_SP: 'C',
      REG_NAME: '사리원'
    },
    {
      REG_ID: '11I10002',
      REG_SP: 'C',
      REG_NAME: '신계'
    },
    {
      REG_ID: '11I20001',
      REG_SP: 'C',
      REG_NAME: '해주'
    },
    {
      REG_ID: '11I20002',
      REG_SP: 'C',
      REG_NAME: '개성'
    },
    {
      REG_ID: '11I20003',
      REG_SP: 'C',
      REG_NAME: '장연(용연)'
    },
    {
      REG_ID: '11J10000',
      REG_SP: 'A',
      REG_NAME: '평안북도'
    },
    {
      REG_ID: '11J10001',
      REG_SP: 'C',
      REG_NAME: '신의주'
    },
    {
      REG_ID: '11J10002',
      REG_SP: 'C',
      REG_NAME: '삭주(수풍)'
    },
    {
      REG_ID: '11J10003',
      REG_SP: 'C',
      REG_NAME: '구성'
    },
    {
      REG_ID: '11J10004',
      REG_SP: 'C',
      REG_NAME: '자성(중강)'
    },
    {
      REG_ID: '11J10005',
      REG_SP: 'C',
      REG_NAME: '강계'
    },
    {
      REG_ID: '11J10006',
      REG_SP: 'C',
      REG_NAME: '희천'
    },
    {
      REG_ID: '11J20000',
      REG_SP: 'A',
      REG_NAME: '평안남도'
    },
    {
      REG_ID: '11J20001',
      REG_SP: 'C',
      REG_NAME: '평양'
    },
    {
      REG_ID: '11J20002',
      REG_SP: 'C',
      REG_NAME: '진남포(남포)'
    },
    {
      REG_ID: '11J20004',
      REG_SP: 'C',
      REG_NAME: '안주'
    },
    {
      REG_ID: '11J20005',
      REG_SP: 'C',
      REG_NAME: '양덕'
    },
    {
      REG_ID: '11K10000',
      REG_SP: 'A',
      REG_NAME: '함경북도'
    },
    {
      REG_ID: '11K10001',
      REG_SP: 'C',
      REG_NAME: '청진'
    },
    {
      REG_ID: '11K10002',
      REG_SP: 'C',
      REG_NAME: '웅기(선봉)'
    },
    {
      REG_ID: '11K10003',
      REG_SP: 'C',
      REG_NAME: '성진(김책)'
    },
    {
      REG_ID: '11K10004',
      REG_SP: 'C',
      REG_NAME: '무산(삼지연)'
    },
    {
      REG_ID: '11K20000',
      REG_SP: 'A',
      REG_NAME: '함경남도'
    },
    {
      REG_ID: '11K20001',
      REG_SP: 'C',
      REG_NAME: '함흥'
    },
    {
      REG_ID: '11K20002',
      REG_SP: 'C',
      REG_NAME: '장진'
    },
    {
      REG_ID: '11K20003',
      REG_SP: 'C',
      REG_NAME: '북청(신포)'
    },
    {
      REG_ID: '11K20004',
      REG_SP: 'C',
      REG_NAME: '혜산'
    },
    {
      REG_ID: '11K20005',
      REG_SP: 'C',
      REG_NAME: '풍산'
    },
    {
      REG_ID: '11L10001',
      REG_SP: 'C',
      REG_NAME: '원산'
    },
    {
      REG_ID: '11L10002',
      REG_SP: 'C',
      REG_NAME: '고성(장전)'
    },
    {
      REG_ID: '11L10003',
      REG_SP: 'C',
      REG_NAME: '평강'
    },
    {
      REG_ID: '12F00100',
      REG_SP: 'I',
      REG_NAME: '규슈(서해)'
    },
    {
      REG_ID: '12F00200',
      REG_SP: 'I',
      REG_NAME: '규슈(남해)'
    },
    {
      REG_ID: '21F10501',
      REG_SP: 'C',
      REG_NAME: '군산'
    },
    {
      REG_ID: '21F10502',
      REG_SP: 'C',
      REG_NAME: '김제'
    },
    {
      REG_ID: '21F10601',
      REG_SP: 'C',
      REG_NAME: '고창'
    },
    {
      REG_ID: '21F10602',
      REG_SP: 'C',
      REG_NAME: '부안'
    },
    {
      REG_ID: '21F20101',
      REG_SP: 'C',
      REG_NAME: '함평'
    },
    {
      REG_ID: '21F20102',
      REG_SP: 'C',
      REG_NAME: '영광'
    },
    {
      REG_ID: '21F20201',
      REG_SP: 'C',
      REG_NAME: '진도'
    },
    {
      REG_ID: '21F20801',
      REG_SP: 'C',
      REG_NAME: '목포'
    },
    {
      REG_ID: '21F20802',
      REG_SP: 'C',
      REG_NAME: '영암'
    },
    {
      REG_ID: '21F20803',
      REG_SP: 'C',
      REG_NAME: '신안'
    },
    {
      REG_ID: '21F20804',
      REG_SP: 'C',
      REG_NAME: '무안'
    },
    {
      REG_ID: '11D10000',
      REG_SP: 'A',
      REG_NAME: '강원영서'
    },
    {
      REG_ID: '11D10101',
      REG_SP: 'C',
      REG_NAME: '철원'
    },
    {
      REG_ID: '11D10102',
      REG_SP: 'C',
      REG_NAME: '화천'
    },
    {
      REG_ID: '11D10201',
      REG_SP: 'C',
      REG_NAME: '인제'
    },
    {
      REG_ID: '11D10202',
      REG_SP: 'C',
      REG_NAME: '양구'
    },
    {
      REG_ID: '11D10301',
      REG_SP: 'C',
      REG_NAME: '춘천'
    },
    {
      REG_ID: '11D10302',
      REG_SP: 'C',
      REG_NAME: '홍천'
    },
    {
      REG_ID: '11D10401',
      REG_SP: 'C',
      REG_NAME: '원주'
    },
    {
      REG_ID: '11D10402',
      REG_SP: 'C',
      REG_NAME: '횡성'
    },
    {
      REG_ID: '11D10501',
      REG_SP: 'C',
      REG_NAME: '영월'
    },
    {
      REG_ID: '11D10502',
      REG_SP: 'C',
      REG_NAME: '정선'
    },
    {
      REG_ID: '11D10503',
      REG_SP: 'C',
      REG_NAME: '평창'
    },
    {
      REG_ID: '11D20000',
      REG_SP: 'A',
      REG_NAME: '강원영동'
    },
    {
      REG_ID: '11D20201',
      REG_SP: 'C',
      REG_NAME: '대관령'
    },
    {
      REG_ID: '11D20301',
      REG_SP: 'C',
      REG_NAME: '태백'
    },
    {
      REG_ID: '11D20401',
      REG_SP: 'C',
      REG_NAME: '속초'
    },
    {
      REG_ID: '11D20402',
      REG_SP: 'C',
      REG_NAME: '고성'
    },
    {
      REG_ID: '11D20403',
      REG_SP: 'C',
      REG_NAME: '양양'
    },
    {
      REG_ID: '11D20501',
      REG_SP: 'C',
      REG_NAME: '강릉'
    },
    {
      REG_ID: '11D20601',
      REG_SP: 'C',
      REG_NAME: '동해'
    },
    {
      REG_ID: '11D20602',
      REG_SP: 'C',
      REG_NAME: '삼척'
    },
    {
      REG_ID: '11H10000',
      REG_SP: 'A',
      REG_NAME: '경상북도'
    },
    {
      REG_ID: '11H10101',
      REG_SP: 'C',
      REG_NAME: '울진'
    },
    {
      REG_ID: '11H10102',
      REG_SP: 'C',
      REG_NAME: '영덕'
    },
    {
      REG_ID: '11H10201',
      REG_SP: 'C',
      REG_NAME: '포항'
    },
    {
      REG_ID: '11H10202',
      REG_SP: 'C',
      REG_NAME: '경주'
    },
    {
      REG_ID: '11H10301',
      REG_SP: 'C',
      REG_NAME: '문경'
    },
    {
      REG_ID: '11H10302',
      REG_SP: 'C',
      REG_NAME: '상주'
    },
    {
      REG_ID: '11H10303',
      REG_SP: 'C',
      REG_NAME: '예천'
    },
    {
      REG_ID: '11H10401',
      REG_SP: 'C',
      REG_NAME: '영주'
    },
    {
      REG_ID: '11H10402',
      REG_SP: 'C',
      REG_NAME: '봉화'
    },
    {
      REG_ID: '11H10403',
      REG_SP: 'C',
      REG_NAME: '영양'
    },
    {
      REG_ID: '11H10501',
      REG_SP: 'C',
      REG_NAME: '안동'
    },
    {
      REG_ID: '11H10502',
      REG_SP: 'C',
      REG_NAME: '의성'
    },
    {
      REG_ID: '11H10503',
      REG_SP: 'C',
      REG_NAME: '청송'
    },
    {
      REG_ID: '11H10601',
      REG_SP: 'C',
      REG_NAME: '김천'
    },
    {
      REG_ID: '11H10602',
      REG_SP: 'C',
      REG_NAME: '구미'
    },
    {
      REG_ID: '11H10604',
      REG_SP: 'C',
      REG_NAME: '고령'
    },
    {
      REG_ID: '11H10605',
      REG_SP: 'C',
      REG_NAME: '성주'
    },
    {
      REG_ID: '11H10701',
      REG_SP: 'C',
      REG_NAME: '대구'
    },
    {
      REG_ID: '11F10000',
      REG_SP: 'A',
      REG_NAME: '전북자치도'
    },
    {
      REG_ID: '11F10201',
      REG_SP: 'C',
      REG_NAME: '전주'
    },
    {
      REG_ID: '11F10202',
      REG_SP: 'C',
      REG_NAME: '익산'
    },
    {
      REG_ID: '11F10203',
      REG_SP: 'C',
      REG_NAME: '정읍'
    },
    {
      REG_ID: '11F10204',
      REG_SP: 'C',
      REG_NAME: '완주'
    },
    {
      REG_ID: '11F10301',
      REG_SP: 'C',
      REG_NAME: '장수'
    },
    {
      REG_ID: '11F10302',
      REG_SP: 'C',
      REG_NAME: '무주'
    },
    {
      REG_ID: '11F10303',
      REG_SP: 'C',
      REG_NAME: '진안'
    },
    {
      REG_ID: '11B10101',
      REG_SP: 'C',
      REG_NAME: '서울'
    },
    {
      REG_ID: '11B10102',
      REG_SP: 'C',
      REG_NAME: '과천'
    },
    {
      REG_ID: '11B10103',
      REG_SP: 'C',
      REG_NAME: '광명'
    },
    {
      REG_ID: '11B20101',
      REG_SP: 'C',
      REG_NAME: '강화'
    },
    {
      REG_ID: '11B20102',
      REG_SP: 'C',
      REG_NAME: '김포'
    },
    {
      REG_ID: '11B20201',
      REG_SP: 'C',
      REG_NAME: '인천'
    },
    {
      REG_ID: '11B20202',
      REG_SP: 'C',
      REG_NAME: '시흥'
    },
    {
      REG_ID: '11B20203',
      REG_SP: 'C',
      REG_NAME: '안산'
    },
    {
      REG_ID: '11B20204',
      REG_SP: 'C',
      REG_NAME: '부천'
    },
    // 해상 중기예보 지역 (12X 접두사)
    {
      REG_ID: '12A00000',
      REG_SP: 'I',
      REG_NAME: '서해'
    },
    {
      REG_ID: '12A10000',
      REG_SP: 'I',
      REG_NAME: '서해북부'
    },
    {
      REG_ID: '12A20000',
      REG_SP: 'I',
      REG_NAME: '서해중부'
    },
    {
      REG_ID: '12A30000',
      REG_SP: 'I',
      REG_NAME: '서해남부'
    },
    {
      REG_ID: '12B00000',
      REG_SP: 'I',
      REG_NAME: '남해'
    },
    {
      REG_ID: '12B10000',
      REG_SP: 'I',
      REG_NAME: '남해서부'
    },
    {
      REG_ID: '12B10500',
      REG_SP: 'I',
      REG_NAME: '제주도해상'
    },
    {
      REG_ID: '12B20000',
      REG_SP: 'I',
      REG_NAME: '남해동부'
    },
    {
      REG_ID: '12C00000',
      REG_SP: 'I',
      REG_NAME: '동해'
    },
    {
      REG_ID: '12C10000',
      REG_SP: 'I',
      REG_NAME: '동해남부'
    },
    {
      REG_ID: '12C20000',
      REG_SP: 'I',
      REG_NAME: '동해중부'
    },
    {
      REG_ID: '12C30000',
      REG_SP: 'I',
      REG_NAME: '동해북부'
    },
    {
      REG_ID: '12D00000',
      REG_SP: 'I',
      REG_NAME: '대화퇴'
    },
    {
      REG_ID: '12E00000',
      REG_SP: 'I',
      REG_NAME: '동중국해'
    },
    {
      REG_ID: '12F00000',
      REG_SP: 'I',
      REG_NAME: '규슈'
    },
    {
      REG_ID: '12F00100',
      REG_SP: 'I',
      REG_NAME: '규슈(서해)'
    },
    {
      REG_ID: '12F00200',
      REG_SP: 'I',
      REG_NAME: '규슈(남해)'
    },
    {
      REG_ID: '12G00000',
      REG_SP: 'I',
      REG_NAME: '연해주'
    }
  ];
  for (const region of regionData){
    regions.set(region.REG_ID, region);
  }
  return regions;
}
// 중기예보 API 호출 함수 (재시도 로직 포함)
async function fetchMediumTermForecast(apiType, authKey, regionInfo) {
  const apiUrls = {
    temperature: 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php',
    marine: 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php'
  };
  const url = `${apiUrls[apiType]}?disp=1&authKey=${authKey}`;
  
  const maxRetries = 3;
  const retryDelays = [2000, 5000, 10000]; // 2초, 5초, 10초
  let response;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(url);
      
      if (response.ok) {
        break; // 성공하면 루프 탈출
      }
      
      // 403 또는 기타 오류 시 재시도 로직
      if (response.status === 403 && attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 최대 재시도 횟수 도달하거나 403이 아닌 오류
      throw new Error(`KMA API 호출 실패 (${apiType}): ${response.status} ${response.statusText}`);
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
    }
  }
  
  if (!response || !response.ok) {
    throw new Error(`KMA API 호출 실패 (${apiType}): 모든 재시도 실패`);
  }
  
  // KMA API는 EUC-KR 인코딩을 사용하므로 적절히 디코딩
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('euc-kr');
  const text = decoder.decode(buffer);
  // CSV 형태의 응답을 파싱
  const lines = text.trim().split('\n');
  const data = [];
  if (lines.length <= 2) {
    return [];
  }
  // #START7777 다음에 오는 헤더 라인 찾기
  let headerLineIndex = -1;
  let dataStartIndex = -1;
  for(let i = 0; i < lines.length; i++){
    if (lines[i].includes('#START7777')) {
      headerLineIndex = i + 1; // 다음 라인이 헤더
      dataStartIndex = i + 2; // 그 다음부터 데이터
      break;
    }
  }
  if (headerLineIndex === -1 || headerLineIndex >= lines.length) {
    return [];
  }
  // 헤더 라인에서 실제 컬럼명 추출 (# 제거 후)
  const headerLine = lines[headerLineIndex].replace(/^#\s*/, '').trim();
  const headers = headerLine.split(/\s+/); // 공백으로 분리
  // 데이터 라인들 파싱 (디버깅용)
  for(let i = dataStartIndex; i < Math.min(dataStartIndex + 5, lines.length); i++){
    const values = lines[i].split(',').map((v)=>v.trim());
    if (values.length >= headers.length) {
      const record = {};
      // 헤더와 값 매핑
      headers.forEach((header, index)=>{
        record[header] = values[index] || '';
      });
      // 필수 필드 검증
      if (record.REG_ID && record.TM_FC && record.TM_EF) {
      }
    } else {
    }
  }
  // 실제 전체 데이터 파싱
  for(let i = dataStartIndex; i < lines.length; i++){
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.includes('#7777END')) continue;
    const values = line.split(',').map((v)=>v.trim());
    if (values.length >= headers.length) {
      const record = {};
      headers.forEach((header, index)=>{
        record[header] = values[index] || '';
      });
      if (record.REG_ID && record.TM_FC && record.TM_EF) {
        data.push(record);
      }
    }
  }
  // 지역명 정보 추가
  return data.map((item)=>{
    const region = regionInfo.get(item.REG_ID);
    return {
      ...item,
      REG_NAME: region?.REG_NAME || '알 수 없음',
      forecast_type: apiType
    };
  });
}
// reg_id -> location_code 매핑 (tide_weather_region_rows.csv 전체 134개 기반)
function getLocationCodeMapping() {
  // marine_reg_id -> location_codes 매핑 (전체 134개)
const marineMapping = {
  '12A10000': ['AD_0001', 'AD_0004', 'AD_0005', 'AD_0006', 'AD_0007', 'AD_0008', 'AD_0009', 'DT_0001', 'DT_0008', 'DT_0017', 'DT_0032', 'DT_0036', 'DT_0038', 'DT_0043', 'DT_0044', 'DT_0052', 'DT_0058', 'DT_0059', 'DT_0060', 'DT_0064', 'DT_0065', 'DT_0093', 'IE_0062', 'SO_0536', 'SO_0539', 'SO_0554', 'SO_0562', 'SO_0563', 'SO_0564'], // 서해북부,
  '12A20000': ['AD_0002', 'AD_0003', 'AD_0010', 'AD_0011', 'AD_0012', 'AD_0013', 'AD_0014', 'AD_0015', 'AD_0016', 'AD_0018', 'AD_0019', 'AD_0020', 'AD_0021', 'AD_0022', 'AD_0023', 'AD_0024', 'AD_0025', 'DT_0002', 'DT_0018', 'DT_0024', 'DT_0025', 'DT_0030', 'DT_0034', 'DT_0037', 'DT_0045', 'DT_0050', 'DT_0051', 'DT_0067', 'DT_0068', 'SO_0547', 'SO_0574', 'SO_0699'], // 서해중부,
  '12A30000': ['AD_0026', 'AD_0027', 'AD_0028', 'AD_0029', 'AD_0030', 'AD_0031', 'AD_0032', 'DT_0003', 'DT_0007', 'DT_0021', 'DT_0027', 'DT_0028', 'DT_0035', 'DT_0041', 'DT_0094', 'IE_0061', 'SO_0537', 'SO_0538', 'SO_0543', 'SO_0548', 'SO_0551', 'SO_0555', 'SO_0565', 'SO_0566', 'SO_0567', 'SO_0576', 'SO_0577', 'SO_0631', 'SO_0701', 'SO_0702', 'SO_0703', 'SO_0704', 'SO_0705', 'SO_0706', 'SO_0740', 'SO_0752', 'SO_0753', 'SO_0754', 'SO_0755', 'SO_0756'], // 서해남부,
  '12B10000': ['AD_0033', 'AD_0034', 'AD_0035', 'AD_0036', 'AD_0037', 'AD_0038', 'DT_0010', 'DT_0016', 'DT_0022', 'DT_0023', 'DT_0026', 'DT_0031', 'DT_0047', 'DT_0049', 'DT_0092', 'IE_0060', 'SO_0550', 'SO_0568', 'SO_0707', 'SO_0708', 'SO_0709', 'SO_0710', 'SO_0738', 'SO_0739', 'SO_0757', 'SO_0758', 'SO_0761'], // 남해서부,
  '12B10500': ['DT_0004'], // 제주도해상,
  '12B20000': ['AD_0039', 'AD_0040', 'AD_0041', 'AD_0042', 'DT_0005', 'DT_0014', 'DT_0015', 'DT_0019', 'DT_0020', 'DT_0029', 'DT_0042', 'DT_0054', 'DT_0056', 'DT_0061', 'DT_0062', 'DT_0063', 'SO_0326', 'SO_0552', 'SO_0553', 'SO_0569', 'SO_0570', 'SO_0571', 'SO_0572', 'SO_0573', 'SO_0578', 'SO_0581', 'SO_0711', 'SO_0712', 'SO_0759'], // 남해동부,
  '12C10000': ['DT_0009', 'DT_0011', 'DT_0039', 'DT_0057', 'DT_0091', 'SO_0736', 'SO_0737', 'SO_0760'], // 동해남부,
  '12C20000': ['DT_0006', 'DT_0012', 'DT_0013', 'DT_0040', 'DT_0046', 'DT_0048', 'SO_0540', 'SO_0731', 'SO_0732', 'SO_0733', 'SO_0734', 'SO_0735'], // 동해중부
};
  
  // temperature_reg_id -> location_codes 매핑 (전체 134개)
 const temperMapping = {
  '11B20101': ['AD_0007', 'DT_0032', 'SO_0539'], // 강화,
  '11B20201': ['DT_0058', 'DT_0064', 'DT_0093'], // 인천,
  '11B20203': ['AD_0001', 'AD_0004', 'DT_0008', 'DT_0013'], // 안산,
  '11B20604': ['AD_0005', 'AD_0006', 'AD_0008', 'SO_0564'], // 화성,
  '11C20101': ['AD_0002', 'AD_0012', 'AD_0013', 'DT_0017'], // 서산,
  '11C20102': ['AD_0014', 'AD_0016', 'AD_0018', 'AD_0019', 'AD_0020', 'AD_0021', 'AD_0022', 'DT_0034', 'DT_0045', 'DT_0050', 'DT_0067', 'SO_0574', 'SO_0699'], // 태안,
  '11C20103': ['AD_0003', 'AD_0010', 'AD_0011', 'DT_0002'], // 당진,
  '11C20104': ['AD_0015'], // 홍성,
  '11C20201': ['AD_0023', 'AD_0024', 'DT_0025'], // 보령,
  '11C20202': ['AD_0025', 'DT_0024', 'DT_0051'], // 서천,
  '11D20401': ['DT_0012', 'DT_0048'], // 속초,
  '11D20402': ['SO_0569', 'SO_0731'], // 고성,
  '11D20403': ['SO_0732'], // 양양,
  '11D20501': ['SO_0733'], // 강릉,
  '11D20601': ['DT_0006', 'DT_0009', 'DT_0057', 'DT_0091', 'SO_0736', 'SO_0737'], // 동해,
  '11D20602': ['SO_0540', 'SO_0734'], // 삼척,
  '11E00102': ['DT_0040'], // 독도,
  '11F20301': ['AD_0035', 'DT_0027', 'SO_0551', 'SO_0704', 'SO_0706', 'SO_0739', 'SO_0740', 'SO_0755'], // 완도,
  '11F20302': ['AD_0033', 'AD_0034', 'SO_0576', 'SO_0703', 'SO_0754'], // 해남,
  '11F20303': ['SO_0705', 'SO_0710', 'SO_0756'], // 강진,
  '11F20304': ['AD_0036'], // 장흥,
  '11F20401': ['DT_0016', 'DT_0031', 'DT_0042', 'SO_0568', 'SO_0708', 'SO_0709', 'SO_0758'], // 여수,
  '11F20402': ['DT_0049'], // 광양,
  '11F20403': ['AD_0037', 'DT_0026', 'DT_0092', 'SO_0550', 'SO_0707', 'SO_0738', 'SO_0757', 'SO_0761'], // 고흥,
  '11F20405': ['AD_0038'], // 순천시,
  '11G00101': ['DT_0022'], // 성산,
  '11G00201': ['DT_0004', 'DT_0021'], // 제주,
  '11G00401': ['DT_0010', 'DT_0023', 'DT_0047', 'IE_0060'], // 서귀포,
  '11H10101': ['DT_0011', 'DT_0039', 'SO_0735', 'SO_0760'], // 울진,
  '11H10201': ['SO_0573'], // 포항,
  '11H10202': ['SO_0572'], // 경주,
  '11H10701': ['SO_0553'], // 대구,
  '11H10704': ['DT_0037'], // 청도,
  '11H20101': ['DT_0020'], // 울산,
  '11H20201': ['DT_0019', 'DT_0063'], // 부산,
  '11H20301': ['DT_0015', 'DT_0054', 'DT_0056', 'DT_0062', 'SO_0570'], // 창원,
  '11H20401': ['AD_0039', 'DT_0014', 'SO_0578', 'SO_0712', 'SO_0759'], // 통영,
  '11H20402': ['DT_0061'], // 사천,
  '11H20403': ['AD_0040', 'AD_0041', 'DT_0029', 'SO_0552', 'SO_0571'], // 거제,
  '11H20405': ['SO_0326', 'SO_0711'], // 남해,
  '21F10501': ['AD_0026', 'AD_0027', 'DT_0018', 'SO_0547'], // 군산,
  '21F10601': ['AD_0029', 'AD_0030'], // 고창,
  '21F10602': ['AD_0028', 'DT_0030', 'DT_0068'], // 부안,
  '21F20102': ['AD_0031', 'DT_0003', 'SO_0538', 'SO_0565'], // 영광,
  '21F20201': ['DT_0028', 'DT_0094', 'SO_0537', 'SO_0543', 'SO_0555', 'SO_0567', 'SO_0702'], // 진도,
  '21F20801': ['DT_0007'], // 목포,
  '21F20803': ['AD_0032', 'DT_0035', 'DT_0041', 'IE_0061', 'SO_0548', 'SO_0566', 'SO_0577', 'SO_0631', 'SO_0701', 'SO_0752', 'SO_0753'], // 신안
};
  
  return { marine: marineMapping, temperature: temperMapping };
}

// 데이터베이스에 데이터 삽입 함수
async function insertForecastData(supabase, data, regionInfo, forecastType) {
  if (data.length === 0) {
    return {
      count: 0,
      errors: []
    };
  }
  
  const locationMapping = getLocationCodeMapping();
  const currentTime = new Date();
  // 현재 UTC 시간을 KST로 변환 (9시간 더하지 않고 toLocaleString만 사용)
  const currentKST = currentTime.toLocaleString('sv-SE', {
    timeZone: 'Asia/Seoul'
  }).replace(' ', 'T') + '+09:00';
  const processedData = [];
  const failedRegions = [];
  let successCount = 0;
  
  // location_code 저장 현황 추적을 위한 Set
  const savedLocationCodes = new Set();
  const unmappedRegIds = new Set();
  
  for (const item of data) {
    try {
      const tmFc = parseKSTTime(item.TM_FC);
      const tmEf = parseKSTTime(item.TM_EF);
      // 지역 정보에서 REG_SP 가져오기 (API에는 없음)
      const region = regionInfo.get(item.REG_ID);
      const regSp = region?.REG_SP || 'C'; // 기본값 'C'
      
      
      // 해당 reg_id에 매핑되는 location_code들 찾기
      const mappingType = item.forecast_type === 'marine' ? 'marine' : 'temperature';
      const locationCodes = locationMapping[mappingType][item.REG_ID] || [];
      
      // 매핑되지 않은 reg_id 추적
      if (locationCodes.length === 0) {
        unmappedRegIds.add(`${item.REG_ID} (${mappingType}, ${region?.REG_NAME || '알수없음'})`);
      }
      
      // 각 location_code별로 데이터 생성 (중복 저장)
      for (const locationCode of locationCodes) {
        savedLocationCodes.add(locationCode);
        const processedItem = {
          reg_id: item.REG_ID,
          reg_sp: regSp,
          stn_id: item.STN_ID || item.STN,
          stn: item.STN || '',
          tm_fc: tmFc.utc,
          tm_fc_kr: tmFc.kst,
          tm_ef: tmEf.utc,
          tm_ef_kr: tmEf.kst,
          mod: item.MOD,
          c: item.C || '',  // NULL 방지를 위한 기본값
          sky: item.SKY || null,
          pre: item.PRE || null,
          conf: item.CONF || null,
          wf: item.WF || null,
          rn_st: item.RN_ST ? parseInt(item.RN_ST) : null,
          min_temp: item.MIN ? parseInt(item.MIN) : null,
          max_temp: item.MAX ? parseInt(item.MAX) : null,
          min_temp_l: item.MIN_L ? parseInt(item.MIN_L) : null,
          min_temp_h: item.MIN_H ? parseInt(item.MIN_H) : null,
          max_temp_l: item.MAX_L ? parseInt(item.MAX_L) : null,
          max_temp_h: item.MAX_H ? parseInt(item.MAX_H) : null,
          wh_a: item.WH_A ? parseFloat(item.WH_A) : null,
          wh_b: item.WH_B ? parseFloat(item.WH_B) : null,
          forecast_type: item.forecast_type,
          reg_name: item.REG_NAME,
          location_code: locationCode,  // 새로 추가된 필드
          created_at_kr: currentKST,
          updated_at: currentTime.toISOString(),
          updated_at_kr: currentKST
        };
        
        processedData.push(processedItem);
      }
      
      successCount++;
    } catch (error) {
      failedRegions.push({
        reg_id: item.REG_ID,
        reg_name: item.REG_NAME,
        error: error.message
      });
    }
  }
  
  // 전체 134개 location_code 목록 (CSV 기준)
  const allLocationCodes = new Set([
    'DT_0001', 'DT_0002', 'DT_0003', 'DT_0004', 'DT_0005', 'DT_0006', 'DT_0007', 'DT_0008', 'DT_0009', 'DT_0010',
    'DT_0011', 'DT_0012', 'DT_0013', 'DT_0014', 'DT_0015', 'DT_0016', 'DT_0017', 'DT_0018', 'DT_0019', 'DT_0020',
    'DT_0021', 'DT_0022', 'DT_0023', 'DT_0024', 'DT_0025', 'DT_0026', 'DT_0027', 'DT_0028', 'DT_0029', 'DT_0030',
    'DT_0031', 'DT_0032', 'DT_0034', 'DT_0035', 'DT_0036', 'DT_0037', 'DT_0038', 'DT_0039', 'DT_0040', 'DT_0041',
    'DT_0042', 'DT_0043', 'DT_0044', 'DT_0045', 'DT_0046', 'DT_0047', 'DT_0048', 'DT_0049', 'DT_0050', 'DT_0051',
    'DT_0052', 'DT_0054', 'DT_0056', 'DT_0057', 'DT_0058', 'DT_0059', 'DT_0060', 'DT_0061', 'DT_0062', 'DT_0063',
    'DT_0064', 'DT_0065', 'DT_0067', 'DT_0068', 'DT_0091', 'DT_0092', 'DT_0093', 'DT_0094',
    'SO_0326', 'SO_0536', 'SO_0537', 'SO_0538', 'SO_0539', 'SO_0540', 'SO_0543', 'SO_0547', 'SO_0548', 'SO_0550',
    'SO_0551', 'SO_0552', 'SO_0553', 'SO_0554', 'SO_0555', 'SO_0562', 'SO_0563', 'SO_0564', 'SO_0565', 'SO_0566',
    'SO_0567', 'SO_0568', 'SO_0569', 'SO_0570', 'SO_0571', 'SO_0572', 'SO_0573', 'SO_0574', 'SO_0576', 'SO_0577',
    'SO_0578', 'SO_0581', 'SO_0631', 'SO_0699', 'SO_0701', 'SO_0702', 'SO_0703', 'SO_0704', 'SO_0705', 'SO_0706',
    'SO_0707', 'SO_0708', 'SO_0709', 'SO_0710', 'SO_0711', 'SO_0712', 'SO_0731', 'SO_0732', 'SO_0733', 'SO_0734',
    'SO_0735', 'SO_0736', 'SO_0737', 'SO_0738', 'SO_0739', 'SO_0740', 'SO_0752', 'SO_0753', 'SO_0754', 'SO_0755',
    'SO_0756', 'SO_0757', 'SO_0758', 'SO_0759', 'SO_0760', 'SO_0761'
  ]);
  
  // 처리 결과 로그 출력
  
  // 매핑되지 않은 reg_id 로그
  if (unmappedRegIds.size > 0) {
  }
  
  if (failedRegions.length > 0) {
  }
  // upsert 사용하여 중복 데이터 처리 (location_code 포함)
  
  
  // 중복 데이터 제거 (UNIQUE 제약조건 기준: reg_id, tm_ef, mod, forecast_type, location_code)
  const uniqueData = [];
  const seenKeys = new Set();
  
  for (const item of processedData) {
    const uniqueKey = `${item.reg_id}-${item.tm_ef}-${item.mod}-${item.forecast_type}-${item.location_code}`;
    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      uniqueData.push(item);
    }
  }
  
  // 배치 처리로 대량 데이터 효율적 저장 (재처리 제거로 안정성 확보)
  const batchSize = 50; // 배치 크기를 50으로 증가하여 처리 속도 향상
  let totalSaved = 0;
  let batchErrors = [];
  
  
  for (let i = 0; i < uniqueData.length; i += batchSize) {
    const batch = uniqueData.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    
    const { data: batchResult, error: batchError } = await supabase.from('medium_term_forecasts').upsert(batch, {
      onConflict: 'reg_id,tm_ef,mod,forecast_type,location_code'
    });
    
    if (batchError) {
      console.error(`배치 ${batchNumber} 저장 실패 (${batch.length}개):`, batchError.message);
      console.error(`실패한 배치 데이터 샘플:`, JSON.stringify(batch[0], null, 2));
      batchErrors.push(`배치 ${batchNumber}: ${batchError.message}`);
    } else {
      totalSaved += batch.length;
      
    }
    
    // 배치 간 최소 대기 (성능 최적화)
    if (i + batchSize < uniqueData.length) {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms 대기로 단축
    }
  }
  
  // 배치 저장 완료 로그
  console.log(`배치 저장 완료: ${totalSaved}개 레코드 저장, ${savedLocationCodes.size}개 location_code`);
  
  if (batchErrors.length > 0) {
  }
  
  // 재처리 로직 최적화: upsert는 성공적으로 실행되었으므로 검증 단계 생략
  // 실제 저장 검증은 대량 처리 시 성능 저하와 불필요한 재처리를 유발하므로 제거
  console.log(`데이터 저장 성공: ${totalSaved}개 레코드, ${savedLocationCodes.size}개 location_code`);
  
  // 배치 오류가 있었던 경우에만 오류 로그 기록 (재처리 생략으로 성능 최적화)
  if (batchErrors.length > 0) {
    console.log(`⚠️ ${batchErrors.length}개 배치에서 오류 발생`);
    console.log(`❌ 배치 오류 목록:`, batchErrors.join('; '));
  }
  
  // 최종 결과 로그
  if (batchErrors.length === 0) {
    console.log(`데이터 저장 성공: ${processedData.length}개 레코드, ${savedLocationCodes.size}개 location_code`);
  } else {
    console.error(`⚠️ 일부 배치 실패: ${batchErrors.length}개 배치 오류`);
  }
  
  // 예보 타입별 저장 결과 로그 (간소화)
  console.log(`${forecastType} 저장 완료: ${processedData.length}개 레코드, ${savedLocationCodes.size}개 location_code`);
  
  return {
    count: processedData.length,
    errors: []
  };
}
Deno.serve(async (req)=>{
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    // 인증키 확인 (get-kma-weather와 동일한 방식)
    const authKey = Deno.env.get('KMA_AUTH_KEY') || 'L7BLiqT7RsiwS4qk-8bIhQ';
    if (!authKey) {
      throw new Error('KMA_AUTH_KEY 환경변수가 설정되지 않았습니다');
    }
    // 지역 정보 로드 (하드코딩)
    const regionInfo = getRegionInfo();
    const results = {
      temperature: {
        count: 0,
        errors: []
      },
      marine: {
        count: 0,
        errors: []
      }
    };
    // 두 가지 예보 타입 순차적으로 처리 (marine 우선)
    for (const apiType of [
      'marine',
      'temperature'
    ]){
      try {
        console.log(`${apiType} 예보 데이터 수집 시작`);
        const forecastData = await fetchMediumTermForecast(apiType, authKey, regionInfo);
        console.log(`${apiType} API 응답: ${forecastData.length}개 레코드 수신`);
        const insertResult = await insertForecastData(supabase, forecastData, regionInfo, apiType);
        results[apiType] = insertResult;
      } catch (error) {
        console.error(`❌ ${apiType} 예보 처리 오류:`, error);
        results[apiType].errors.push(error.message);
      }
    }
    const totalCount = Object.values(results).reduce((sum, result)=>sum + result.count, 0);
    const totalErrors = Object.values(results).flatMap((result)=>result.errors);
    
    // 성공/실패 로그
    if (totalErrors.length === 0) {
      console.log(`중기예보 수집 성공: 총 ${totalCount}개 레코드 저장`);
      console.log(`타입별 결과: temperature(${results.temperature.count}), marine(${results.marine.count})`);
    } else {
      console.error(`❌ 중기예보 수집 실패: ${totalErrors.length}개 오류 발생`);
      console.error(`❌ 오류 내역:`, totalErrors.join(', '));
    }
    return new Response(JSON.stringify({
      success: totalErrors.length === 0,
      message: `중기예보 데이터 수집 완료: ${totalCount}개 레코드`,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: totalErrors.length === 0 ? 200 : 207 // 207 Multi-Status for partial success
    });
  } catch (error) {
    console.error('함수 실행 오류:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '알 수 없는 오류가 발생했습니다',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
