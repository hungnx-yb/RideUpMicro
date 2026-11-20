import { FaBell, FaHistory } from "react-icons/fa";
import { EmptyState, StatusBadge, formatVnd } from "./AdminUi";

const STATUS_META = {
  BLOCKED: { label: "Quá hạn mức (Bị khóa)", tone: "red" },
  WARNING: { label: "Sắp chạm hạn mức", tone: "amber" },
  NORMAL: { label: "Bình thường", tone: "green" },
};

/**
 * Sổ công nợ tài xế (Driver Debt Ledger).
 */
function DriverDebtTable({ rows, provinceNameById, onViewHistory, onRemind, remindingId }) {
  if (!rows.length) {
    return <EmptyState>Không có tài xế nào phù hợp bộ lọc.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-3 pr-3">Tài xế</th>
            <th className="py-3 pr-3">SĐT</th>
            <th className="py-3 pr-3">Biển số</th>
            <th className="py-3 pr-3">Tỉnh hoạt động</th>
            <th className="py-3 pr-3 text-right">Nợ hiện tại</th>
            <th className="py-3 pr-3 text-right">Hạn mức</th>
            <th className="py-3 pr-3">Trạng thái</th>
            <th className="py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = STATUS_META[row.debtStatus] || STATUS_META.NORMAL;
            const ratio = row.creditLimit > 0 ? Math.min(100, (Number(row.systemDebt) / Number(row.creditLimit)) * 100) : 0;
            const provinces = (row.operatingProvinceIds || [])
              .map((id) => provinceNameById[id] || id)
              .join(", ");
            return (
              <tr key={row.driverProfileId} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-3">
                  <p className="font-bold text-slate-900">{row.fullName || "Chưa cập nhật"}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                  <p className="text-xs text-slate-400">Uy tín: {row.reputationScore ?? "—"} · {row.driverRating ? `${Number(row.driverRating).toFixed(1)}★` : "—"}</p>
                </td>
                <td className="py-3 pr-3 text-slate-600">{row.phoneNumber || "—"}</td>
                <td className="py-3 pr-3 font-semibold text-slate-700">{row.plateNumber || "—"}</td>
                <td className="max-w-[200px] py-3 pr-3 text-slate-600">{provinces || "—"}</td>
                <td className="py-3 pr-3 text-right">
                  <p className="font-extrabold text-slate-900">{formatVnd(row.systemDebt)}</p>
                  <div className="ml-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${ratio >= 100 ? "bg-red-500" : ratio >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </td>
                <td className="py-3 pr-3 text-right text-slate-600">{formatVnd(row.creditLimit)}</td>
                <td className="py-3 pr-3"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                <td className="py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onViewHistory(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <FaHistory /> Lịch sử nợ
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemind(row)}
                      disabled={!row.userId || Number(row.systemDebt) <= 0 || remindingId === row.userId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <FaBell /> {remindingId === row.userId ? "Đang gửi..." : "Nhắc nợ"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DriverDebtTable;
