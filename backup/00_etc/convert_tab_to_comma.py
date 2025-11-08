import csv
import sys

# 명령줄 인자에서 파일 이름 가져오기
if len(sys.argv) < 2:
    print("사용법: python convert_tab_to_comma.py <filename.csv>")
    sys.exit(1)

input_filename = sys.argv[1]
output_filename = input_filename # 같은 파일에 덮어쓰기

# 파일 읽기
lines = []
try:
    with open(input_filename, 'r', encoding='utf-8') as infile:
        for line in infile:
            # 각 줄의 탭을 쉼표로 교체
            lines.append(line.replace('	', ','))
except FileNotFoundError:
    print(f"오류: '{input_filename}' 파일을 찾을 수 없습니다.")
    exit()

# 파일 쓰기
try:
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        outfile.writelines(lines)
    print(f"'{output_filename}' 파일의 구분자를 탭에서 쉼표로 성공적으로 변경했습니다.")
except IOError:
    print(f"오류: '{output_filename}' 파일에 쓸 수 없습니다.")