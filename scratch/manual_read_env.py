
from pathlib import Path
content = Path(r"d:\Leaf Creme\.env").read_text(encoding='utf-8')
print(f"Content length: {len(content)}")
print("First 50 chars:", repr(content[:50]))
for line in content.splitlines():
    if '=' in line:
        key, val = line.split('=', 1)
        print(f"Key: [{key}] Value: [{val}]")
