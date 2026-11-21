import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaCoins,
  FaExchangeAlt,
  FaFilter,
  FaHandHoldingUsd,
  FaMoneyBillWave,
  FaSearch,
  FaUserLock,
} from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, EmptyState, KpiCard, ModalShell, StatusBadge, formatDateTime, formatVnd, inputClass, useToast } from "../../components/admin/AdminUi";
import DateRangePicker, { resolvePresetRange } from "../../components/admin/DateRangePicker";
import DriverDebtTable from "../../components/admin/DriverDebtTable";
import {
  getDriverDebtTransactionsApi,
  getDriverDebtsApi,
  getRevenueKpisApi,
  sendBroadcastApi,
} from "../../services/adminApi";
import { getAllProvinces } from "../../services/locationApi";
import { getApiErrorMessage } from "../../services/authApi";

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "CASH", label: "Tiền mặt (CASH)" },
  { value: "STRIPE", label: "Stripe" },
];

const TX_TYPE_LABEL = {
  CASH_COMMISSION: { label: "Hoa hồng cuốc tiền mặt", tone: "amber" },
  STRIPE_COMMISSION: { label: "Hoa hồng cuốc Stripe", tone: "blue" },
  STRIPE_OFFSET: { label: "Cấn trừ qua Stripe", tone: "green" },
  MANUAL_PAYMENT: { label: "Tài xế nộp tiền", tone: "green" },
  ADJUSTMENT: { label: "Điều chỉnh", tone: "slate" },
};

function formatYAxisLabel(val) {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)} tr`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
  if (val === 0) return "0đ";
  return `${val}đ`;
}

function DailyRevenueChart({ series }) {
  if (!series || !series.length) return <EmptyState>Chưa có dữ liệu trong kỳ.</EmptyState>;

  const rawMax = Math.max(1, ...series.map((p) => Number(p.gmv || 0)));
  const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(rawMax))));
  const normalized = rawMax / magnitude;
  let niceFactor = 10;
  if (normalized <= 1.2) niceFactor = 1.2;
  else if (normalized <= 2) niceFactor = 2;
  else if (normalized <= 5) niceFactor = 5;
  else niceFactor = 10;
  const max = Math.max(10000, Math.ceil(normalized / niceFactor) * niceFactor * magnitude);

  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const showEvery = Math.max(1, Math.ceil(series.length / 12));

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-2.5">
        {/* Trục tung (Y-Axis) */}
        <div className="flex w-16 shrink-0 flex-col justify-between py-1 text-right text-[11px] font-semibold text-slate-400">
          {yTicks.map((tick, idx) => (
            <span key={idx} className="leading-none">
              {formatYAxisLabel(tick)}
            </span>
          ))}
        </div>

        {/* Vùng vẽ biểu đồ kèm lưới ngang */}
        <div className="relative flex-1">
          {/* Lưới ngang (Gridlines) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
            {yTicks.map((_, idx) => (
              <div key={idx} className="w-full border-b border-dashed border-slate-200" />
            ))}
          </div>

          {/* Các cột bar */}
          <div className="relative flex h-52 items-end gap-1.5 overflow-x-auto pb-1 pt-2">
            {series.map((point, index) => {
              const cash = Number(point.cashGmv || 0);
              const stripe = Number(point.stripeGmv || 0);
              const total = cash + stripe;
              const heightPct = Math.min(100, Math.max(2, (total / max) * 100));
              const stripePct = total > 0 ? (stripe / total) * 100 : 0;
              const cashPct = total > 0 ? (cash / total) * 100 : 0;

              return (
                <div key={point.date} className="group relative flex h-full min-w-[16px] flex-1 flex-col justify-end">
                  {/* Tooltip khi hover */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900/95 p-2.5 text-xs text-white shadow-xl backdrop-blur group-hover:block">
                    <p className="font-bold text-orange-400">{point.date}</p>
                    <p className="mt-1 font-semibold">Tổng GMV: {formatVnd(point.gmv)}</p>
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-400" />
                        Tiền mặt: {formatVnd(cash)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        Stripe: {formatVnd(stripe)}
                      </p>
                      <p className="text-slate-400">{point.bookings} vé thành công</p>
                    </div>
                  </div>

                  {/* Cột dữ liệu xếp chồng */}
                  <div
                    className="w-full overflow-hidden rounded-t-sm transition-all group-hover:brightness-110"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="w-full bg-sky-500" style={{ height: `${stripePct}%` }} />
                    <div className="w-full bg-orange-400" style={{ height: `${cashPct}%` }} />
                  </div>

                  {/* Nhãn ngày tháng trục hoành */}
                  <span
                    className={`mt-1.5 block text-center text-[10px] font-medium text-slate-400 ${
                      index % showEvery === 0 ? "" : "invisible"
                    }`}
                  >
                    {point.date.slice(8, 10)}/{point.date.slice(5, 7)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chú thích biểu đồ (Legend) */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex gap-4 font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Tiền mặt (CASH)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> Thanh toán Stripe
          </span>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">Đơn vị trục tung: VNĐ</p>
      </div>
    </div>
  );
}

function AdminRevenueAnalyticsPage() {
  const initialRange = resolvePresetRange("month");
  const [filter, setFilter] = useState({ preset: "month", ...initialRange, paymentMethod: "ALL" });
  const [appliedFilter, setAppliedFilter] = useState({ preset: "month", ...initialRange, paymentMethod: "ALL" });
  const [kpis, setKpis] = useState(null);
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);

  const [debts, setDebts] = useState([]);
  const [debtStatus, setDebtStatus] = useState("ALL");
  const [debtKeyword, setDebtKeyword] = useState("");
  const [isLoadingDebts, setIsLoadingDebts] = useState(true);
  const [provinceNameById, setProvinceNameById] = useState({});
  const [historyDriver, setHistoryDriver] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [remindingId, setRemindingId] = useState("");
  const { showToast, toastElement } = useToast();

  const loadKpis = useCallback(async (params) => {
    try {
      setIsLoadingKpis(true);
      setKpis(await getRevenueKpisApi(params));
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không tải được số liệu doanh thu"), "error");
    } finally {
      setIsLoadingKpis(false);
    }
  }, [showToast]);

  const loadDebts = useCallback(async () => {
    try {
      setIsLoadingDebts(true);
      setDebts(await getDriverDebtsApi({ status: debtStatus }));
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không tải được sổ công nợ tài xế"), "error");
    } finally {
      setIsLoadingDebts(false);
    }
  }, [debtStatus, showToast]);

  useEffect(() => { loadKpis(appliedFilter); }, [appliedFilter, loadKpis]);
  useEffect(() => { loadDebts(); }, [loadDebts]);
  useEffect(() => {
    getAllProvinces()
      .then((list) => setProvinceNameById(Object.fromEntries((list || []).map((p) => [p.id, p.name]))))
      .catch(() => {});
  }, []);

  const filteredDebts = useMemo(() => {
    const keyword = debtKeyword.trim().toLowerCase();
    if (!keyword) return debts;
    return debts.filter((row) =>
      [row.fullName, row.email, row.phoneNumber, row.plateNumber].some((v) => v && v.toLowerCase().includes(keyword)));
  }, [debts, debtKeyword]);

  const openHistory = async (row) => {
    setHistoryDriver(row);
    setHistoryRows([]);
    if (!row.userId) return;
    try {
      setIsLoadingHistory(true);
      setHistoryRows(await getDriverDebtTransactionsApi(row.userId));
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không tải được lịch sử nợ"), "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRemind = async (row) => {
    try {
      setRemindingId(row.userId);
      await sendBroadcastApi({
        title: "Nhắc thanh toán công nợ hoa hồng",
        summary: `Công nợ hiện tại của bạn là ${formatVnd(row.systemDebt)} (hạn mức ${formatVnd(row.creditLimit)}). Vui lòng thanh toán để tiếp tục nhận chuyến.`,
        content: `Xin chào ${row.fullName || "bạn"},\n\nCông nợ hoa hồng hiện tại của bạn là ${formatVnd(row.systemDebt)}. Khi công nợ chạm hạn mức ${formatVnd(row.creditLimit)}, tài khoản sẽ tạm khóa nhận chuyến tiền mặt.\n\nVui lòng vào mục Ví tài xế để thanh toán. Cảm ơn bạn đã đồng hành cùng RideUp!`,
        deepLink: "rideup://wallet",
        targetUserIds: [row.userId],
        channels: ["IN_APP", "WEBSOCKET"],
        category: "DEBT_REMINDER",
      });
      showToast(`Đã gửi nhắc nợ tới ${row.fullName || row.email}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Gửi nhắc nợ thất bại"), "error");
    } finally {
      setRemindingId("");
    }
  };

  const series = kpis?.dailySeries || [];

  return (
    <AdminLayout
      title="Doanh thu & Công nợ"
      subtitle="Tổng quan GMV, doanh thu hoa hồng sàn, dòng tiền tiền mặt / Stripe và theo dõi công nợ hoa hồng của tài xế."
      icon={FaChartLine}
    >
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker
            preset={filter.preset}
            fromDate={filter.fromDate}
            toDate={filter.toDate}
            onChange={(next) => setFilter((prev) => ({ ...prev, ...next }))}
          />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Thanh toán</span>
            <select
              value={filter.paymentMethod}
              onChange={(e) => setFilter((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className={`${inputClass} mt-1 min-w-[160px]`}
            >
              {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <Button onClick={() => setAppliedFilter({ ...filter })} disabled={isLoadingKpis}>
            <FaFilter /> Lọc dữ liệu
          </Button>
        </div>
      </Card>

      {kpis && !kpis.financeAvailable ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Không lấy được dữ liệu hoa hồng/công nợ từ identity-service. Các chỉ số GMV vẫn chính xác.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FaMoneyBillWave}
          label="Tổng GMV giao dịch"
          value={isLoadingKpis ? "…" : formatVnd(kpis?.totalGmv)}
          hint={kpis ? `${kpis.completedBookings} vé hoàn thành · TB ${formatVnd(kpis.averageTicketValue)}/vé` : ""}
          tone="blue"
        />
        <KpiCard
          icon={FaCoins}
          label="Doanh thu hoa hồng sàn"
          value={isLoadingKpis ? "…" : formatVnd(kpis?.commissionRevenue)}
          hint={kpis ? `Tiền mặt ${formatVnd(kpis.cashCommission)} · Stripe ${formatVnd(kpis.stripeCommission)}` : ""}
          tone="orange"
        />
        <KpiCard
          icon={FaUserLock}
          label="Công nợ đang treo"
          value={isLoadingKpis ? "…" : formatVnd(kpis?.outstandingDebt)}
          hint={kpis ? `${kpis.driversWithDebt} tài xế đang nợ · ${kpis.driversOverLimit} bị khóa` : ""}
          tone="red"
        />
        <KpiCard
          icon={FaExchangeAlt}
          label="Nợ đã cấn trừ qua Stripe"
          value={isLoadingKpis ? "…" : formatVnd(kpis?.stripeOffsetRecovered)}
          hint={kpis ? `Tài xế tự nộp thêm ${formatVnd(kpis.manualDebtPaid)}` : ""}
          tone="emerald"
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="GMV theo ngày" description={kpis ? `${kpis.fromDate} → ${kpis.toDate}` : ""} icon={FaChartLine}>
          <DailyRevenueChart series={series} />
        </Card>
        <Card title="Cơ cấu dòng tiền" icon={FaHandHoldingUsd}>
          {kpis ? (
            <div className="space-y-4 text-sm">
              {[{ label: "Tiền mặt", value: kpis.cashGmv, color: "bg-orange-400" }, { label: "Stripe", value: kpis.stripeGmv, color: "bg-sky-500" }].map((item) => {
                const pct = Number(kpis.totalGmv) > 0 ? Math.round((Number(item.value) / Number(kpis.totalGmv)) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{item.label}</span>
                      <span>{formatVnd(item.value)} ({pct}%)</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                Vé hủy / hết hạn trong kỳ: <strong className="text-slate-800">{kpis.cancelledBookings}</strong>
                <br />
                Hạn mức nợ hiện hành: <strong className="text-slate-800">{formatVnd(kpis.creditLimit)}</strong>
              </div>
            </div>
          ) : <EmptyState>Đang tải…</EmptyState>}
        </Card>
      </div>

      <Card
        className="mt-6"
        title="Sổ công nợ tài xế"
        description="Tài xế có công nợ ≥ hạn mức bị khóa nhận chuyến tiền mặt; tự động mở khóa khi nộp nợ hoặc được cấn trừ qua Stripe."
        icon={FaUserLock}
        actions={(
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                value={debtKeyword}
                onChange={(e) => setDebtKeyword(e.target.value)}
                placeholder="Tên, SĐT, biển số..."
                className={`${inputClass} w-56 pl-8`}
              />
            </div>
            <select value={debtStatus} onChange={(e) => setDebtStatus(e.target.value)} className={`${inputClass} w-auto`}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="BLOCKED">Quá hạn mức (Bị khóa)</option>
              <option value="WARNING">Sắp chạm hạn mức</option>
              <option value="NORMAL">Bình thường</option>
            </select>
          </div>
        )}
      >
        {isLoadingDebts ? (
          <EmptyState>Đang tải sổ công nợ…</EmptyState>
        ) : (
          <DriverDebtTable
            rows={filteredDebts}
            provinceNameById={provinceNameById}
            onViewHistory={openHistory}
            onRemind={handleRemind}
            remindingId={remindingId}
          />
        )}
      </Card>

      {historyDriver ? (
        <ModalShell title={`Lịch sử công nợ · ${historyDriver.fullName || historyDriver.email}`} onClose={() => setHistoryDriver(null)} maxWidth="max-w-4xl">
          {isLoadingHistory ? (
            <EmptyState>Đang tải…</EmptyState>
          ) : historyRows.length === 0 ? (
            <EmptyState>Chưa có biến động công nợ nào được ghi nhận.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                    <th className="py-2 pr-3">Thời gian</th>
                    <th className="py-2 pr-3">Loại</th>
                    <th className="py-2 pr-3 text-right">Giá trị vé</th>
                    <th className="py-2 pr-3 text-right">Hoa hồng</th>
                    <th className="py-2 pr-3 text-right">Biến động nợ</th>
                    <th className="py-2 text-right">Nợ sau</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((tx) => {
                    const meta = TX_TYPE_LABEL[tx.type] || { label: tx.type, tone: "slate" };
                    const change = Number(tx.debtChange || 0);
                    return (
                      <tr key={tx.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-slate-600">{formatDateTime(tx.createdAt)}</td>
                        <td className="py-2 pr-3"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                        <td className="py-2 pr-3 text-right">{tx.grossAmount != null ? formatVnd(tx.grossAmount) : "—"}</td>
                        <td className="py-2 pr-3 text-right">
                          {tx.commissionAmount != null ? `${formatVnd(tx.commissionAmount)} (${(Number(tx.commissionRate) * 100).toFixed(1)}%)` : "—"}
                        </td>
                        <td className={`py-2 pr-3 text-right font-bold ${change > 0 ? "text-red-600" : change < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {change > 0 ? "+" : ""}{formatVnd(change)}
                        </td>
                        <td className="py-2 text-right font-semibold text-slate-800">{formatVnd(tx.debtAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ModalShell>
      ) : null}
      {toastElement}
    </AdminLayout>
  );
}

export default AdminRevenueAnalyticsPage;
