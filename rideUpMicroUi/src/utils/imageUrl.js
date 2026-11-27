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

/**
 * Ảnh giấy tờ xe ngoài mặt trước đăng ký: mặt sau đăng ký, đăng kiểm, bảo hiểm.
 * Hồ sơ cũ (chưa có registrationImageBack/inspectionImage) lưu mặt sau đăng ký xe vào insuranceImage.
 */
export function vehicleBackAndExtraDocs(vehicleOrDriver) {
  const isLegacy = !vehicleOrDriver?.registrationImageBack && !vehicleOrDriver?.inspectionImage;
  if (isLegacy) {
    return [{ label: "Đăng ký xe mặt sau", url: resolveImageUrl(vehicleOrDriver?.insuranceImage) }];
  }
  return [
    { label: "Đăng ký xe mặt sau", url: resolveImageUrl(vehicleOrDriver?.registrationImageBack) },
    { label: "Giấy đăng kiểm", url: resolveImageUrl(vehicleOrDriver?.inspectionImage) },
    { label: "Bảo hiểm xe", url: resolveImageUrl(vehicleOrDriver?.insuranceImage) },
  ];
}
