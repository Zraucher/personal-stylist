# Rebuilds the extension download: python scripts/zip-extension.py
# manifest.json sits at the zip root, which the Chrome Web Store requires; "Extract all" still gives a folder for Load unpacked.
import json, os, zipfile
m = json.load(open("extension/manifest.json", encoding="utf-8"))
assert len(m["description"]) <= 132, "Chrome Web Store caps the manifest description at 132 characters"
with zipfile.ZipFile("public/valette-extension.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir("extension")):
        if os.path.isdir(os.path.join("extension", f)):
            continue  # store-listing/ images are for the Web Store page, not the extension
        z.write(os.path.join("extension", f), f)
print("valette", m["version"])
