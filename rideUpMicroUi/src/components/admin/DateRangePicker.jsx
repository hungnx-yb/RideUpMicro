import { inputClass } from "./AdminUi";

function toIsoDate(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export const DATE_PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "7days", label: "7 ngày qua" },
  { key: "month", label: "Tháng này" },
  { key: "quarter", label: "Quý này" },
  { key: "custom", label: "Tùy chọn" },
];

/** Tính khoảng ngày [fromDate, toDate] (yyyy-MM-dd) theo preset */
export function resolvePresetRange(preset) {
  const today = new Date();
  const to = toIsoDate(today);
  switch (preset) {
    case "today":
      return { fromDate: to, toDate: to };
    case "7days": {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { fromDate: toIsoDate(from), toDate: to };
    }
    case "quarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      return { fromDate: toIsoDate(new Date(today.getFullYear(), quarterStartMonth, 1)), toDate: to };
    }
    case "month":
    default:
      return { fromDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), toDate: to };
  }
}

/**
 * Bộ chọn khoảng thời gian: preset nhanh + tùy chọn fromDate / toDate.
 */
function DateRangePicker({ preset, fromDate, toDate, onChange }) {
  const handlePreset = (event) => {
    const nextPreset = event.target.value;
    if (nextPreset === "custom") {
      onChange({ preset: nextPreset, fromDate, toDate });
      return;
    }
    onChange({ preset: nextPreset, ...resolvePresetRange(nextPreset) });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Khoảng thời gian</span>
        <select value={preset} onChange={handlePreset} className={`${inputClass} mt-1 min-w-[150px]`}>
          {DATE_PRESETS.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </label>
      {preset === "custom" ? (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Từ ngày</span>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => onChange({ preset, fromDate: e.target.value, toDate })}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Đến ngày</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => onChange({ preset, fromDate, toDate: e.target.value })}
              className={`${inputClass} mt-1`}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

export default DateRangePicker;
