/** Admin allowlist: comma-separated emails in ADMIN_EMAILS. Empty or unset means nobody is admin. */
export function isAdmin(email: string | null | undefined, list = process.env.ADMIN_EMAILS): boolean {
  if (!email || !list) return false;
  const e = email.trim().toLowerCase();
  return list.split(",").some((x) => x.trim().toLowerCase() === e);
}
