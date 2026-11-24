// Sends from hello@myvalette.com through AgentMail. No AGENTMAIL_API_KEY: does nothing.
const INBOX = "hello@myvalette.com";

export const emailConfigured = () => Boolean(process.env.AGENTMAIL_API_KEY);

export async function sendEmail(msg: { to: string; subject: string; text: string; html: string; headers?: Record<string, string> }): Promise<boolean> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(INBOX)}/messages/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...msg, labels: ["price-alert"] }),
    });
    if (!res.ok) console.error("email send failed", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("email send failed", e);
    return false;
  }
}
