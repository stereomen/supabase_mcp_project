// supabase/functions/cleanup-old-data/index.ts
// 30일 이상 경과한 오래된 데이터를 데이터베이스에서 삭제하는 함수
// Cron Job으로 스케줄링되어 주기적으로 실행됩니다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 보관 기간 (일)
const RETENTION_DAYS = 20;

/**
 * 각 테이블에서 삭제할 데이터의 설정
 */
const CLEANUP_CONFIGS = [
  { table: 'abs_fetch_log', dateColumn: 'request_time', dateFormat: 'YYYYMMDDHHMM', description: 'ABS 데이터 조회 로그' },
  { table: 'analysis_results', dateColumn: 'created_at', description: '분석 결과' },
  { table: 'data_collection_logs', dateColumn: 'collection_time', description: '데이터 수집 로그' },
  { table: 'marine_observations', dateColumn: 'created_at', description: '해양 관측 데이터' },
  { table: 'medium_term_forecasts', dateColumn: 'tm_fc_kr', description: '중기예보 데이터' },
  { table: 'openweathermap_collection_logs', dateColumn: 'created_at', description: 'OpenWeatherMap 수집 로그' },
  { table: 'openweathermap_data', dateColumn: 'created_at', description: 'OpenWeatherMap 데이터' },
  { table: 'weather_fetch_logs', dateColumn: 'created_at', description: '날씨 조회 로그' },
  { table: 'weather_forecasts', dateColumn: 'updated_at', description: '날씨 예보 데이터' },
  { table: 'weatherapi_collection_logs', dateColumn: 'created_at', description: 'WeatherAPI 수집 로그' },
  { table: 'weatherapi_data', dateColumn: 'updated_at', description: 'WeatherAPI 데이터' },
];

/**
 * 날짜를 YYYYMMDDHHMM 형식 문자열로 변환합니다.
 */
function formatDateAsYYYYMMDDHHMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}`;
}

/**
 * 특정 테이블에서 오래된 데이터를 삭제합니다.
 */
async function cleanupTable(
  supabase: any,
  tableName: string,
  dateColumn: string,
  description: string,
  dateFormat?: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    console.log(`[${tableName}] ${description} 정리 시작 (${RETENTION_DAYS}일 이상 경과)`);

    // 삭제 전 카운트 확인
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // 날짜 형식에 따라 비교값 설정
    const cutoffValue = dateFormat === 'YYYYMMDDHHMM'
      ? formatDateAsYYYYMMDDHHMM(cutoffDate)
      : cutoffDate.toISOString();

    console.log(`[${tableName}] 기준 날짜: ${cutoffValue} (${dateFormat || 'ISO'})`);

    const { count: beforeCount, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .lt(dateColumn, cutoffValue);

    if (countError) {
      console.error(`[${tableName}] 삭제 전 카운트 조회 실패:`, countError);
      return { success: false, deletedCount: 0, error: countError.message };
    }

    if (!beforeCount || beforeCount === 0) {
      console.log(`[${tableName}] 삭제할 데이터 없음`);
      return { success: true, deletedCount: 0 };
    }

    // 데이터 삭제 실행
    const { error: deleteError, count: deletedCount } = await supabase
      .from(tableName)
      .delete({ count: 'exact' })
      .lt(dateColumn, cutoffValue);

    if (deleteError) {
      console.error(`[${tableName}] 데이터 삭제 실패:`, deleteError);
      return { success: false, deletedCount: 0, error: deleteError.message };
    }

    console.log(`[${tableName}] ${deletedCount || 0}건 삭제 완료`);
    return { success: true, deletedCount: deletedCount || 0 };

  } catch (error) {
    console.error(`[${tableName}] 예상치 못한 오류:`, error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('========================================');
    console.log('오래된 데이터 정리 작업 시작');
    console.log(`보관 기간: ${RETENTION_DAYS}일`);
    console.log(`실행 시간: ${new Date().toISOString()}`);
    console.log('========================================');

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 각 테이블별로 정리 작업 실행
    const results = [];
    let totalDeleted = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const config of CLEANUP_CONFIGS) {
      const result = await cleanupTable(
        supabase,
        config.table,
        config.dateColumn,
        config.description,
        (config as any).dateFormat
      );

      results.push({
        table: config.table,
        description: config.description,
        ...result,
      });

      if (result.success) {
        successCount++;
        totalDeleted += result.deletedCount;
      } else {
        failureCount++;
      }
    }

    console.log('========================================');
    console.log('정리 작업 완료');
    console.log(`총 삭제: ${totalDeleted}건`);
    console.log(`성공: ${successCount}/${CLEANUP_CONFIGS.length} 테이블`);
    console.log(`실패: ${failureCount}/${CLEANUP_CONFIGS.length} 테이블`);
    console.log('========================================');

    // 응답 반환
    return new Response(
      JSON.stringify({
        success: true,
        message: '오래된 데이터 정리 완료',
        summary: {
          totalDeleted,
          successCount,
          failureCount,
          totalTables: CLEANUP_CONFIGS.length,
          retentionDays: RETENTION_DAYS,
        },
        details: results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('오래된 데이터 정리 중 오류 발생:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
