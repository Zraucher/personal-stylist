-- Seed data: universal principles, retailers, invites, and the two core
-- profiles (Val: women's, Zack: men's) as payloads applied on first sign-in.
-- Sources: personal-stylist-context.md (Val) and wardrobe-style-profile.md (Zack), both 2026-11-08.

-- ---------------------------------------------------------------------------
-- Universal principles (every user inherits these)
-- ---------------------------------------------------------------------------
insert into public.principles (user_id, rule, rationale, example_failure, sort_order) values
  (null, 'The vibe check outranks the rules check.',
   'Passing palette, fit and fabric is not the same as feeling like the person. Aesthetic authenticity is judged separately from technical compliance, and it wins.',
   'A batch of collared dresses passed every rule and was returned because it felt like a costume. The costliest mistake to repeat.', 10),
  (null, 'Collared, button-front or fully tucked pieces need a loose or undone counterbalance.',
   'Without one they read prim and office-appropriate instead of effortless. Counterbalances: open buttons, drapey fabric, exposed slip layer, contrasting texture, rolled sleeves, a belt, a relaxed trouser.',
   null, 20),
  (null, 'Use the contrast formula: structured with soft, fitted with relaxed, patterned with solid.',
   'Contrast is what keeps an outfit from reading flat or matchy. A blazer over a cami is the reusable template.',
   null, 30),
  (null, 'Start from a neutral base and add at most one accent.',
   'One accent reads intentional; two read busy. Which neutrals and which accents come from the user''s palette.',
   null, 40),
  (null, 'Color names are unreliable. Verify the actual product image before any verdict.',
   'Retailer color names describe a mood, not a colorway.',
   '"Mauve French Paisley" turned out to be bright pink.', 50),
  (null, 'Never finalize a cut on incomplete information.',
   'Confirm the image, the fabric detail or the actual colorway first. A provisional verdict is fine; a wrong confident one is not.',
   null, 60),
  (null, 'Splurge on staples and wow pieces. Save on trendy or experimental items.',
   'Investment should follow wear frequency and longevity, not novelty.',
   null, 70),
  (null, 'The stylist assesses construction, palette and fit. It does not override the user''s taste.',
   'Users have strong visual instincts and often identify pieces they are drawn to. Respect that; the job is to evaluate, not to talk them out of what they like.',
   null, 80);

-- ---------------------------------------------------------------------------
-- Retailers (shared)
-- ---------------------------------------------------------------------------
insert into public.retailers (name, sourcing_notes, best_for, scrape_strategy) values
  ('Azazie', 'Fully free custom sizing. Product pages do not render cleanly via fetch.', 'Special-occasion dresses', 'image_search_fallback'),
  ('L''Agence', 'Collection pages are JavaScript-rendered and cannot be reliably fetched. Search by product name plus colorway, not site: operators.', 'Primary active women''s shopping brand', 'search_name_plus_colorway'),
  ('Nordstrom Rack', 'Carries L''Agence at significant markdowns. Scrapeable product pages. Also a men''s channel (Bugatchi, TravisMathew).', 'Markdowns on loved brands', 'direct_fetch'),
  ('Revolve', 'Direct fetch of product URLs works better than site: search. Image search is a reliable fallback for silhouette evaluation.', 'Women''s contemporary', 'direct_fetch'),
  ('Golf Galaxy', 'Men''s golf apparel: Bad Birdie, Redvanly, Breezy Golf.', 'Golf wear', 'direct_fetch'),
  ('eBay', 'Use Authenticity Guarantee listings for sneakers.', 'Secondhand sneakers and premium brands at discount', 'direct_fetch'),
  ('ThredUp', 'Secondhand premium menswear.', 'Secondhand at discount', 'direct_fetch'),
  ('TravisMathew', 'Brand site on Shopify.', 'Men''s knit and performance polos', 'direct_fetch'),
  ('Twillory', 'Brand site. Non-iron dress shirts with stretch.', 'Men''s business shirts', 'direct_fetch')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Invites. Val's email goes in once known:
--   update public.seed_payloads set email = 'val@...' where label = 'val';
--   insert into public.invites (email, invited_by, note) values ('val@...', 'zack', 'core women''s profile');
-- ---------------------------------------------------------------------------
insert into public.invites (email, invited_by, note) values
  ('zack@gpsteam.com', 'zack', 'founder, core men''s profile')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Val (core women's profile)
-- ---------------------------------------------------------------------------
insert into public.seed_payloads (email, label, payload) values ('val@pending.local', 'val', $json$
{
  "profile": {"name": "Val", "location": "Las Vegas, NV", "presentation": "womens"},
  "measurements": {
    "height_in": 70.5, "inseam_in": 34, "shoulders_in": 18, "chest_bust_in": 38, "bust_cup": "C",
    "waist_in": 30.5, "hips_in": 39, "high_hip_in": 41, "rise_target_in": "11-12",
    "sizing_notes": "Always tall/long sizing in pants. High-waisted styles hit the natural waist well. Hourglass with long legs; shoulders narrow relative to bust and hips."
  },
  "color": {
    "season_label": "Soft Autumn (Summer/Autumn cusp)",
    "undertone": "cool-neutral with pink",
    "depth": "light",
    "contrast": "low to medium",
    "best_colors": ["warm taupe", "camel", "greige", "soft ivory", "terracotta", "muted rust", "warm sand", "sage", "olive", "muted teal", "slate", "ochre", "soft gold", "dusty peach"],
    "avoid_colors": ["bright or saturated tones", "stark white", "true black", "icy cool tones", "acidic or cool-reading colors such as saturated chartreuse"],
    "confidence": "high",
    "source": "stated",
    "notes": "Ash blonde hair, blue-gray/teal eyes, light cool-neutral skin with pink undertone, low-to-medium contrast. Olive in natural light is a proven winner."
  },
  "style": {
    "aesthetic_statement": "Bohemian-edited. Effortless, cool, earthy, body-aware but not flashy, feminine with an edge.",
    "loves": ["contrast pairings: short vs long, fitted vs loose, structured vs flowing, patterned vs solid", "off-shoulder silhouettes", "olive in natural light", "silky textures", "stiff structured denim"],
    "dislikes": ["ruffles", "polka dots", "tiered hems", "ruching", "smocking", "peplums", "scalloped hems", "elasticated or gathered waists", "overly preppy looks", "girly or sweet looks", "costumey or chaotic execution", "column silhouettes without contrast"],
    "silhouettes_preferred": ["high-waisted bottoms", "wide-leg pants", "defined-waist shapes", "fitted ribbed tanks", "loose or oversized tees", "cropped tops", "fitted long-sleeves"],
    "silhouettes_avoid": ["column silhouettes without contrast", "peplum", "tiered"],
    "necklines": ["crew"],
    "fabrics_preferred": [{"name": "silk", "strength": "soft"}, {"name": "viscose", "strength": "soft"}, {"name": "soft cotton", "strength": "soft"}, {"name": "cashmere", "strength": "soft"}, {"name": "silky textures", "strength": "soft"}, {"name": "stiff structured denim", "strength": "soft"}],
    "fabrics_avoid": [{"name": "linen", "strength": "hard"}, {"name": "polyester", "strength": "hard"}, {"name": "itchy wool", "strength": "hard"}, {"name": "stretch denim", "strength": "soft", "note": "preference, revisit situationally"}],
    "tuck_styles": ["tucked", "untucked", "half-tucked"]
  },
  "brands": [
    {"name": "Joah Brown", "status": "loved", "note": "Primary aesthetic anchor"},
    {"name": "L'Agence", "status": "loved", "note": "Primary active shopping brand; multiple hauls reviewed"},
    {"name": "AG", "status": "loved"},
    {"name": "SKIMS", "status": "loved"},
    {"name": "Good American", "status": "loved"},
    {"name": "Alice + Olivia", "status": "loved"},
    {"name": "Vuori", "status": "loved", "best_for": "Tall sizing"},
    {"name": "Azazie", "status": "loved", "best_for": "Special-occasion dresses"},
    {"name": "12th Tribe", "status": "mixed", "note": "Likes the vibe, avoids for quality"}
  ],
  "principles": [
    {"rule": "Olive in natural light is a proven winner.", "rationale": "Confirmed highly flattering in natural and golden-hour light.", "example_success": "Tahoe olive off-shoulder look", "sort_order": 10},
    {"rule": "Off-shoulder silhouettes photograph beautifully.", "rationale": "Confirmed in the Tahoe photos.", "example_success": "Tahoe olive off-shoulder look", "sort_order": 20},
    {"rule": "Chartreuse-adjacent colors need careful vetting.", "rationale": "Saturated chartreuse reads acidic and cool. Muted moss-olive versions work well.", "sort_order": 30},
    {"rule": "Avoid column silhouettes without contrast.", "rationale": "Tops are worn tucked, untucked and half-tucked to create the contrast the aesthetic depends on.", "sort_order": 40},
    {"rule": "Verify construction details before approving: ruffles, tiers, smocking, elastic waists are disqualifying.", "rationale": "The dislikes list is specific and consistent.", "sort_order": 50}
  ],
  "benchmarks": [
    {"label": "Tahoe olive off-shoulder look", "polarity": "positive", "why_it_works": "Color, silhouette and styling energy all confirmed in natural golden-hour light. The positive benchmark for every future review."},
    {"label": "Collared dress batch (returned)", "polarity": "negative", "why_it_works": "Passed every technical rule (palette, fit, fabric) and still felt like a costume. Proof that the vibe check outranks the rules check."}
  ],
  "closet": [
    {"name": "Silk cami", "category": "top", "subcategory": "cami", "brand": "L'Agence", "material": "silk", "formality": 3, "warmth": 1, "colors": [], "seasons": ["spring", "summer", "fall"], "construction": []},
    {"name": "Coated jeans", "category": "bottom", "subcategory": "jeans", "brand": "L'Agence", "material": "coated denim", "formality": 3, "warmth": 2, "colors": [], "seasons": ["fall", "winter", "spring"], "construction": []},
    {"name": "Blouse", "category": "top", "subcategory": "blouse", "brand": "L'Agence", "formality": 3, "warmth": 1, "colors": [], "seasons": ["spring", "summer", "fall"], "construction": []},
    {"name": "Bronze satin maxi skirt", "category": "bottom", "subcategory": "maxi skirt", "brand": "L'Agence", "material": "satin", "formality": 4, "warmth": 1, "colors": [{"name": "bronze"}], "seasons": ["fall", "spring", "summer"], "construction": [], "status": "tailoring", "tailoring_note": "Needs hem tailoring before wearable"}
  ],
  "hauls": [
    {"date": "2026-09-15", "retailer": "L'Agence", "status": "purchased", "notes": "Strong keepers across silk camis, coated jeans, blouses, and a bronze satin maxi skirt.",
     "items": [
       {"name": "Silk camis", "verdict": "keep", "reasoning": "Palette, fabric and silhouette all aligned."},
       {"name": "Coated jeans", "verdict": "keep", "reasoning": "Structured denim, defined waist."},
       {"name": "Blouses", "verdict": "keep", "reasoning": "Drapey counterbalance pieces."},
       {"name": "Bronze satin maxi skirt", "verdict": "keep", "reasoning": "Wow piece in palette.", "tailoring_needed": "Hem"}
     ]},
    {"date": "2026-09-20", "retailer": "Various", "status": "considering", "notes": "Six-piece western/70s-style outerwear audit (coats and jackets), going for a skijoring look. Pieces were not saved; re-collect before continuing.", "items": []}
  ],
  "wishlist": [
    {"category": "belts", "preferences": "Tooled or textured leather. Both through-the-loop and waist-cinching statement styles. No hardware preference.", "budget": "open"}
  ],
  "upcoming_needs": [
    {"label": "Summer and fall events styling", "season": "summer/fall"},
    {"label": "Travel styling", "season": "fall"}
  ]
}
$json$::jsonb)
on conflict (email) do update set payload = excluded.payload, label = excluded.label;

-- ---------------------------------------------------------------------------
-- Zack (core men's profile)
-- ---------------------------------------------------------------------------
insert into public.seed_payloads (email, label, payload) values ('zack@gpsteam.com', 'zack', $json$
{
  "profile": {"name": "Zack", "location": "Las Vegas, NV", "presentation": "mens"},
  "measurements": {
    "inseam_in": 32,
    "sizing_notes": "Polos and hoodies L. Tees M to XL, varies by brand (verify per brand). Pants and sweats M. Golf pants M, inseam 32. Sneakers 9.5 (confirmed on Nike Blazer). Socks L. Undershirt XL. Height, chest, waist, neck and sleeve not yet recorded."
  },
  "color": {
    "season_label": null,
    "best_colors": ["black", "onyx", "midnight black", "heathered black", "deep navy (Total Eclipse)", "white", "blue"],
    "avoid_colors": [],
    "confidence": "low",
    "source": "stated",
    "notes": "Derived from purchase history, not a color analysis. Accents worn: lilac, plum wine, dark forest green, reserved for golf and weekend. Run the guided color check to set a real palette."
  },
  "style": {
    "aesthetic_statement": "Sharp business on top, performance casual everywhere else. Two modes: business (non-iron dress shirts, stretch tailoring) and technical casual (knit polos, performance hoodies, golf wear). Rarely stiff or heavy.",
    "loves": ["knit and performance polos as the default smart-casual piece", "retro heritage sneakers", "understated heavyweight black graphic tees with Las Vegas and car-culture themes", "stretch, lightweight, wrinkle-resistant fabrics", "premium brands bought on discount or secondhand", "multiples of the same cut once it works"],
    "dislikes": ["stiff or heavy fabrics", "overly structured tailoring", "running-shoe styling with casual wear"],
    "silhouettes_preferred": ["modern knit polo cut", "slim-straight stretch trousers", "pull-on golf pants", "lightweight hoodie as a mid-layer", "heavyweight tee, relaxed"],
    "silhouettes_avoid": [],
    "necklines": ["polo collar", "crew"],
    "fabrics_preferred": [{"name": "stretch", "strength": "soft"}, {"name": "performance knit", "strength": "soft"}, {"name": "lightweight", "strength": "soft"}, {"name": "non-iron cotton", "strength": "soft"}, {"name": "wrinkle-resistant", "strength": "soft"}],
    "fabrics_avoid": [{"name": "heavy or stiff fabrics", "strength": "soft"}],
    "tuck_styles": ["tucked for business", "untucked for casual"]
  },
  "brands": [
    {"name": "TravisMathew", "status": "loved", "note": "Core"},
    {"name": "Twillory", "status": "loved", "note": "Core. Non-iron dress shirts."},
    {"name": "Rhoback", "status": "loved", "note": "Core"},
    {"name": "Comfrt", "status": "loved", "note": "Core"},
    {"name": "Bad Birdie", "status": "loved", "note": "Regular. Golf."},
    {"name": "Bugatchi", "status": "loved", "note": "Regular"},
    {"name": "Nike", "status": "loved", "note": "Regular. Retro sneakers."},
    {"name": "AOCTW", "status": "loved", "note": "Regular. Heavyweight graphic tees."},
    {"name": "Redvanly", "status": "loved", "note": "Regular. Golf pants."},
    {"name": "Indochino", "status": "mixed", "note": "Occasional. Suits, last order Mar 2024."},
    {"name": "Breezy Golf", "status": "mixed", "note": "Occasional"},
    {"name": "Brooks Brothers", "status": "mixed", "note": "Occasional. In-store Sep 2026."}
  ],
  "principles": [
    {"rule": "Four formality tiers: 1 tailored (dress shirt, stretch trousers); 2 smart casual (knit polo, dark pants, retro sneaker); 3 casual (tee or hoodie, joggers); 4 golf (performance polo, pull-on pants, hat).", "rationale": "Every outfit should sit cleanly in one tier.", "sort_order": 10},
    {"rule": "Base in black or navy, then at most one accent. Reserve lilac, plum and forest for golf and weekend looks.", "rationale": "Keeps business looks sharp and lets the accents feel deliberate.", "sort_order": 20},
    {"rule": "Retro sneakers pair with tiers 2 and 3. Tier 1 has no confirmed shoe yet.", "rationale": "Dress shoes, loafers and boots are gaps in the closet.", "sort_order": 30},
    {"rule": "Polo over button-down on non-business days.", "rationale": "The polo is the default smart-casual piece.", "sort_order": 40},
    {"rule": "Hoodies are lightweight or performance weight: treat as mid-layer, not outerwear.", "rationale": "No true outerwear in the closet yet; Las Vegas winter mornings will expose this.", "sort_order": 50},
    {"rule": "Tee sizing is inconsistent (M to XL). Verify per brand before buying.", "rationale": "AOCTW runs M in one cut and XL in another.", "sort_order": 60}
  ],
  "benchmarks": [],
  "closet": [
    {"name": "Leader Non-Iron Solid dress shirt", "category": "top", "subcategory": "dress shirt", "brand": "Twillory", "colors": [{"name": "blue"}], "material": "non-iron cotton stretch", "construction": ["collar", "button-front"], "formality": 4, "warmth": 2, "seasons": ["all"]},
    {"name": "Leader Non-Iron Solid dress shirt", "category": "top", "subcategory": "dress shirt", "brand": "Twillory", "colors": [{"name": "white"}], "material": "non-iron cotton stretch", "construction": ["collar", "button-front"], "formality": 4, "warmth": 2, "seasons": ["all"]},
    {"name": "Leader Contrast dress shirt", "category": "top", "subcategory": "dress shirt", "brand": "Twillory", "colors": [{"name": "black"}], "pattern": "skull contrast", "material": "non-iron cotton stretch", "construction": ["collar", "button-front", "contrast trim"], "formality": 4, "warmth": 2, "seasons": ["all"]},
    {"name": "Leader Gingham dress shirt", "category": "top", "subcategory": "dress shirt", "brand": "Twillory", "colors": [{"name": "green"}, {"name": "blue"}], "pattern": "gingham", "material": "non-iron cotton stretch", "construction": ["collar", "button-front"], "formality": 4, "warmth": 2, "seasons": ["all"]},
    {"name": "Relationship Status Polo", "category": "top", "subcategory": "polo", "brand": "TravisMathew", "colors": [{"name": "white"}], "size": "XL", "material": "performance knit", "construction": ["polo collar"], "formality": 3, "warmth": 1, "seasons": ["spring", "summer", "fall"]},
    {"name": "Featherweight Summer Polo", "category": "top", "subcategory": "polo", "brand": "TravisMathew", "colors": [{"name": "deep navy", "note": "Total Eclipse"}], "size": "L", "material": "featherweight performance knit", "construction": ["polo collar"], "formality": 3, "warmth": 1, "seasons": ["summer"]},
    {"name": "Pushback Knit Polo", "category": "top", "subcategory": "polo", "brand": "TravisMathew", "colors": [{"name": "black"}], "size": "L", "material": "knit", "construction": ["polo collar"], "formality": 3, "warmth": 2, "seasons": ["all"]},
    {"name": "Abstract Knit Polo", "category": "top", "subcategory": "polo", "brand": "Bugatchi", "colors": [{"name": "heathered black"}], "size": "L", "material": "knit", "pattern": "abstract", "construction": ["polo collar"], "formality": 3, "warmth": 2, "seasons": ["all"]},
    {"name": "Ditsy Down Golf Polo", "category": "top", "subcategory": "golf polo", "brand": "Bad Birdie", "colors": [{"name": "dark forest green"}], "size": "L", "material": "performance", "pattern": "ditsy print", "construction": ["polo collar"], "formality": 2, "warmth": 1, "seasons": ["spring", "summer", "fall"]},
    {"name": "Derivative Heavyweight Tee", "category": "top", "subcategory": "graphic tee", "brand": "AOCTW", "colors": [{"name": "black"}], "size": "M", "material": "heavyweight cotton", "pattern": "graphic", "construction": ["crew"], "formality": 2, "warmth": 2, "seasons": ["all"]},
    {"name": "Vintage Stardust Hotel Las Vegas Heavyweight Tee", "category": "top", "subcategory": "graphic tee", "brand": "AOCTW", "colors": [{"name": "black"}], "size": "XL", "material": "heavyweight cotton", "pattern": "graphic", "construction": ["crew"], "formality": 2, "warmth": 2, "seasons": ["all"]},
    {"name": "'64 Mustang Washed Heavyweight Tee", "category": "top", "subcategory": "graphic tee", "brand": "AOCTW", "colors": [{"name": "washed black"}], "size": "XL", "material": "heavyweight cotton", "pattern": "graphic", "construction": ["crew"], "formality": 2, "warmth": 2, "seasons": ["all"]},
    {"name": "Hesi Performance Hoodie", "category": "layer", "subcategory": "hoodie", "brand": "Rhoback", "colors": [{"name": "midnight black"}], "size": "L", "material": "performance", "construction": ["hood"], "formality": 2, "warmth": 3, "seasons": ["fall", "winter", "spring"]},
    {"name": "Halo Lightweight Airplane Mode Hoodie", "category": "layer", "subcategory": "hoodie", "brand": "Comfrt", "colors": [{"name": "onyx black"}], "size": "L", "material": "lightweight fleece", "construction": ["hood"], "formality": 1, "warmth": 3, "seasons": ["fall", "winter", "spring"]},
    {"name": "Signature Sweatpants", "category": "bottom", "subcategory": "sweatpants", "brand": "Comfrt", "colors": [{"name": "onyx black"}], "size": "M", "material": "fleece", "construction": ["elastic waist"], "formality": 1, "warmth": 3, "seasons": ["fall", "winter", "spring"]},
    {"name": "Kent Pull-On Golf Pants", "category": "bottom", "subcategory": "golf pants", "brand": "Redvanly", "colors": [{"name": "lilac"}], "size": "M/32", "material": "performance stretch", "construction": ["pull-on"], "formality": 2, "warmth": 2, "seasons": ["spring", "summer", "fall"]},
    {"name": "Birdie Snapback Hat", "category": "accessory", "subcategory": "hat", "brand": "Bad Birdie", "colors": [{"name": "plum wine"}], "size": "one size", "construction": ["snapback"], "formality": 1, "warmth": 1, "seasons": ["all"]},
    {"name": "Flipped Rope Hat", "category": "accessory", "subcategory": "hat", "brand": "Breezy Golf", "colors": [{"name": "black"}], "size": "one size", "construction": ["rope"], "formality": 1, "warmth": 1, "seasons": ["all"]},
    {"name": "Blazer Mid 77 Vintage", "category": "shoes", "subcategory": "retro sneaker", "brand": "Nike", "colors": [{"name": "white"}, {"name": "black"}], "size": "9.5", "material": "leather", "construction": ["mid-top"], "formality": 2, "warmth": 2, "seasons": ["all"]},
    {"name": "Air Jordan 1 Retro High OG x Spider-Verse", "category": "shoes", "subcategory": "retro sneaker", "brand": "Jordan", "colors": [{"name": "collab colorway", "note": "verify from image"}], "material": "leather", "construction": ["high-top"], "formality": 2, "warmth": 2, "seasons": ["all"]},
    {"name": "Polarized Sunglasses", "category": "accessory", "subcategory": "sunglasses", "brand": "WearMe Pro", "colors": [], "formality": 2, "warmth": 1, "seasons": ["all"]},
    {"name": "Everyday Plus Cushioned Crew Socks (6)", "category": "basics", "subcategory": "socks", "brand": "Nike", "colors": [], "size": "L", "formality": 1, "warmth": 1, "seasons": ["all"]},
    {"name": "Padded shaping undershirt", "category": "basics", "subcategory": "undershirt", "brand": "Urenix", "colors": [{"name": "black"}], "size": "XL", "formality": 1, "warmth": 1, "seasons": ["all"]}
  ],
  "hauls": [
    {"date": "2024-10-01", "retailer": "Twillory", "status": "purchased", "notes": "Six orders Jan 2023 to Oct 2024, contents not itemized in email.", "items": []},
    {"date": "2024-03-01", "retailer": "Indochino", "status": "purchased", "notes": "Order 199358984. Suit, mid to lightweight fabric with stretch.", "items": []},
    {"date": "2026-09-01", "retailer": "Brooks Brothers", "status": "purchased", "notes": "In-store visit and rewards signup. Contents unknown.", "items": []},
    {"date": "2026-09-01", "retailer": "Nordstrom Rack", "status": "purchased", "notes": "In-store receipt (Newbury). Contents unknown.", "items": []},
    {"date": "2026-10-01", "retailer": "ThredUp", "status": "purchased", "notes": "Order delivered Oct 2026. Contents unknown.", "items": []}
  ],
  "wishlist": [
    {"category": "tier 1 shoes", "preferences": "Dress shoe, loafer or boot to complete the tailored tier. Nothing confirmed in the closet.", "budget": "open"},
    {"category": "outerwear", "preferences": "True outerwear for Las Vegas winter mornings and travel. Hoodies are mid-layers only.", "budget": "open"},
    {"category": "denim or chinos", "preferences": "No adult denim or chinos found. Needed to bridge tier 2 and 3.", "budget": "open"},
    {"category": "belt", "preferences": "None found.", "budget": "open"},
    {"category": "watch", "preferences": "None found.", "budget": "open"},
    {"category": "suit refresh", "preferences": "Last Indochino order Mar 2024. Stretch, mid to lightweight, sharp but not overly structured.", "budget": "open"}
  ],
  "upcoming_needs": []
}
$json$::jsonb)
on conflict (email) do update set payload = excluded.payload, label = excluded.label;
