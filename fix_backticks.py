import re

filepath = r'c:\Users\Administrador\projetos-antigravity\compras-11.03\src\App.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace \` with just `
content = content.replace('\\\u0060', '\u0060')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(filepath, 'r', encoding='utf-8') as f:
    fixed = f.read()

count = fixed.count('\\\u0060')
print(f"Remaining escaped backticks: {count}")
print("Done!" if count == 0 else "Still has issues")
