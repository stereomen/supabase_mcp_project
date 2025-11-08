import csv
import sys

def remove_csv_columns(filename, columns_to_remove):
    """
    CSV 파일에서 지정된 열(column)들을 삭제합니다.
    """
    rows = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # 새로운 필드 이름 (삭제할 열 제외)
            fieldnames = [name for name in reader.fieldnames if name not in columns_to_remove]
            
            for row in reader:
                # 삭제할 열을 제외하고 새로운 딕셔너리 생성
                new_row = {key: value for key, value in row.items() if key in fieldnames}
                rows.append(new_row)

    except FileNotFoundError:
        print(f"오류: '{filename}' 파일을 찾을 수 없습니다.")
        return
    except Exception as e:
        print(f"파일을 읽는 중 오류 발생: {e}")
        return

    # 수정된 내용으로 다시 파일에 덮어쓰기
    try:
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"성공: '{filename}' 파일에서 ���음 열을 삭제했습니다: {', '.join(columns_to_remove)}")
    except IOError as e:
        print(f"오류: '{filename}' 파일에 쓸 수 없습니다. 오류: {e}")

if __name__ == "__main__":
    target_file = 'tide-abs_info_ab.csv'
    cols_to_delete = ['station_id', 'station_name', 'station_latitude', 'station_longitude']
    remove_csv_columns(target_file, cols_to_delete)
