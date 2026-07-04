import sys, shutil, openpyxl, json, os, re
sys.stdout.reconfigure(encoding='utf-8')

hsk_dir = 'D:/我的外国学生的汉语教学相关资料/steven（俄罗斯）汉语教学相关文件/HSK相关文件/'
tmp_dir = 'C:/tmp_hsk/'
os.makedirs(tmp_dir, exist_ok=True)

all_data = {}

for level in [1, 2, 3, 4, 5, 6]:
    src = hsk_dir + f'HSK词汇表-{level}级.xls'
    dst = tmp_dir + f'hsk{level}.xlsx'
    shutil.copy(src, dst)
    wb = openpyxl.load_workbook(dst, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    print(f'=== HSK{level}: {len(rows)} rows, {ws.max_column} cols ===')
    for r in rows[:6]:
        print(' ', r)
    print()
    all_data[level] = rows

print('Done reading all levels.')
