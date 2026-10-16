# Vorgerenderte Tassen (Blender)

Die Klassik-Tasse wird in Blender (Cycles) modelliert und als Drehung mit 36 Bildern gerendert.
Die App zeigt die Bilder aus `public/tassen3d/<variante>/NN.webp`; Three.js zeichnet nur noch den Dampf.

```sh
python3 -m venv venv && venv/bin/pip install bpy fonttools brotli pillow numpy
# Schriften als TTF neben die Skripte legen (fraunces.ttf, inter.ttf, aus @fontsource-variable)
venv/bin/python aufdruck.py                       # label.png + orange.png
venv/bin/python klassik.py -- "out/#.png" 36 64 560  # Ausgabe, Bilder, Samples, Breite
```

Danach die PNGs nach WebP wandeln; den Bodenschatten zum Bildrand hin ausblenden, sonst sieht man eine Kante.
