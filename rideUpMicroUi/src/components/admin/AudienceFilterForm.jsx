import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { inputClass } from "./AdminUi";

const ROLE_OPTIONS = [
  { value: "ALL", label: "Tất cả người dùng" },
  { value: "DRIVER", label: "Chỉ Tài xế" },
  { value: "CUSTOMER", label: "Chỉ Hành khách" },
];

/**
 * Khối 1 - Phân khúc người nhận mục tiêu.
 */
function AudienceFilterForm({ value, onChange, provinces, recipientCount, isCounting }) {
  const [provinceKeyword, setProvinceKeyword] = useState("");
  const isDriver = value.targetRole === "DRIVER";

  const visibleProvinces = useMemo(() => {
    const keyword = provinceKeyword.trim().toLowerCase();
    return keyword ? provinces.filter((p) => p.name?.toLowerCase().includes(keyword)) : provinces;
  }, [provinces, provinceKeyword]);

  const toggleProvince = (id) => {
    const selected = new Set(value.provinceIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    onChange({ ...value, provinceIds: [...selected] });
  };

  const setReputation = (field, raw) => {
    const number = Math.max(0, Math.min(100, Number(raw)));
    const next = { ...value, [field]: number };
    if (next.minReputation > next.maxReputation) {
      if (field === "minReputation") next.maxReputation = number;
      else next.minReputation = number;
    }
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-700">Nhóm vai trò</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                value.targetRole === option.value
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="targetRole"
                value={option.value}
                checked={value.targetRole === option.value}
                onChange={() => onChange({ ...value, targetRole: option.value })}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {isDriver ? (
        <>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                Tỉnh hoạt động <span className="font-normal text-slate-400">({value.provinceIds.length ? `${value.provinceIds.length} đã chọn` : "tất cả tỉnh"})</span>
              </p>
              {value.provinceIds.length ? (
                <button type="button" onClick={() => onChange({ ...value, provinceIds: [] })} className="text-xs font-bold text-orange-600">
                  Bỏ chọn tất cả
                </button>
              ) : null}
            </div>
            <div className="relative mt-2">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input value={provinceKeyword} onChange={(e) => setProvinceKeyword(e.target.value)} placeholder="Tìm tỉnh..." className={`${inputClass} pl-8`} />
            </div>
            <div className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2">
              {visibleProvinces.map((province) => (
                <label key={province.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={value.provinceIds.includes(province.id)}
                    onChange={() => toggleProvince(province.id)}
                    className="accent-orange-500"
                  />
                  <span className="truncate">{province.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Điểm uy tín: <span className="text-orange-600">{value.minReputation} – {value.maxReputation}</span>
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                Từ điểm
                <input type="range" min={0} max={100} value={value.minReputation} onChange={(e) => setReputation("minReputation", e.target.value)} className="w-full accent-orange-500" />
              </label>
              <label className="text-xs text-slate-500">
                Đến điểm
                <input type="range" min={0} max={100} value={value.maxReputation} onChange={(e) => setReputation("maxReputation", e.target.value)} className="w-full accent-orange-500" />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button type="button" className="rounded-lg bg-red-50 px-2 py-1 font-semibold text-red-600" onClick={() => onChange({ ...value, minReputation: 0, maxReputation: 59 })}>
                Nhóm cần cảnh báo (&lt; 60)
              </button>
              <button type="button" className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-600" onClick={() => onChange({ ...value, minReputation: 90, maxReputation: 100 })}>
                Nhóm uy tín cao (≥ 90)
              </button>
              <button type="button" className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600" onClick={() => onChange({ ...value, minReputation: 0, maxReputation: 100 })}>
                Tất cả mức điểm
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-white">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Dự kiến gửi tới</p>
        <p className="text-2xl font-extrabold">{isCounting ? "Đang đếm…" : `${recipientCount ?? 0} người nhận`}</p>
      </div>
    </div>
  );
}

export default AudienceFilterForm;
