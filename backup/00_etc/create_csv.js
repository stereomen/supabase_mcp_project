const fs = require('fs');
const path = require('path');

const ALL_FIELDS = {
    'WH': '유의파고 (m)', 'WD': '풍향 (degree)', 'WS': '풍속 (m/s)',
    'WS_GST': 'GUST 풍속 (m/s)', 'TW': '해수면 온도 (C)', 'TA': '기온 (C)',
    'PA': '해면기압 (hPa)', 'HM': '상대습도 (%)'
};

// `abs_resion.info` 파일 파싱 (정확한 위치 기반)
function parseResion(filePath) {
    const stations = new Map();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    for (const line of lines) {
        if (line.startsWith('#') || !line.trim() || line.includes('STN_ID')) continue;

        // 각 필드의 정확한 시작/끝 위치를 사용하여 데이터 추출
        const stnId = line.substring(1, 6).trim();
        const lon = line.substring(8, 21).trim();
        const lat = line.substring(22, 35).trim();
        const stnKo = line.substring(60, 81).trim();
        const stnEn = line.substring(82, 103).trim();

        if (stnId && lon && lat) {
            stations.set(stnId, {
                stnKo: stnKo,
                stnEn: stnEn !== '----' ? stnEn : stnKo,
                lon: lon,
                lat: lat
            });
        }
    }
    return stations;
}

// `abs_api.info` 파일 파싱
function getApiAvailability(filePath) {
    const availability = new Map();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 14) continue;

        const stnId = parts[2];
        if (!availability.has(stnId)) {
            availability.set(stnId, {
                provided: new Set(),
                notProvided: new Set(Object.keys(ALL_FIELDS))
            });
        }

        const stationData = availability.get(stnId);
        const dataValues = {
            'WH': parts[5], 'WD': parts[6], 'WS': parts[7], 'WS_GST': parts[8],
            'TW': parts[9], 'TA': parts[10], 'PA': parts[11], 'HM': parts[12]
        };

        for (const [field, value] of Object.entries(dataValues)) {
            if (value !== '-99.0' && value !== '-99' && value !== '') {
                stationData.provided.add(field);
                stationData.notProvided.delete(field);
            }
        }
    }
    return availability;
}

// --- Main Execution ---
const workDir = '/config/workspace_tide/supabase_mcp_project';
const resionFile = path.join(workDir, 'abs_resion.info');
const apiFile = path.join(workDir, 'abs_api.info');
const outputCsvFile = path.join(workDir, 'abs_region_data_summary.csv');

const stationsInfo = parseResion(resionFile);
const availability = getApiAvailability(apiFile);

const outputData = [];
for (const [stnId, info] of stationsInfo.entries()) {
    const data = availability.get(stnId);
    let providedStr = '';
    let notProvidedStr = [...Object.keys(ALL_FIELDS)].sort().map(field => `${field}(${ALL_FIELDS[field]})`).join(' ');

    if (data) {
        providedStr = [...data.provided].sort().map(field => `${field}(${ALL_FIELDS[field]})`).join(' ');
        notProvidedStr = [...data.notProvided].sort().map(field => `${field}(${ALL_FIELDS[field]})`).join(' ');
    }

    outputData.push({
        '지역명(한글)': info.stnKo, '지역명(영문)': info.stnEn,
        '위도': info.lat, '경도': info.lon,
        '제공 정보': providedStr, '미제공 정보': notProvidedStr
    });
}

const header = ['지역명(한글)', '지역명(영문)', '위도', '경도', '제공 정보', '미제공 정보'].join(',');
const rows = outputData.map(d =>
    [ `"${d['지역명(한글)']}"`, `"${d['지역명(영문)']}"`, d['위도'], d['경도'], `"${d['제공 정보']}"`, `"${d['미제공 정보']}"` ].join(',')
);
const csvContent = [header, ...rows].join('\n');

fs.writeFileSync(outputCsvFile, '\uFEFF' + csvContent, { encoding: 'utf-8' });

console.log(`CSV 파일이 '${outputCsvFile}'로 성공적으로 생성 및 업데이트되었습니다. 총 ${outputData.length}개의 지역이 포함되었습니다.`);