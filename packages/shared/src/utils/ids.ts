export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function createRunId(requirement: string): string {
  const now = new Date();
  const y = now.getUTCFullYear().toString();
  const M = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = now.getUTCDate().toString().padStart(2, "0");
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = now.getUTCMinutes().toString().padStart(2, "0");
  const s = now.getUTCSeconds().toString().padStart(2, "0");
  const datePart = `${y}${M}${d}_${h}${m}${s}`;
  const slug = slugify(requirement);
  return `run_${datePart}_${slug}`;
}
