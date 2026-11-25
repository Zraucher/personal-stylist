import "server-only";
import { z } from "zod";
import { MODELS, structured, type ImagePart } from "./claude";
import { EYES, HAIRS, SKINS, UNDERTONES } from "@/lib/profile/season";

// Reads the color quiz answers from a selfie. The enums come from the quiz's own lists, so they can't drift apart.
const ids = <T extends string>(xs: Array<{ id: T }>) => xs.map((x) => x.id) as [T, ...T[]];

export const SelfieSchema = z.object({
  face_visible: z.boolean().describe("false if no single face is clearly visible"),
  skin: z.enum(ids(SKINS)),
  undertone: z.enum(ids(UNDERTONES)).describe('"unsure" when the light or the photo makes it impossible to tell'),
  hair: z.enum(ids(HAIRS)).describe("the natural color; if roots show a dyed color, the roots"),
  eyes: z.enum(ids(EYES)),
  warning: z.string().max(200).nullable().describe("one short sentence if the light, a filter, makeup or dyed hair makes a reading unreliable; else null"),
});
export type SelfieReading = z.infer<typeof SelfieSchema>;

const SYSTEM = `You help a person find their clothing color season in a private personal-stylist app. From their selfie, report only four color traits: skin depth, skin undertone, natural hair color and eye color, using the given options. Judge the skin on the jaw and neck, not on flushed cheeks or makeup. Allow for warm indoor light, which makes skin look warmer and hair more golden. Do not comment on looks, age, or anything else about the person.`;

export function readSelfie(image: ImagePart): Promise<SelfieReading> {
  return structured({ schema: SelfieSchema, system: SYSTEM, text: "Read the color traits from this selfie.", images: [image], model: MODELS.judge, maxTokens: 1000 });
}
