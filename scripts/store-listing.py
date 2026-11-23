# Chrome Web Store listing images: python scripts/store-listing.py
# Writes extension/store-listing/*.png (24-bit, no alpha). The zip script skips that folder.
# The popup states copy extension/popup.html's CSS and the text popup.js shows; the store is made up.
import io, os
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = "extension/store-listing"
POPUP_CSS = """
.pop { width: 320px; padding: 14px; font: 14px/1.45 Figtree, system-ui, sans-serif; color: #1c1917; background: #fafaf7; box-sizing: border-box; }
.pop h1 { font-size: 15px; margin: 0 0 2px; } .pop p { margin: 6px 0; } .pop .muted { color: #57534e; font-size: 12px; }
.pop .chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid #d6d3d1; }
.pop .buy { background: #e7f3ea; border-color: #b9dcc2; } .pop b { font-weight: 600; }
.pop .btn { display: inline-block; margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: #1f5a3a; color: #fff; font-weight: 600; }
.pop .btn.quiet { background: #fff; color: #1c1917; box-shadow: inset 0 0 0 1px #a8a29e; }
.pop .choices { display: flex; flex-direction: column; align-items: flex-start; }
"""
NAME = "Merino Crew Sweater"
POPUPS = {
    "choose": f'<h1>{NAME}</h1><p class="muted">Add it to</p><div class="choices"><span class="btn">Shopping list</span><span class="btn quiet">My closet (I bought it)</span></div>',
    "advice": f'<h1>{NAME}</h1><p class="muted">On your shopping list · $98.00 · watching the price</p>'
    '<span class="chip buy">✓ worth buying</span><p>A soft, warm layer in a color that works with most of your closet.</p>'
    '<p><b>Size up.</b> 41 reviews say it runs small, 6 say true to size.</p>'
    '<p><b>Price.</b> $98 now, down from $128. Its lowest in 60 days.</p><span class="btn">Open in valette</span>',
    "closet": f'<h1>{NAME}</h1><p class="muted">Added to your closet · $98.00</p><p>Check its color and type in valette, then it shows up in your outfits.</p><span class="btn">Check the details</span>',
}
SWEATER = """<svg viewBox="0 0 200 200" width="100%" height="100%"><path d="M70 30 Q100 48 130 30 L172 52 L190 120 L164 128 L152 84 L152 176 L48 176 L48 84 L36 128 L10 120 L28 52 Z"
 fill="#d9c7a8" stroke="#b8a37f" stroke-width="2"/><path d="M70 30 Q100 52 130 30" fill="none" stroke="#b8a37f" stroke-width="5"/>
 <path d="M48 166 H152" stroke="#c4b08d" stroke-width="6"/></svg>"""
MARK = """<svg viewBox="0 0 64 64" width="{s}" height="{s}"><rect width="64" height="64" rx="14" fill="#2f6b4f"/>
<path d="M19 20 L31 46 L43 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="17" r="6" fill="#f2c14e"/></svg>"""
HEAD = f"""<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Figtree:wght@400;500;600&display=block" rel="stylesheet">
<style>* {{ box-sizing: border-box; }} body {{ margin: 0; font-family: Figtree, sans-serif; color: #1d1b2b; }}
.d {{ font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; letter-spacing: -0.02em; }} {POPUP_CSS}
.win {{ background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgb(29 27 43 / .16), 0 0 0 1px rgb(29 27 43 / .08); overflow: hidden; position: relative; }}
.bar {{ height: 44px; background: #f1ede8; display: flex; align-items: center; gap: 8px; padding: 0 14px; }}
.dot {{ width: 11px; height: 11px; border-radius: 50%; background: #dcd2c6; }}
.url {{ flex: 1; height: 26px; border-radius: 13px; background: #fff; margin: 0 12px; font-size: 13px; color: #6b6577; display: flex; align-items: center; padding: 0 12px; }}
.popwrap {{ position: absolute; top: 52px; right: 14px; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 36px rgb(29 27 43 / .22), 0 0 0 1px rgb(29 27 43 / .1); }}
</style>"""

def store_window(popup, w=760, h=560):
    return f"""<div class="win" style="width:{w}px;height:{h}px"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
<span class="url">fernhill-supply.example/merino-crew</span>{MARK.format(s=24)}</div>
<div style="display:flex;gap:32px;padding:32px"><div style="width:300px;height:340px;background:#f5f1ec;border-radius:8px;padding:30px">{SWEATER}</div>
<div style="padding-top:8px"><div style="font-size:12px;letter-spacing:.12em;color:#6b6577">FERNHILL</div><div class="d" style="font-size:26px;margin:6px 0 10px">{NAME}</div>
<div style="font-size:20px"><b>$98</b> <s style="color:#6b6577">$128</s></div><div style="margin-top:18px;font-size:13px;color:#55505f">★★★★☆ 47 reviews</div>
<div style="margin-top:26px;width:200px;padding:12px;border-radius:6px;background:#1d1b2b;color:#fff;text-align:center;font-weight:600">Add to bag</div></div></div>
<div class="popwrap"><div class="pop">{POPUPS[popup]}</div></div></div>"""

def shot(title, sub, popup):
    return f"""<body style="width:1280px;height:800px;background:#fbf7f2;display:flex;align-items:center;gap:56px;padding:0 64px">
<div style="width:380px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">{MARK.format(s=36)}<span class="d" style="font-size:26px">valette</span></div>
<div class="d" style="font-size:50px;line-height:1.05">{title}</div><p style="font-size:21px;line-height:1.45;color:#55505f;margin-top:20px">{sub}</p></div>{store_window(popup)}</body>"""

def tile(w, h, title_px, sub, popup=None):
    side = f'<div style="transform:scale(.92);transform-origin:right center" class="popwrap2"><div class="win" style="border-radius:10px"><div class="pop">{POPUPS[popup]}</div></div></div>' if popup else ""
    return f"""<body style="width:{w}px;height:{h}px;background:#2f6b4f;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 {h//7}px;overflow:hidden">
<div><div style="display:flex;align-items:center;gap:{title_px//4}px">{MARK.format(s=title_px)}<span class="d" style="font-size:{title_px}px">valette</span></div>
<p style="font-size:{max(18, title_px//2.6):.0f}px;line-height:1.35;margin:{title_px//3}px 0 0;color:#e6f2eb;max-width:{w//2 if popup else w - 80}px">{sub}</p></div>{side}</body>"""

FRAMES = {
    "screenshot-1-save.png": (1280, 800, shot("Save it while you shop", "One click on any product page puts it on your shopping list or, once it's yours, in your closet.", "choose")),
    "screenshot-2-advice.png": (1280, 800, shot("Should you buy it?", "We read the reviews and the price history, then tell you if it's worth it and whether to size up or down.", "advice")),
    "screenshot-3-closet.png": (1280, 800, shot("Bought it? It's in your closet", "The store's photo and details come with it, ready for your outfits.", "closet")),
    "small-promo-440x280.png": (440, 280, tile(440, 280, 52, "Your stylist, right where you shop.")),
    "marquee-1400x560.png": (1400, 560, tile(1400, 560, 84, "Save what you're shopping for. Know if it's worth it, and when it goes on sale.", "advice")),
}

os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h, body) in FRAMES.items():
        page = b.new_page(viewport={"width": w, "height": h})
        page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{HEAD}</head>{body}</html>", wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        img = Image.open(io.BytesIO(page.screenshot())).convert("RGB")  # RGB: the store refuses alpha
        assert img.size == (w, h), (name, img.size)
        img.save(os.path.join(OUT, name), optimize=True)
        print(name, img.size)
    b.close()
icon = Image.open(os.path.expanduser("~/Downloads/valette-store-icon-128.png"))
icon.save(os.path.join(OUT, "store-icon-128.png"))
