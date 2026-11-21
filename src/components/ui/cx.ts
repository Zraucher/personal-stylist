/** Join class names, skipping falsy parts. No merging: pass layout classes only through `className`. */
export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(" ");
