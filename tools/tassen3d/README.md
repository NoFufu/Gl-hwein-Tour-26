# Tassen aus Blender

Die Klassik-Tasse wird in Blender modelliert (`klassik.py`) und als echtes 3D-Modell exportiert (`export-glb.py`).
Glasur, Goldrand, Aufdruck und Verschattung werden dabei in Texturen gebacken. Die App lädt `public/tassen3d/klassik.glb`
und beleuchtet es mit einem nachgebauten Fotostudio (`studio()` in `components/WinterCup.tsx`), so dass es dem Blender-Bild nahekommt.

```sh
python3 -m venv venv && venv/bin/pip install bpy fonttools brotli pillow numpy
# Schriften als TTF neben die Skripte legen (fraunces.ttf, inter.ttf, aus @fontsource-variable)
venv/bin/python aufdruck.py                               # label.png + orange.png
venv/bin/python klassik.py -- vorschau.png 1 64 690        # Standbild zum Prüfen (Cycles)
venv/bin/python export-glb.py -- klassik.glb 2048          # Modell mit gebackenen Texturen
```
