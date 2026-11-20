import { useCallback, useEffect, useMemo, useState } from "react";
import { FaClipboardList, FaFilter, FaSearch } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, EmptyState, ModalShell, StatusBadge, formatDateTime, inputClass, useToast } from "../../components/admin/AdminUi";
import { getAuditLogsApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/authApi";

const SERVICES = ["identity-service", "booking-service", "trip-service", "notification-service"];
const ACTIONS = {
  UPDATE_COMMISSION_CONFIG: "Cập nhật hoa hồng & hạn mức",
  UPDATE_SYSTEM_TIMEOUT: "Cập nhật timeout SLA",
  UPDATE_FARE_BOUNDARY: "Cập nhật khung giá cước",
  SEND_BROADCAST: "Phát sóng thông báo",
  APPROVE_DRIVER: "Duyệt tài xế",
  REJECT_DRIVER: "Từ chối tài xế",
  APPROVE_VEHICLE: "Duyệt phương tiện",
  REJECT_VEHICLE: "Từ chối phương tiện",
};
const PAGE_SIZE = 20;

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** So sánh snapshot cũ / mới theo từng khóa cấp 1 */
function JsonDiff({ oldValue, newValue }) {
  const oldObj = parseJson(oldValue);
  const newObj = parseJson(newValue);
  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

  if (!isObject(oldObj) && !isObject(newObj)) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <pre className="overflow-x-auto rounded-xl bg-red-50 p-3 text-xs text-red-800">{oldValue || "(trống)"}</pre>
        <pre className="overflow-x-auto rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{newValue || "(trống)"}</pre>
      </div>
    );
  }

  const keys = [...new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="text-left uppercase text-slate-400">
            <th className="py-2 pr-3">Trường</th>
            <th className="py-2 pr-3">Giá trị cũ</th>
            <th className="py-2">Giá trị mới</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const before = oldObj ? JSON.stringify(oldObj[key]) : undefined;
            const after = newObj ? JSON.stringify(newObj[key]) : undefined;
            const changed = before !== after;
            return (
              <tr key={key} className={`border-t border-slate-100 ${changed ? "bg-amber-50/60" : ""}`}>
                <td className="py-1.5 pr-3 font-mono font-semibold text-slate-700">{key}</td>
                <td className={`break-all py-1.5 pr-3 font-mono ${changed ? "text-red-600 line-through" : "text-slate-500"}`}>{before ?? "—"}</td>
                <td className={`break-all py-1.5 font-mono ${changed ? "font-bold text-emerald-700" : "text-slate-500"}`}>{after ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdminAuditLogsPage() {
  const [filter, setFilter] = useState({ serviceName: "", action: "", keyword: "", fromDate: "", toDate: "" });
  const [applied, setApplied] = useState(filter);
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { showToast, toastElement } = useToast();

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await getAuditLogsApi({ ...applied, page, size: PAGE_SIZE }));
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không tải được nhật ký kiểm toán"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [applied, page, showToast]);

  useEffect(() => { load(); }, [load]);

  const items = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const updateFilter = (field) => (event) => setFilter((prev) => ({ ...prev, [field]: event.target.value }));
  const applyFilter = () => { setPage(0); setApplied({ ...filter }); };
  const summary = useMemo(() => (data ? `${data.totalElements} bản ghi` : ""), [data]);

  return (
    <AdminLayout
      title="Nhật ký kiểm toán"
      subtitle="Truy vết toàn bộ lịch sử thay đổi tham số hệ thống và thao tác duyệt của quản trị viên: ai sửa gì, lúc nào, giá trị trước và sau."
      icon={FaClipboardList}
    >
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Service
            <select value={filter.serviceName} onChange={updateFilter("serviceName")} className={`${inputClass} mt-1`}>
              <option value="">Tất cả</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Hành động
            <select value={filter.action} onChange={updateFilter("action")} className={`${inputClass} mt-1`}>
              <option value="">Tất cả</option>
              {Object.entries(ACTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Từ khóa
            <div className="relative mt-1">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input value={filter.keyword} onChange={updateFilter("keyword")} onKeyDown={(e) => e.key === "Enter" && applyFilter()} placeholder="Email, mô tả, mã đối tượng" className={`${inputClass} pl-8`} />
            </div>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Từ ngày
            <input type="date" value={filter.fromDate} onChange={updateFilter("fromDate")} className={`${inputClass} mt-1`} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Đến ngày
            <input type="date" value={filter.toDate} onChange={updateFilter("toDate")} className={`${inputClass} mt-1`} />
          </label>
          <Button onClick={applyFilter}><FaFilter /> Lọc</Button>
        </div>
      </Card>

      <Card title="Lịch sử thay đổi" description={summary} icon={FaClipboardList}>
        {isLoading ? (
          <EmptyState>Đang tải…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Không có bản ghi nào phù hợp.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-3">Thời gian</th>
                  <th className="py-3 pr-3">Người thực hiện</th>
                  <th className="py-3 pr-3">Service</th>
                  <th className="py-3 pr-3">Hành động</th>
                  <th className="py-3 pr-3">Mô tả</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap py-3 pr-3 text-slate-600">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 pr-3 font-semibold text-slate-800">{log.actorEmail || log.actorId || "Hệ thống"}</td>
                    <td className="py-3 pr-3"><StatusBadge tone="blue">{log.serviceName}</StatusBadge></td>
                    <td className="py-3 pr-3"><StatusBadge tone="amber">{ACTIONS[log.action] || log.action}</StatusBadge></td>
                    <td className="max-w-[320px] py-3 pr-3 text-slate-600">
                      {log.description}
                      {log.targetId ? <span className="block text-xs text-slate-400">{log.targetType}: {log.targetId}</span> : null}
                    </td>
                    <td className="py-3 text-right">
                      <button type="button" onClick={() => setSelected(log)} className="text-xs font-bold text-orange-600 hover:underline">
                        Xem thay đổi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Trang {page + 1}/{totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        ) : null}
      </Card>

      {selected ? (
        <ModalShell title={ACTIONS[selected.action] || selected.action} onClose={() => setSelected(null)} maxWidth="max-w-3xl">
          <div className="mb-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p><strong className="text-slate-800">Thời gian:</strong> {formatDateTime(selected.createdAt)}</p>
            <p><strong className="text-slate-800">Người thực hiện:</strong> {selected.actorEmail || selected.actorId || "Hệ thống"}</p>
            <p><strong className="text-slate-800">Service:</strong> {selected.serviceName}</p>
            <p className="break-all"><strong className="text-slate-800">Đối tượng:</strong> {selected.targetType} {selected.targetId}</p>
          </div>
          <JsonDiff oldValue={selected.oldValue} newValue={selected.newValue} />
        </ModalShell>
      ) : null}
      {toastElement}
    </AdminLayout>
  );
}

export default AdminAuditLogsPage;
