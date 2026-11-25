import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

// One place for structured Claude calls. Judgment-heavy work (scorecards, haul
// reviews, tagging) uses the strongest model; picking from prepared candidates
// and parsing free text uses the faster one.
export const MODELS = {
  judge: "claude-opus-5-5",
  fast: "claude-sonnet-5-5",
  bulk: "claude-haiku-5-5",
} as const;

export type AiErrorCode = "unavailable" | "rate_limited" | "refused" | "failed";
export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const aiAvailable = () => !!process.env.ANTHROPIC_API_KEY;

export type ImagePart = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };

/** Ask Claude for a structured answer. Throws AiError with a stable code. */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  text: string;
  images?: ImagePart[];
  model?: string;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  if (!aiAvailable()) throw new AiError("unavailable", "ANTHROPIC_API_KEY is not set");
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [
    ...(opts.images ?? []).map(
      (img): Anthropic.ContentBlockParam => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })
    ),
    { type: "text", text: opts.text },
  ];
  try {
    const response = await client.messages.parse({
      model: opts.model ?? MODELS.judge,
      max_tokens: opts.maxTokens ?? 3000,
      system: opts.system,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(opts.schema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new AiError("refused", "No usable answer");
    return response.parsed_output as z.infer<S>;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new AiError("rate_limited", err.message);
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("unavailable", err.message);
    if (err instanceof Anthropic.APIError) throw new AiError("failed", err.message);
    throw err;
  }
}

/** Image bytes from Supabase storage as a Claude image part. */
export async function blobToImage(blob: Blob): Promise<ImagePart> {
  const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"] as const).find((t) => t === blob.type) ?? "image/jpeg";
  return { mediaType, data: Buffer.from(await blob.arrayBuffer()).toString("base64") };
}

export function aiErrorStatus(e: AiError): number {
  return e.code === "unavailable" ? 503 : e.code === "rate_limited" ? 429 : e.code === "refused" ? 422 : 502;
}
