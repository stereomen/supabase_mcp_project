const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iwpgvdtfpwazzfeniusk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cGd2ZHRmcHdhenpmZW5pdXNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA3MTM5NCwiZXhwIjoyMDY2NjQ3Mzk0fQ.DNYEYOBWemhE5sg5eZYd3PrRAq_W04nCBmuJdGSjIIc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTmFcKr() {
  console.log('=== tm_fc_kr로 발표시간 정확히 확인 ===\n');
  
  // 최근 데이터에서 tm_fc_kr별로 분석
  const { data, error } = await supabase
    .from('medium_term_forecasts')
    .select('tm_fc_kr, tm_ef_kr, forecast_type, created_at')
    .eq('forecast_type', 'marine')
    .not('tm_fc_kr', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('쿼리 오류:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`총 ${data.length}개 레코드 분석\n`);
    
    // tm_fc_kr별로 그룹화
    const groupedByTmFcKr = {};
    data.forEach(row => {
      const tmFcKr = row.tm_fc_kr;
      if (!groupedByTmFcKr[tmFcKr]) {
        groupedByTmFcKr[tmFcKr] = [];
      }
      groupedByTmFcKr[tmFcKr].push(row.tm_ef_kr);
    });
    
    // 발표시간별 분석
    Object.keys(groupedByTmFcKr).sort().reverse().forEach(tmFcKr => {
      const uniqueTmEfs = [...new Set(groupedByTmFcKr[tmFcKr])].sort();
      
      const fcDate = new Date(tmFcKr);
      const hour = fcDate.toLocaleString('ko-KR', { 
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });
      
      const announcement = fcDate.toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });
      
      const forecastStart = new Date(uniqueTmEfs[0]).toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });
      
      // 발표일과 예보 시작일 간의 차이 계산
      const announcementDate = new Date(fcDate.getFullYear(), fcDate.getMonth(), fcDate.getDate());
      const forecastStartDate = new Date(uniqueTmEfs[0]);
      const forecastDateOnly = new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth(), forecastStartDate.getDate());
      const daysDiff = Math.round((forecastDateOnly - announcementDate) / (1000 * 60 * 60 * 24));
      
      // 06:00 또는 18:00 구분
      const hourNum = fcDate.getHours();
      let timeLabel;
      if (hourNum === 6) timeLabel = '🌅 06:00 발표';
      else if (hourNum === 18) timeLabel = '🌆 18:00 발표';
      else timeLabel = `🕐 ${hour} 발표`;
      
      console.log(`${timeLabel}`);
      console.log(`   발표시간: ${announcement}`);
      console.log(`   예보시작: ${forecastStart}`);
      console.log(`   예보간격: 발표일 +${daysDiff}일 후부터`);
      console.log(`   예보횟수: ${uniqueTmEfs.length}개 시점`);
      
      // 첫 3개 예보시점 표시
      if (uniqueTmEfs.length > 3) {
        const first3 = uniqueTmEfs.slice(0, 3).map(t => 
          new Date(t).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit' })
        ).join(', ');
        console.log(`   시작 3개: ${first3}`);
      }
      console.log('');
    });
  } else {
    console.log('tm_fc_kr 데이터를 찾을 수 없습니다.');
  }
}

checkTmFcKr().catch(console.error);