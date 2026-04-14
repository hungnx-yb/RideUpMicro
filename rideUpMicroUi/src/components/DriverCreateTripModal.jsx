import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCarSide,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaMapMarkedAlt,
  FaRoute,
  FaTimes,
} from "react-icons/fa";
import { getApiErrorMessage } from "../services/authApi";
import { getAllProvinces, getAllWards } from "../services/locationApi";
import { createTripApi } from "../services/tripApi";

const initialForm = {
  startProvinceId: "",
  endProvinceId: "",
  startWardIds: [],
  endWardIds: [],
  note: "",
  departureTime: "",
  seatTotal: "",
  priceVnd: "",
};

function SimpleDropdown({ label, placeholder, value, options, onChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (!event.target.closest("[data-dropdown]") && !event.target.closest("[data-dropdown-panel]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find((item) => item.id === value)?.name;

  return (
    <div className="relative" data-dropdown>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
      >
        <span className={selectedLabel ? "text-slate-800" : "text-slate-400"}>{selectedLabel || placeholder}</span>
        <FaChevronDown className="text-slate-400" size={12} />
      </button>

      {open ? (
        <div
          data-dropdown-panel
          className="absolute left-0 top-[calc(100%+6px)] z-20 w-full rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="max-h-52 overflow-auto py-2">
            {options?.length ? (
              options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start px-3 py-2 text-left text-sm hover:bg-emerald-50 ${
                    item.id === value ? "bg-emerald-50 text-emerald-700" : "text-slate-800"
                  }`}
                >
                  {item.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-500">Không có dữ liệu</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MultiSelectDropdown({ placeholder, values, options, onChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (!event.target.closest("[data-multi-dropdown]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedItems = options.filter((item) => values.includes(item.id));

  const toggleValue = (value) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  };

  return (
    <div className="relative" data-multi-dropdown>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
      >
        <span className={selectedItems.length ? "text-slate-700" : "text-slate-400"}>
          {selectedItems.length ? `Đã chọn ${selectedItems.length} mục` : placeholder}
        </span>
        <FaChevronDown className="text-slate-400" size={12} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-52 overflow-auto py-2">
            {options?.length ? (
              options.map((item) => {
                const checked = values.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleValue(item.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50 ${
                      checked ? "bg-emerald-50 text-emerald-700" : "text-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={checked}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-500"
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-xs text-slate-500">Không có dữ liệu</p>
            )}
          </div>
        </div>
      ) : null}

      {selectedItems.length ? (
        <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Đã chọn</p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              Bỏ tất cả
            </button>
          </div>

          <div className="max-h-20 overflow-auto">
            <div className="flex flex-wrap gap-1.5">
              {selectedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleValue(item.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <span>{item.name}</span>
                  <span className="text-[10px]">x</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Chưa chọn mục nào</p>
      )}
    </div>
  );
}

function DriverCreateTripModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [provinces, setProvinces] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchProvinces = async () => {
      try {
        const items = await getAllProvinces();
        setProvinces(items || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    };

    fetchProvinces();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fetchWards = async () => {
      if (!form.startProvinceId) {
        setStartWards([]);
        setForm((previous) => ({ ...previous, startWardIds: [] }));
        return;
      }

      try {
        const wards = await getAllWards(form.startProvinceId);
        setStartWards(wards || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    };

    fetchWards();
  }, [open, form.startProvinceId]);

  useEffect(() => {
    if (!open) return;
    const fetchWards = async () => {
      if (!form.endProvinceId) {
        setEndWards([]);
        setForm((previous) => ({ ...previous, endWardIds: [] }));
        return;
      }

      try {
        const wards = await getAllWards(form.endProvinceId);
        setEndWards(wards || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    };

    fetchWards();
  }, [open, form.endProvinceId]);

  const canSubmit = useMemo(() => {
    return (
      form.startProvinceId &&
      form.endProvinceId &&
      form.startWardIds.length > 0 &&
      form.endWardIds.length > 0 &&
      form.departureTime &&
      Number(form.seatTotal) > 0 &&
      Number(form.priceVnd) > 0
    );
  }, [form]);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSubmitting(true);
      const provinceNameMap = new Map(provinces.map((province) => [province.id, province.name]));
      const startWardNameMap = new Map(startWards.map((ward) => [ward.id, ward.name]));
      const endWardNameMap = new Map(endWards.map((ward) => [ward.id, ward.name]));
      const startAddressText = provinceNameMap.get(form.startProvinceId);
      const endAddressText = provinceNameMap.get(form.endProvinceId);

      const payload = {
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        startAddressText: startAddressText || undefined,
        endAddressText: endAddressText || undefined,
        note: form.note?.trim() || undefined,
        departureTime: form.departureTime ? new Date(form.departureTime).toISOString() : null,
        seatTotal: Number(form.seatTotal),
        priceVnd: Number(form.priceVnd),
        stops: [
          ...form.startWardIds.map((wardId) => ({
            stopType: "PICKUP",
            wardId,
            addressText: startWardNameMap.get(wardId) || undefined,
          })),
          ...form.endWardIds.map((wardId) => ({
            stopType: "DROPOFF",
            wardId,
            addressText: endWardNameMap.get(wardId) || undefined,
          })),
        ],
      };

      await createTripApi(payload);
      setSuccessMessage("Tạo chuyến thành công. Bạn có thể xem trong bảng điều khiển.");
      setForm((previous) => ({ ...initialForm, priceVnd: previous.priceVnd }));
      if (typeof onCreated === "function") {
        onCreated();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setStartWards([]);
    setEndWards([]);
    setErrorMessage("");
    setSuccessMessage("");
    if (typeof onClose === "function") onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-auto bg-slate-900/60 px-3 py-8 sm:px-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FaCarSide />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Tài xế</p>
              <h2 className="text-xl font-bold text-slate-900">Tạo chuyến mới</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Đóng"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-5 pt-4 sm:px-5 lg:px-6">
          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <FaCheckCircle />
              {successMessage}
            </div>
          ) : null}

          <div className="space-y-5">
            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FaRoute className="text-emerald-600" />
                Tuyến đường
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <FaMapMarkedAlt className="text-emerald-600" />
                    Tỉnh/Thành đi
                  </span>
                  <SimpleDropdown
                    value={form.startProvinceId}
                    onChange={(val) => handleChange("startProvinceId", val)}
                    placeholder="Chọn tỉnh/thành"
                    options={provinces}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <FaMapMarkedAlt className="text-emerald-600" />
                    Tỉnh/Thành đến
                  </span>
                  <SimpleDropdown
                    value={form.endProvinceId}
                    onChange={(val) => handleChange("endProvinceId", val)}
                    placeholder="Chọn tỉnh/thành"
                    options={provinces}
                  />
                </label>
              </div>

            </section>

            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FaMapMarkedAlt className="text-emerald-600" />
                Điểm đón / trả
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <FaMapMarkedAlt className="text-emerald-600" />
                    Phường/Xã đón
                  </span>
                  <MultiSelectDropdown
                    values={form.startWardIds}
                    onChange={(vals) => handleChange("startWardIds", vals)}
                    placeholder="Chọn phường/xã"
                    options={startWards}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <FaMapMarkedAlt className="text-emerald-600" />
                    Phường/Xã trả
                  </span>
                  <MultiSelectDropdown
                    values={form.endWardIds}
                    onChange={(vals) => handleChange("endWardIds", vals)}
                    placeholder="Chọn phường/xã"
                    options={endWards}
                  />
                </label>
              </div>

              {/* Đã bỏ địa chỉ đón và trả */}
            </section>

            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.2)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FaCalendarAlt className="text-emerald-600" />
                Thời gian & giá
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  <span className="flex items-center gap-2">
                    <FaClock className="text-emerald-600" />
                    Thời gian xuất phát
                  </span>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
                    value={form.departureTime}
                    onChange={(event) => handleChange("departureTime", event.target.value)}
                    required
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Số ghế trống
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
                    value={form.seatTotal}
                    onChange={(event) => handleChange("seatTotal", event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="mt-3">
                <label className="text-sm font-medium text-slate-700">
                  Giá vé (VND)
                  <input
                    type="number"
                    min="1000"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
                    value={form.priceVnd}
                    onChange={(event) => handleChange("priceVnd", event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="mt-3">
                <label className="text-sm font-medium text-slate-700">
                  Ghi chú (tùy chọn)
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="Ví dụ: Xe có trung chuyển, không hút thuốc, mang hành lý gọn..."
                    value={form.note}
                    onChange={(event) => handleChange("note", event.target.value)}
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <FaArrowLeft />
                Đóng
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                  !canSubmit || isSubmitting
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-slate-900 hover:bg-black"
                }`}
              >
                {isSubmitting ? "Đang tạo..." : "Tạo chuyến"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DriverCreateTripModal;
