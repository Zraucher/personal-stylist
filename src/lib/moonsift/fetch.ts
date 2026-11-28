// Server: read public Moonsift collections through Firestore's REST API with Moonsift's public web key.
import { decodeFields, mapItem, webUrl, type MoonsiftItem } from "./parse.ts";

const BASE = "https://firestore.googleapis.com/v1/projects/moonsift-web/databases/(default)/documents/databases";
export const MAX_ITEMS = 500;
const PUBLIC = 10;

/** Why a Moonsift read failed, in words the person can act on. */
export class MoonsiftError extends Error {
  code: "config" | "not_found" | "private" | "unavailable";
  constructor(code: MoonsiftError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

type Doc = { name?: string; fields?: Record<string, Record<string, unknown>> };

let found: string | null = null;

// Moonsift's public web key: the env var if set, else read once from their app bundle (the app shell, not the Framer homepage), so a key rotation fixes itself.
async function key(): Promise<string> {
  const k = process.env.MOONSIFT_FIREBASE_API_KEY || found;
  if (k) return k;
  try {
    const page = await fetch("https://www.moonsift.com/collection/a/b", { signal: AbortSignal.timeout(10_000), cache: "no-store" }).then((r) => r.text());
    const src = page.match(/src="(\/assets\/index-[\w-]+\.js)"/)?.[1];
    const js = src ? await fetch(`https://www.moonsift.com${src}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" }).then((r) => r.text()) : "";
    found = js.match(/apiKey:"(AIza[\w-]{30,45})"/)?.[1] ?? null;
  } catch {}
  if (!found) throw new MoonsiftError("config", "Moonsift import isn't working right now. Try again later.");
  return found;
}

async function call<T>(path: string, init?: RequestInit & { query?: string }): Promise<T | null> {
  const res = await fetch(`${BASE}/${path}?key=${encodeURIComponent(await key())}${init?.query ?? ""}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => {
    throw new MoonsiftError("unavailable", "We couldn't reach Moonsift. Try again in a minute.");
  });
  if (res.status === 404) return null;
  // Firestore answers 403 for documents its rules keep private.
  if (res.status === 403) throw new MoonsiftError("private", "That collection is private. Make it public in Moonsift, then paste the link again.");
  if (!res.ok) throw new MoonsiftError("unavailable", "We couldn't read Moonsift just now. Try again in a minute.");
  return (await res.json()) as T;
}

const seg = (s: string) => encodeURIComponent(s);

export async function userUid(username: string): Promise<string> {
  const doc = await call<Doc>(`username/map/${seg(username)}`);
  const uid = doc ? decodeFields(doc.fields).user_uid : null;
  if (typeof uid !== "string" || !/^[\w-]{1,128}$/.test(uid)) throw new MoonsiftError("not_found", "We couldn't find that Moonsift profile. Check the link.");
  return uid;
}

export type MoonsiftCollection = { id: string; name: string; cover: string | null; count: number | null };

function toCollection(id: string, f: Record<string, unknown>): MoonsiftCollection {
  return { id, name: typeof f.name === "string" && f.name.trim() ? f.name.trim().slice(0, 120) : "Untitled collection", cover: webUrl(f.circle_url), count: null };
}

/** A public collection's name and cover; throws "private" when it isn't public. */
export async function getCollection(uid: string, id: string): Promise<MoonsiftCollection> {
  const doc = await call<Doc>(`user_product_collection/${seg(uid)}/${seg(id)}`);
  if (!doc) throw new MoonsiftError("not_found", "We couldn't find that collection. Check the link.");
  const f = decodeFields(doc.fields);
  if (f.public_level !== PUBLIC) throw new MoonsiftError("private", "That collection is private. Make it public in Moonsift, then paste the link again.");
  return toCollection(id, f);
}

/** Item count without reading the items (one aggregation call); null if Firestore won't say. */
export async function countItems(uid: string, id: string): Promise<number | null> {
  const r = await call<Array<{ result?: { aggregateFields?: Record<string, Record<string, unknown>> } }>>(`user_product_collection/${seg(uid)}/${seg(id)}:runAggregationQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: "list" }] }, aggregations: [{ alias: "n", count: {} }] } }),
  }).catch(() => null);
  const n = decodeFields(r?.[0]?.result?.aggregateFields).n;
  return typeof n === "number" ? n : null;
}

/** A profile's public collections, newest first. */
export async function listPublicCollections(uid: string): Promise<MoonsiftCollection[]> {
  const rows =
    (await call<Array<{ document?: Doc }>>("user_product_collection:runQuery", {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: uid }], where: { fieldFilter: { field: { fieldPath: "public_level" }, op: "EQUAL", value: { integerValue: String(PUBLIC) } } }, limit: 100 },
      }),
    })) ?? [];
  const out = rows
    .filter((r) => r.document?.name)
    .map((r) => ({ c: toCollection(r.document!.name!.split("/").pop()!, decodeFields(r.document!.fields)), at: String(decodeFields(r.document!.fields).last_updated ?? "") }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((r) => r.c);
  const counts = await Promise.all(out.map((c) => countItems(uid, c.id)));
  return out.map((c, i) => ({ ...c, count: counts[i] }));
}

/** Every item in a collection (paged), capped at `cap`, newest first; items without a product link are dropped. */
export async function listItems(uid: string, id: string, cap = MAX_ITEMS): Promise<MoonsiftItem[]> {
  const items: MoonsiftItem[] = [];
  let docs = 0;
  let token = "";
  for (let page = 0; page < 10 && items.length < cap; page++) {
    const r = await call<{ documents?: Doc[]; nextPageToken?: string }>(`user_product_collection/${seg(uid)}/${seg(id)}/list`, { query: `&pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ""}` });
    for (const d of r?.documents ?? []) {
      docs++;
      const it = mapItem(decodeFields(d.fields));
      if (it) items.push(it);
    }
    if (!r?.nextPageToken) break;
    token = r.nextPageToken;
  }
  // Items came back but none had a link we recognise: Moonsift changed its format, so say so instead of importing nothing.
  if (docs > 0 && !items.length) throw new MoonsiftError("config", "Moonsift changed how it shares collections, so import isn't working right now. Try again later.");
  return items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, cap);
}
