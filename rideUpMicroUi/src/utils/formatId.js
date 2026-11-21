/**
 * Chuẩn hóa mã định danh (Hồ sơ tài xế, Phương tiện) ngắn gọn nhưng đảm bảo tính duy nhất:
 * Lấy 4 ký tự đầu (prefix/timestamp) và 6 ký tự cuối (unique counter / entropy) kèm tiền tố phân loại HS- / XE-
 * để đảm bảo tuyệt đối không trùng lặp (tránh đụng độ counter MongoDB ObjectId hay UUID),
 * đồng thời giữ giao diện gọn gàng, chuyên nghiệp.
 */
export function formatDriverProfileId(id) {
  if (!id) return "-";
  const str = String(id).trim();
  // Nếu đã được backend tạo chuẩn hóa (ví dụ: HS-2611-K8P9M2) thì hiển thị nguyên bản
  if (str.startsWith("HS-")) return str;
  const clean = str.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length <= 10) return `HS-${clean.toUpperCase()}`;
  return `HS-${clean.slice(0, 4).toUpperCase()}..${clean.slice(-6).toUpperCase()}`;
}

export function formatVehicleId(id) {
  if (!id) return "-";
  const str = String(id).trim();
  // Nếu đã được backend tạo chuẩn hóa (ví dụ: XE-2611-A4N7R8) thì hiển thị nguyên bản
  if (str.startsWith("XE-")) return str;
  const clean = str.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length <= 10) return `XE-${clean.toUpperCase()}`;
  return `XE-${clean.slice(0, 4).toUpperCase()}..${clean.slice(-6).toUpperCase()}`;
}

