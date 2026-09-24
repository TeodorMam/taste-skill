// User text goes into HTML emails in several routes. Without escaping, a
// dispute reason like `</em><a href="...">Bekreft kontoen din</a><em>` renders
// as a working link in a mail sent from our own verified domain to the other
// party in the trade, which is a ready-made phishing vector.
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Free-text fields have no business being longer than a couple of sentences,
// and an unbounded one is a cheap way to post a megabyte into an inbox.
export const MAX_FREE_TEXT = 500;

export function tooLong(value: string | undefined | null): boolean {
  return (value ?? "").length > MAX_FREE_TEXT;
}
