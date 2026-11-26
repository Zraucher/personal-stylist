-- Seed closet items get a colour photo: payload closet entries may carry "image", stored as
-- source_image_url so the existing "photos found" review (Closet > Sourced) lets the person keep it.
-- Photos live in public/seed/<label>-<n>.webp. Not applied to production by this change.

create or replace function public.apply_seed(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s    public.seed_payloads%rowtype;
  p    jsonb;
  m    jsonb;
  c    jsonb;
  sp   jsonb;
  el   jsonb;
  hel  jsonb;
  hid  uuid;
begin
  select * into s from public.seed_payloads
   where lower(email) = lower(p_email) and applied_at is null;
  if not found then
    return;
  end if;
  p := s.payload;

  -- Profile
  update public.profiles set
    name         = coalesce(p->'profile'->>'name', name),
    location     = coalesce(p->'profile'->>'location', location),
    presentation = coalesce((p->'profile'->>'presentation')::public.presentation, presentation)
  where id = p_user_id;

  -- Measurements
  if p ? 'measurements' then
    m := p->'measurements';
    insert into public.measurements
      (user_id, height_in, inseam_in, shoulders_in, chest_bust_in, bust_cup, waist_in, hips_in,
       high_hip_in, neck_in, sleeve_in, rise_target_in, sizing_notes)
    values
      (p_user_id, (m->>'height_in')::numeric, (m->>'inseam_in')::numeric, (m->>'shoulders_in')::numeric,
       (m->>'chest_bust_in')::numeric, m->>'bust_cup', (m->>'waist_in')::numeric, (m->>'hips_in')::numeric,
       (m->>'high_hip_in')::numeric, (m->>'neck_in')::numeric, (m->>'sleeve_in')::numeric,
       m->>'rise_target_in', m->>'sizing_notes')
    on conflict (user_id) do update set
      height_in = excluded.height_in, inseam_in = excluded.inseam_in, shoulders_in = excluded.shoulders_in,
      chest_bust_in = excluded.chest_bust_in, bust_cup = excluded.bust_cup, waist_in = excluded.waist_in,
      hips_in = excluded.hips_in, high_hip_in = excluded.high_hip_in, neck_in = excluded.neck_in,
      sleeve_in = excluded.sleeve_in, rise_target_in = excluded.rise_target_in,
      sizing_notes = excluded.sizing_notes, updated_at = now();
  end if;

  -- Color profile
  if p ? 'color' then
    c := p->'color';
    insert into public.color_profiles
      (user_id, season_label, undertone, depth, contrast, best_colors, avoid_colors, confidence, source, notes)
    values
      (p_user_id, c->>'season_label', c->>'undertone', c->>'depth', c->>'contrast',
       public.jsonb_text_array(c->'best_colors'), public.jsonb_text_array(c->'avoid_colors'),
       c->>'confidence', c->>'source', c->>'notes')
    on conflict (user_id) do update set
      season_label = excluded.season_label, undertone = excluded.undertone, depth = excluded.depth,
      contrast = excluded.contrast, best_colors = excluded.best_colors, avoid_colors = excluded.avoid_colors,
      confidence = excluded.confidence, source = excluded.source, notes = excluded.notes, updated_at = now();
  end if;

  -- Style prefs
  if p ? 'style' then
    sp := p->'style';
    insert into public.style_prefs
      (user_id, aesthetic_statement, loves, dislikes, silhouettes_preferred, silhouettes_avoid, necklines,
       fabrics_preferred, fabrics_avoid, tuck_styles)
    values
      (p_user_id, sp->>'aesthetic_statement',
       public.jsonb_text_array(sp->'loves'), public.jsonb_text_array(sp->'dislikes'),
       public.jsonb_text_array(sp->'silhouettes_preferred'), public.jsonb_text_array(sp->'silhouettes_avoid'),
       public.jsonb_text_array(sp->'necklines'),
       coalesce(sp->'fabrics_preferred', '[]'::jsonb), coalesce(sp->'fabrics_avoid', '[]'::jsonb),
       public.jsonb_text_array(sp->'tuck_styles'))
    on conflict (user_id) do update set
      aesthetic_statement = excluded.aesthetic_statement, loves = excluded.loves, dislikes = excluded.dislikes,
      silhouettes_preferred = excluded.silhouettes_preferred, silhouettes_avoid = excluded.silhouettes_avoid,
      necklines = excluded.necklines, fabrics_preferred = excluded.fabrics_preferred,
      fabrics_avoid = excluded.fabrics_avoid, tuck_styles = excluded.tuck_styles, updated_at = now();
  end if;

  -- Brands
  for el in select * from jsonb_array_elements(coalesce(p->'brands', '[]'::jsonb)) loop
    insert into public.brands (user_id, name, status, note, best_for)
    values (p_user_id, el->>'name', el->>'status', el->>'note', el->>'best_for');
  end loop;

  -- Personal principles
  for el in select * from jsonb_array_elements(coalesce(p->'principles', '[]'::jsonb)) loop
    insert into public.principles (user_id, rule, rationale, example_failure, example_success, sort_order)
    values (p_user_id, el->>'rule', el->>'rationale', el->>'example_failure', el->>'example_success',
            coalesce((el->>'sort_order')::int, 100));
  end loop;

  -- Benchmarks
  for el in select * from jsonb_array_elements(coalesce(p->'benchmarks', '[]'::jsonb)) loop
    insert into public.benchmarks (user_id, label, why_it_works, polarity)
    values (p_user_id, el->>'label', el->>'why_it_works', el->>'polarity');
  end loop;

  -- Closet items
  for el in select * from jsonb_array_elements(coalesce(p->'closet', '[]'::jsonb)) loop
    insert into public.closet_items
      (user_id, name, category, subcategory, colors, pattern, material, construction, formality, warmth,
       seasons, brand, size, status, tailoring_note, source_image_url)
    values
      (p_user_id, el->>'name', el->>'category', el->>'subcategory',
       coalesce(el->'colors', '[]'::jsonb), el->>'pattern', el->>'material',
       public.jsonb_text_array(el->'construction'),
       (el->>'formality')::smallint, (el->>'warmth')::smallint,
       public.jsonb_text_array(el->'seasons'), el->>'brand', el->>'size',
       coalesce((el->>'status')::public.item_status, 'available'), el->>'tailoring_note', el->>'image');
  end loop;

  -- Hauls with items
  for el in select * from jsonb_array_elements(coalesce(p->'hauls', '[]'::jsonb)) loop
    insert into public.hauls (user_id, date, retailer, status, notes)
    values (p_user_id, (el->>'date')::date, el->>'retailer', el->>'status', el->>'notes')
    returning id into hid;
    for hel in select * from jsonb_array_elements(coalesce(el->'items', '[]'::jsonb)) loop
      insert into public.haul_items (haul_id, user_id, name, stated_colorway, verdict, reasoning, tailoring_needed)
      values (hid, p_user_id, hel->>'name', hel->>'stated_colorway', hel->>'verdict', hel->>'reasoning',
              hel->>'tailoring_needed');
    end loop;
  end loop;

  -- Wishlist
  for el in select * from jsonb_array_elements(coalesce(p->'wishlist', '[]'::jsonb)) loop
    insert into public.wishlist (user_id, category, preferences, budget)
    values (p_user_id, el->>'category', el->>'preferences', el->>'budget');
  end loop;

  -- Upcoming needs
  for el in select * from jsonb_array_elements(coalesce(p->'upcoming_needs', '[]'::jsonb)) loop
    insert into public.upcoming_needs (user_id, label, season)
    values (p_user_id, el->>'label', el->>'season');
  end loop;

  update public.seed_payloads set applied_at = now() where email = s.email;
end;
$$;

-- Payloads not applied yet (new sign-ins) get image URLs by closet position.
update public.seed_payloads sp
   set payload = jsonb_set(sp.payload, '{closet}', (
     select jsonb_agg(t.el || jsonb_build_object('image', 'https://www.myvalette.com/seed/' || sp.label || '-' || t.ord || '.webp') order by t.ord)
       from jsonb_array_elements(sp.payload->'closet') with ordinality as t(el, ord)))
 where sp.applied_at is null and jsonb_array_length(coalesce(sp.payload->'closet', '[]'::jsonb)) > 0;
