const KEY = 'jicui_customer_id_v1';
let cached: string | null = null;

/** Anonymous per-browser ID. It scopes this device's orders and taste memory; it is not an account. */
export function customerId(): string {
  if (cached) return cached;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && /^[a-zA-Z0-9-]{16,64}$/.test(saved)) return (cached = saved);
    const created = crypto.randomUUID();
    localStorage.setItem(KEY, created);
    return (cached = created);
  } catch {
    // Storage blocked: keep an in-memory ID for this tab only.
    return (cached = crypto.randomUUID());
  }
}
