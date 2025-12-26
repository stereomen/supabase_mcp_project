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
