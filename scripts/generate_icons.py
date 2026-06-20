"""Generate Android launcher icons from resources/icon.png"""
from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, 'resources', 'icon.ico')
RES = os.path.join(BASE, 'android', 'app', 'src', 'main', 'res')

img = Image.open(SRC)
print(f'Source: {img.size} {img.mode}')

densities = {
    'mdpi': 48, 'hdpi': 72, 'xhdpi': 96,
    'xxhdpi': 144, 'xxxhdpi': 192,
}

for name, size in densities.items():
    d = os.path.join(RES, f'mipmap-{name}')
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, 'ic_launcher.png')
    img.resize((size, size), Image.LANCZOS).save(p, 'PNG')
    print(f'  {name}: {size}x{size} -> {p}')

print('Done!')
