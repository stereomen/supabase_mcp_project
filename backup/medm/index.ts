import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
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
  // KST 시간 생성 (Asia/Seoul 타임존)
  const kstDate = new Date(year, month - 1, day, hour, minute);
  // UTC로 변환 (KST는 UTC+9)
  const utcDate = new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
  // KST 타임존 정보를 포함한 문자열 생성
  const kstWithTz = new Date(kstDate.getTime()).toLocaleString('sv-SE', {
    timeZone: 'Asia/Seoul'
  }).replace(' ', 'T') + '+09:00';
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
  console.log(`지역 정보 ${regions.size}개 KMA 공식 데이터로 로드됨`);
  return regions;
}
// 중기예보 API 호출 함수
async function fetchMediumTermForecast(apiType, authKey, regionInfo) {
  const apiUrls = {
    land: 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_wl.php',
    temperature: 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_wc.php',
    marine: 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_wo.php'
  };
  const url = `${apiUrls[apiType]}?disp=1&authKey=${authKey}`;
  console.log(`Fetching ${apiType} forecast from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`KMA API 호출 실패 (${apiType}): ${response.status} ${response.statusText}`);
  }
  // KMA API는 EUC-KR 인코딩을 사용하므로 적절히 디코딩
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('euc-kr');
  const text = decoder.decode(buffer);
  console.log(`${apiType} 응답 길이:`, text.length);
  console.log(`${apiType} 응답 첫 500자:`, text.substring(0, 500));
  // CSV 형태의 응답을 파싱
  const lines = text.trim().split('\n');
  const data = [];
  console.log(`${apiType} 총 라인 수:`, lines.length);
  if (lines.length <= 2) {
    console.log(`${apiType} 예보: 데이터 없음`);
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
    console.log(`${apiType} 헤더를 찾을 수 없음`);
    return [];
  }
  // 헤더 라인에서 실제 컬럼명 추출 (# 제거 후)
  const headerLine = lines[headerLineIndex].replace(/^#\s*/, '').trim();
  const headers = headerLine.split(/\s+/); // 공백으로 분리
  console.log(`${apiType} 헤더:`, headers);
  console.log(`${apiType} 헤더 개수:`, headers.length);
  // 데이터 라인들 파싱 (디버깅용)
  for(let i = dataStartIndex; i < Math.min(dataStartIndex + 5, lines.length); i++){
    const values = lines[i].split(',').map((v)=>v.trim());
    console.log(`${apiType} 라인 ${i}:`, values.slice(0, 5), '...'); // 처음 5개 값만 로그
    if (values.length >= headers.length) {
      const record = {};
      // 헤더와 값 매핑
      headers.forEach((header, index)=>{
        record[header] = values[index] || '';
      });
      console.log(`${apiType} 파싱된 레코드:`, {
        REG_ID: record.REG_ID,
        TM_FC: record.TM_FC,
        TM_EF: record.TM_EF,
        MOD: record.MOD
      });
      // 필수 필드 검증
      if (record.REG_ID && record.TM_FC && record.TM_EF) {
        console.log(`${apiType} 유효한 레코드 발견!`);
      } else {
        console.log(`${apiType} 필수 필드 누락:`, record);
      }
    } else {
      console.log(`${apiType} 라인 ${i} 길이 불일치: 헤더=${headers.length}, 값=${values.length}`);
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
  console.log(`${apiType} 파싱된 데이터 개수:`, data.length);
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
// 데이터베이스에 데이터 삽입 함수
async function insertForecastData(supabase, data, regionInfo) {
  if (data.length === 0) {
    return {
      count: 0,
      errors: []
    };
  }
  const currentTime = new Date();
  const currentKST = new Date(currentTime.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00');
  const processedData = data.map((item)=>{
    const tmFc = parseKSTTime(item.TM_FC);
    const tmEf = parseKSTTime(item.TM_EF);
    // 지역 정보에서 REG_SP 가져오기 (API에는 없음)
    const region = regionInfo.get(item.REG_ID);
    const regSp = region?.REG_SP || 'C'; // 기본값 'C'
    console.log(`처리 중 REG_ID: ${item.REG_ID}, REG_SP: ${regSp}, REG_NAME: ${item.REG_NAME}`);
    return {
      reg_id: item.REG_ID,
      reg_sp: regSp,
      stn_id: item.STN_ID || item.STN,
      stn: item.STN || '',
      tm_fc: tmFc.utc,
      tm_fc_kr: tmFc.kst,
      tm_ef: tmEf.utc,
      tm_ef_kr: tmEf.kst,
      mod: item.MOD,
      c: item.C,
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
      created_at_kr: currentKST,
      updated_at: currentTime.toISOString(),
      updated_at_kr: currentKST
    };
  });
  // upsert 사용하여 중복 데이터 처리
  const { data: result, error } = await supabase.from('medium_term_forecasts').upsert(processedData, {
    onConflict: 'reg_id,tm_fc,tm_ef,mod,forecast_type',
    ignoreDuplicates: false
  });
  if (error) {
    console.error('데이터베이스 삽입 오류:', error);
    throw error;
  }
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
    console.log('중기예보 데이터 수집 시작...');
    // 지역 정보 로드 (하드코딩)
    const regionInfo = getRegionInfo();
    console.log(`지역 정보 ${regionInfo.size}개 로드됨`);
    const results = {
      land: {
        count: 0,
        errors: []
      },
      temperature: {
        count: 0,
        errors: []
      },
      marine: {
        count: 0,
        errors: []
      }
    };
    // 세 가지 예보 타입 순차적으로 처리
    for (const apiType of [
      'land',
      'temperature',
      'marine'
    ]){
      try {
        console.log(`${apiType} 예보 처리 중...`);
        const forecastData = await fetchMediumTermForecast(apiType, authKey, regionInfo);
        const insertResult = await insertForecastData(supabase, forecastData, regionInfo);
        results[apiType] = insertResult;
        console.log(`${apiType} 예보 완료: ${insertResult.count}개 레코드`);
      } catch (error) {
        console.error(`${apiType} 예보 처리 오류:`, error);
        results[apiType].errors.push(error.message);
      }
    }
    const totalCount = Object.values(results).reduce((sum, result)=>sum + result.count, 0);
    const totalErrors = Object.values(results).flatMap((result)=>result.errors);
    console.log(`중기예보 데이터 수집 완료: 총 ${totalCount}개 레코드`);
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
