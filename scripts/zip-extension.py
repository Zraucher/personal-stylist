# Rebuilds the extension download: python scripts/zip-extension.py
import os, zipfile
with zipfile.ZipFile("public/valette-extension.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir("extension")):
        z.write(os.path.join("extension", f), "valette-extension/" + f)
