import { useEffect, useMemo, useState } from "react";
import { FaCalculator, FaRoute, FaSave, FaUndo } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, Field, formatDateTime, formatVnd, inputClass, useToast } from "../../components/admin/AdminUi";
import { estimateFareApi, getFareBoundaryApi, updateFareBoundaryApi } from "../../services/adminApi";
import { getAllProvinces } from "../../services/locationApi";
import { getApiErrorMessage } from "../../services/authApi";

const DEFAULT_FORM = { minPricePerKm: 1200, maxPricePerKm: 4000, roadFactor: 1.3, enabled: true };

function AdminFareBoundaryPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [route, setRoute] = useState({ start: "", end: "" });
  const [estimate, setEstimate] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const { showToast, toastElement } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const config = await getFareBoundaryApi();
        setSaved(config);
        setForm({
          minPricePerKm: Number(config.minPricePerKm),
          maxPricePerKm: Number(config.maxPricePerKm),
          roadFactor: Number(config.roadFactor),
          enabled: Boolean(config.enabled),
        });
      } catch (error) {
        showToast(getApiErrorMessage(error, "Không tải được khung giá cước"), "error");
      } finally {
        setIsLoading(false);
      }
    })();
    getAllProvinces().then((list) => setProvinces(list || [])).catch(() => {});
  }, [showToast]);

  const errors = useMemo(() => {
    const result = {};
    if (!(Number(form.minPricePerKm) > 0)) result.minPricePerKm = "Giá sàn phải lớn hơn 0";
    if (Number(form.maxPricePerKm) < Number(form.minPricePerKm)) result.maxPricePerKm = "Giá trần phải ≥ giá sàn";
    if (Number(form.roadFactor) < 1 || Number(form.roadFactor) > 2) result.roadFactor = "Hệ số trong khoảng 1.0 - 2.0";
    return result;
  }, [form]);

  // Khoảng giá xem trước theo tham số đang nhập (chưa lưu)
  const localRange = estimate?.distanceKm
    ? {
        min: Math.floor((Number(estimate.distanceKm) * Number(form.minPricePerKm)) / 1000) * 1000,
        max: Math.ceil((Number(estimate.distanceKm) * Number(form.maxPricePerKm)) / 1000) * 1000,
      }
    : null;

  const handleSave = async () => {
    if (Object.keys(errors).length) {
      showToast(Object.values(errors)[0], "error");
      return;
    }
    try {
      setIsSaving(true);
      const updated = await updateFareBoundaryApi({
        minPricePerKm: Number(form.minPricePerKm),
        maxPricePerKm: Number(form.maxPricePerKm),
        roadFactor: Number(form.roadFactor),
        enabled: form.enabled,
      });
      setSaved(updated);
      showToast("Cập nhật khung giá cước thành công");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Cập nhật khung giá thất bại"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEstimate = async () => {
    if (!route.start || !route.end) {
      showToast("Chọn tỉnh đi và tỉnh đến", "error");
      return;
    }
    try {
      setIsEstimating(true);
      setEstimate(await estimateFareApi(route.start, route.end));
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không ước tính được quãng đường"), "error");
    } finally {
      setIsEstimating(false);
    }
  };

  const provinceSelect = (key, label) => (
    <Field label={label}>
      <select value={route[key]} onChange={(e) => setRoute((p) => ({ ...p, [key]: e.target.value }))} className={inputClass}>
        <option value="">— Chọn tỉnh —</option>
        {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </Field>
  );

  return (
    <AdminLayout
      title="Khung giá cước theo km"
      subtitle="Chặn tài xế phá giá hoặc đội giá: giá vé 1 ghế phải nằm trong [Quãng đường × giá sàn, Quãng đường × giá trần]. Quãng đường = khoảng cách giữa tâm 2 tỉnh × hệ số đường bộ. Chuyến nội tỉnh không áp dụng."
      icon={FaRoute}
      actions={(
        <>
          <Button variant="secondary" onClick={() => setForm(DEFAULT_FORM)} disabled={isLoading}>
            <FaUndo /> Khôi phục mặc định
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving || Object.keys(errors).length > 0}>
            <FaSave /> {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </>
      )}
    >
      {saved?.updatedAt ? <p className="mb-4 text-xs text-slate-500">Cập nhật lần cuối: {formatDateTime(saved.updatedAt)}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Tham số khung giá" icon={FaRoute}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giá sàn (đ/km/ghế)" error={errors.minPricePerKm}>
              <input type="number" step={100} min={1} value={form.minPricePerKm} onChange={(e) => setForm((p) => ({ ...p, minPricePerKm: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Giá trần (đ/km/ghế)" error={errors.maxPricePerKm}>
              <input type="number" step={100} min={1} value={form.maxPricePerKm} onChange={(e) => setForm((p) => ({ ...p, maxPricePerKm: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Hệ số đường bộ" hint="Đường bộ thực tế dài hơn đường chim bay ~20-40%" error={errors.roadFactor}>
              <input type="number" step={0.05} min={1} max={2} value={form.roadFactor} onChange={(e) => setForm((p) => ({ ...p, roadFactor: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Trạng thái kiểm tra">
              <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-3">
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} className="h-4 w-4 accent-orange-500" />
                <span className="text-sm font-semibold text-slate-700">{form.enabled ? "Đang bật chặn giá" : "Tạm tắt (cho phép mọi mức giá)"}</span>
              </label>
            </Field>
          </div>
        </Card>

        <Card title="Thử ước tính khoảng giá theo tuyến" icon={FaCalculator}>
          <div className="grid gap-4 sm:grid-cols-2">
            {provinceSelect("start", "Tỉnh đi")}
            {provinceSelect("end", "Tỉnh đến")}
          </div>
          <Button className="mt-4" variant="secondary" onClick={handleEstimate} disabled={isEstimating}>
            <FaCalculator /> {isEstimating ? "Đang tính..." : "Ước tính"}
          </Button>

          {estimate ? (
            estimate.distanceKm ? (
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Quãng đường ước tính</p>
                <p className="text-3xl font-extrabold">{Number(estimate.distanceKm).toLocaleString("vi-VN")} km</p>
                <p className="mt-3 text-sm">
                  Giá vé hợp lệ (theo tham số đang nhập):{" "}
                  <strong>{formatVnd(localRange.min)} – {formatVnd(localRange.max)}</strong> / ghế
                </p>
                <p className="mt-1 text-xs text-orange-100">
                  Theo cấu hình đã lưu: {formatVnd(estimate.minPrice)} – {formatVnd(estimate.maxPrice)}
                  {estimate.applicable ? "" : " (đang tắt kiểm tra)"}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Không áp dụng khung giá cho tuyến này (cùng tỉnh hoặc thiếu tọa độ tỉnh).
              </p>
            )
          ) : null}
        </Card>
      </div>
      {toastElement}
    </AdminLayout>
  );
}

export default AdminFareBoundaryPage;
