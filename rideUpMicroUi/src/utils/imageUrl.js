const SUPABASE_PUBLIC_BASE_URL = (import.meta.env.VITE_SUPABASE_PUBLIC_BASE_URL || "").trim();
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET || "").trim();

/**
 * Build a renderable image URL from either an absolute URL or a storage object path.
 */
export function resolveImageUrl(objectPathOrUrl) {
  if (!objectPathOrUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(objectPathOrUrl)) {
    return objectPathOrUrl;
  }

  const normalizedPath = String(objectPathOrUrl).replace(/^\/+/, "");

  if (SUPABASE_PUBLIC_BASE_URL) {
    return `${SUPABASE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${normalizedPath}`;
  }

  if (SUPABASE_URL && SUPABASE_BUCKET) {
    return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${SUPABASE_BUCKET}/${normalizedPath}`;
  }

  return objectPathOrUrl;
}
