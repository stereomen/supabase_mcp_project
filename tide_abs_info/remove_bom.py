import sys
import os

def remove_bom_from_file(filename):
    """
    파일에서 UTF-8 BOM을 제거합니다.
    """
    # BOM 시그니처
    bom = b'\xef\xbb\xbf'
    
    try:
        with open(filename, 'rb') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"오류: '{filename}' 파일을 찾을 수 없습니다.")
        return

    if content.startswith(bom):
        # BOM이 있으면 제거하고 다시 쓴다
        content = content[len(bom):]
        try:
            with open(filename, 'wb') as f:
                f.write(content)
            print(f"성공: '{filename}' 파일에서 BOM을 제거했습니다.")
        except IOError as e:
            print(f"오류: '{filename}' 파일에 쓸 수 없습니다. 오류: {e}")
    else:
        print(f"정보: '{filename}' 파일에 BOM이 존재하지 않습니다.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python remove_bom.py <filename>")
        sys.exit(1)
    
    target_file = sys.argv[1]
    if not os.path.exists(target_file):
        print(f"오류: '{target_file}' 파일을 찾을 수 없습니다.")
        sys.exit(1)
        
    remove_bom_from_file(target_file)
