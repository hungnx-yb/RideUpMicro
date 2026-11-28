import { useEffect, useMemo, useRef, useState } from "react";
import { FaCalculator, FaPercentage, FaQuestionCircle, FaSave, FaShieldAlt, FaWallet } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, Field, formatDateTime, formatVnd, inputClass, useToast } from "../../components/admin/AdminUi";
import { getCommissionConfigApi, updateCommissionConfigApi } from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/authApi";

// Giá trị mặc định theo đặc tả ADM-FEAT-01 (đơn vị hiển thị: %)
const DEFAULT_FORM = {
  baseRate: 18,
  minRate: 12,
  maxRate: 25,
  ratingBenchmark: 4.5,
  ratingStep: 2,
  reputationBenchmark: 80,
  reputationStep: 1,
  creditLimit: 500000,
  minAcceptScore: 50,
};

const round2 = (value) => Math.round(Number(value) * 100) / 100;

function toForm(config) {
  if (!config) return DEFAULT_FORM;
  return {
    baseRate: round2(Number(config.baseRate ?? 0.18) * 100),
    minRate: round2(Number(config.minRate ?? 0.12) * 100),
    maxRate: round2(Number(config.maxRate ?? 0.25) * 100),
    ratingBenchmark: Number(config.ratingBenchmark ?? 4.5),
    ratingStep: round2(Number(config.ratingStep ?? 0.02) * 100),
    reputationBenchmark: Number(config.reputationBenchmark ?? 80),
    reputationStep: round2(Number(config.reputationStep ?? 0.01) * 100),
    creditLimit: Number(config.creditLimit ?? 500000),
    minAcceptScore: Number(config.minAcceptScore ?? 50),
  };
}

/** Công thức giống CommissionService.calculateRate ở backend (đơn vị %) */
function simulateRate(form, rating, reputation) {
  const deltaRating = (rating - Number(form.ratingBenchmark)) * Number(form.ratingStep);
  const deltaReputation = ((reputation - Number(form.reputationBenchmark)) / 10) * Number(form.reputationStep);
  const applied = Number(form.baseRate) - deltaRating - deltaReputation;
  const clamped = Math.max(Number(form.minRate), Math.min(Number(form.maxRate), applied));
  return { applied: round2(applied), final: round2(clamped), deltaRating: round2(deltaRating), deltaReputation: round2(deltaReputation) };
}

function validate(form) {
  const errors = {};
  const min = Number(form.minRate);
  const base = Number(form.baseRate);
  const max = Number(form.maxRate);
  if (!(min > 0)) errors.minRate = "Tỷ lệ sàn phải lớn hơn 0%";
  if (base < min) errors.baseRate = "Tỷ lệ cơ sở phải ≥ tỷ lệ sàn";
  if (max < base) errors.maxRate = "Tỷ lệ trần phải ≥ tỷ lệ cơ sở";
  if (max > 50) errors.maxRate = "Tỷ lệ trần không vượt quá mức cho phép";
  if (Number(form.ratingBenchmark) < 1 || Number(form.ratingBenchmark) > 5) errors.ratingBenchmark = "Rating chuẩn trong khoảng 1 - 5 sao";
  if (Number(form.ratingStep) < 0 || Number(form.ratingStep) > 10) errors.ratingStep = "Bước nhảy trong khoảng 0 - 10%";
  if (Number(form.reputationBenchmark) < 0 || Number(form.reputationBenchmark) > 100) errors.reputationBenchmark = "Uy tín chuẩn trong khoảng 0 - 100";
  if (Number(form.reputationStep) < 0 || Number(form.reputationStep) > 10) errors.reputationStep = "Bước nhảy trong khoảng 0 - 10%";
  if (Number(form.creditLimit) < 0) errors.creditLimit = "Hạn mức nợ không được âm";
  if (Number(form.minAcceptScore) < 0 || Number(form.minAcceptScore) > 100) errors.minAcceptScore = "Ngưỡng uy tín trong khoảng 0 - 100";
  return errors;
}

const SAMPLE_PROFILES = [
  { label: "Đối tác vàng", rating: 5, reputation: 100 },
  { label: "Tài xế chuẩn", rating: 4.5, reputation: 80 },
  { label: "Tài xế mới", rating: 5, reputation: 80 },
  { label: "Cần cải thiện", rating: 4, reputation: 60 },
  { label: "Vi phạm nhiều", rating: 3, reputation: 40 },
];

function AdminCommissionConfigPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [savedConfig, setSavedConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [simRating, setSimRating] = useState(4.5);
  const [simReputation, setSimReputation] = useState(80);
  const simulatorRef = useRef(null);
  const { showToast, toastElement } = useToast();

  // Bật/tắt phần giải thích tham số, ghi nhớ lựa chọn trên trình duyệt
  const [showHelp, setShowHelp] = useState(() => {
    try {
      return localStorage.getItem("admin.commission.showHelp") === "1";
    } catch {
      return false;
    }
  });
  const toggleHelp = () => {
    setShowHelp((prev) => {
      try {
        localStorage.setItem("admin.commission.showHelp", prev ? "0" : "1");
      } catch {
        // Bỏ qua nếu trình duyệt chặn localStorage
      }
      return !prev;
    });
  };

  // Lời giải thích từng tham số, ví dụ tính theo đúng giá trị đang nhập
  const help = useMemo(() => {
    const rb = Number(form.ratingBenchmark);
    const rs = Number(form.ratingStep);
    const pb = Number(form.reputationBenchmark);
    const ps = Number(form.reputationStep);
    return {
      baseRate: `Mức hoa hồng mặc định sàn thu trên mỗi cuốc. Tài xế đúng chuẩn (${rb} sao, ${pb} điểm uy tín) trả đúng ${form.baseRate}%.`,
      minRate: `Mức thấp nhất sàn được thu, dù tài xế tốt đến đâu. Đây là ưu đãi tối đa cho đối tác vàng.`,
      maxRate: `Mức cao nhất sàn được thu, dù tài xế kém đến đâu. Không vượt quá mức cho phép.`,
      ratingBenchmark: `Mốc so sánh số sao. Rating cao hơn ${rb} sao được giảm hoa hồng, thấp hơn thì bị tăng.`,
      ratingStep: `Mỗi 1 sao chênh so với mốc ${rb} sao thì hoa hồng đổi ${rs}%. VD: tài xế 5 sao được giảm ${round2((5 - rb) * rs)}%.`,
      reputationBenchmark: `Mốc so sánh điểm uy tín (0–100). Cao hơn ${pb} điểm được giảm hoa hồng, thấp hơn thì bị tăng.`,
      reputationStep: `Mỗi 10 điểm uy tín chênh so với mốc ${pb} thì hoa hồng đổi ${ps}%. VD: 100 điểm được giảm ${round2(((100 - pb) / 10) * ps)}%.`,
    };
  }, [form]);
  const helpExample = useMemo(() => simulateRate(form, 5, 100), [form]);
  const helpBadExample = useMemo(() => simulateRate(form, 3.5, 50), [form]);

  const errors = useMemo(() => validate(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const simulation = useMemo(() => simulateRate(form, simRating, simReputation), [form, simRating, simReputation]);

  useEffect(() => {
    (async () => {
      try {
        const config = await getCommissionConfigApi();
        setSavedConfig(config);
        setForm(toForm(config));
      } catch (error) {
        showToast(getApiErrorMessage(error, "Không tải được cấu hình hoa hồng"), "error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [showToast]);

  const updateField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSave = async () => {
    if (hasErrors) {
      showToast("Vui lòng kiểm tra lại các tham số không hợp lệ", "error");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        baseRate: round2(form.baseRate) / 100,
        minRate: round2(form.minRate) / 100,
        maxRate: round2(form.maxRate) / 100,
        ratingBenchmark: Number(form.ratingBenchmark),
        ratingStep: round2(form.ratingStep) / 100,
        reputationBenchmark: Math.round(Number(form.reputationBenchmark)),
        reputationStep: round2(form.reputationStep) / 100,
        creditLimit: Math.round(Number(form.creditLimit)),
        minAcceptScore: Math.round(Number(form.minAcceptScore)),
      };
      const updated = await updateCommissionConfigApi(payload);
      setSavedConfig(updated);
      setForm(toForm(updated));
      showToast("Cập nhật cấu hình hoa hồng thành công");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Cập nhật cấu hình hoa hồng thất bại"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const numberInput = (field, props = {}) => (
    <input type="number" value={form[field]} onChange={updateField(field)} className={inputClass} disabled={isLoading} {...props} />
  );

  return (
    <AdminLayout
      title="Hoa hồng & Uy tín"
      subtitle="Thiết lập chính sách hoa hồng cá nhân hóa theo Rating và Điểm uy tín, hạn mức nợ tiền mặt và ngưỡng uy tín tối thiểu nhận chuyến. Thay đổi có hiệu lực ngay, không cần triển khai lại hệ thống."
      icon={FaPercentage}
      actions={(
        <Button onClick={handleSave} disabled={isLoading || isSaving || hasErrors}>
          <FaSave /> {isSaving ? "Đang lưu..." : "Lưu & Áp dụng ngay"}
        </Button>
      )}
    >
      {savedConfig?.updatedAt ? (
        <p className="mb-4 text-xs text-slate-500">
          Cập nhật lần cuối: {formatDateTime(savedConfig.updatedAt)}
          {savedConfig.updatedByName ? (
            <>
              {" "}bởi <strong className="font-semibold text-slate-700">{savedConfig.updatedByName}</strong>
            </>
          ) : savedConfig.updatedBy ? null : " bởi Hệ thống"}
        </p>
      ) : null}

      {/* Hộp công thức toán học chuẩn hóa R_final */}
      <div className="mb-6 rounded-2xl border border-orange-200/90 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-orange-800">
            <FaCalculator className="text-orange-500" /> Công thức tính hoa hồng sàn động
          </span>
        </div>

        {/* Khung hiển thị công thức chuẩn toán học */}
        <div className="my-4 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white/95 p-4 text-sm sm:text-[15px] text-slate-700 shadow-xs ring-1 ring-orange-200/60">
          <span className="text-base font-semibold text-orange-600 sm:text-lg">R_final</span>
          <span className="text-slate-400">=</span>
          <span className="font-medium text-slate-600">clamp</span>
          <span className="text-slate-400">(</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">R_base</span>
          <span className="text-orange-500">−</span>
          <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 font-medium">
            <span>(Rating − Rating_base)</span>
            <span className="opacity-70">×</span>
            <span>W_rate</span>
          </div>
          <span className="text-orange-500">−</span>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium">
            <div className="inline-flex flex-col items-center leading-tight">
              <span className="border-b border-emerald-400 pb-0.5 text-[11px]">Uy tín − Rep_base</span>
              <span className="pt-0.5 text-[11px]">10</span>
            </div>
            <span className="opacity-70">×</span>
            <span>W_rep</span>
          </div>
          <span className="text-slate-400">,</span>
          <span className="rounded-md bg-sky-50 px-2 py-0.5 font-medium text-sky-700">R_min</span>
          <span className="text-slate-400">,</span>
          <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700">R_max</span>
          <span className="text-slate-400">)</span>
        </div>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span><span className="font-semibold text-slate-700">R_base:</span> Hoa hồng cơ sở nền tảng</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span><span className="font-semibold text-slate-700">Đòn bẩy Rating:</span> Chiết khấu theo số sao</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span><span className="font-semibold text-slate-700">Đòn bẩy Uy tín:</span> Thưởng điểm uy tín cao</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-6">
          <Card
            title="Tham số hoa hồng & đòn bẩy"
            description="Cấu hình các hệ số tỷ lệ chiết khấu, ngưỡng rating và điểm uy tín chuẩn áp dụng cho thuật toán."
            icon={FaPercentage}
            actions={(
              <button
                type="button"
                onClick={toggleHelp}
                aria-pressed={showHelp}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  showHelp
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FaQuestionCircle /> {showHelp ? "Ẩn giải thích" : "Hiện giải thích"}
              </button>
            )}
          >
            {showHelp ? (
              <div className="mb-5 space-y-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 text-sm leading-relaxed text-slate-700">
                <p className="font-bold text-slate-900">Cách tính bằng lời</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Bắt đầu từ <strong>tỷ lệ cơ sở</strong> ({form.baseRate}%).</li>
                  <li>Tài xế có <strong>số sao</strong> và <strong>điểm uy tín</strong> cao hơn mốc chuẩn thì được <strong>giảm</strong> hoa hồng; thấp hơn mốc thì bị <strong>tăng</strong>.</li>
                  <li>Kết quả luôn bị giới hạn trong khoảng <strong>{form.minRate}% – {form.maxRate}%</strong> (sàn và trần).</li>
                </ol>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3 text-xs">
                    <p className="font-bold text-emerald-700">Ví dụ tài xế xuất sắc: 5 sao, 100 điểm</p>
                    <p className="mt-1">
                      {form.baseRate}% − {helpExample.deltaRating}% (sao) − {helpExample.deltaReputation}% (uy tín) = {helpExample.applied}%
                      {helpExample.applied !== helpExample.final ? ` → giới hạn về sàn ${helpExample.final}%` : ""}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-xs">
                    <p className="font-bold text-red-600">Ví dụ tài xế kém: 3.5 sao, 50 điểm</p>
                    <p className="mt-1">
                      {form.baseRate}% + {round2(-helpBadExample.deltaRating)}% (sao) + {round2(-helpBadExample.deltaReputation)}% (uy tín) = {helpBadExample.applied}%
                      {helpBadExample.applied !== helpBadExample.final ? ` → giới hạn về trần ${helpBadExample.final}%` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tỷ lệ cơ sở R_base (%)" hint={showHelp ? help.baseRate : undefined} error={errors.baseRate}>{numberInput("baseRate", { step: 0.5, min: 0 })}</Field>
              <Field label="Tỷ lệ sàn R_min (%)" hint={showHelp ? help.minRate : "Ưu đãi tối đa cho đối tác vàng"} error={errors.minRate}>{numberInput("minRate", { step: 0.5, min: 0 })}</Field>
              <Field label="Tỷ lệ trần R_max (%)" hint={showHelp ? help.maxRate : "Mức phạt tối đa, ≤ 50%"} error={errors.maxRate}>{numberInput("maxRate", { step: 0.5, min: 0, max: 50 })}</Field>
              <Field label="Rating chuẩn Rate_base (sao)" hint={showHelp ? help.ratingBenchmark : undefined} error={errors.ratingBenchmark}>{numberInput("ratingBenchmark", { step: 0.1, min: 1, max: 5 })}</Field>
              <Field label="Bước nhảy W_rate (% / sao)" hint={showHelp ? help.ratingStep : undefined} error={errors.ratingStep}>{numberInput("ratingStep", { step: 0.1, min: 0 })}</Field>
              <div className="hidden sm:block" />
              <Field label="Uy tín chuẩn Rep_base (điểm)" hint={showHelp ? help.reputationBenchmark : undefined} error={errors.reputationBenchmark}>{numberInput("reputationBenchmark", { step: 1, min: 0, max: 100 })}</Field>
              <Field label="Bước nhảy W_rep (% / 10 điểm)" hint={showHelp ? help.reputationStep : undefined} error={errors.reputationStep}>{numberInput("reputationStep", { step: 0.1, min: 0 })}</Field>
            </div>
          </Card>

          <Card title="Hạn mức & kiểm soát rủi ro" icon={FaShieldAlt}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Hạn mức nợ tiền mặt tối đa (VNĐ)"
                hint={`Nợ ≥ ${formatVnd(form.creditLimit)} thì tài xế bị khóa nhận chuyến tiền mặt`}
                error={errors.creditLimit}
              >
                {numberInput("creditLimit", { step: 50000, min: 0 })}
              </Field>
              <Field
                label="Ngưỡng uy tín tối thiểu nhận chuyến (điểm)"
                hint="Tài xế có điểm thấp hơn sẽ không thể tạo chuyến, duyệt vé hoặc mời khách"
                error={errors.minAcceptScore}
              >
                {numberInput("minAcceptScore", { step: 1, min: 0, max: 100 })}
              </Field>
            </div>
          </Card>
        </div>

        <div ref={simulatorRef} className="space-y-6">
          <Card title="Mô phỏng trực quan" description="Kéo thanh trượt để xem hoa hồng áp dụng với tham số đang nhập." icon={FaCalculator}>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700">
                  <span>Rating tài xế</span>
                  <span className="text-orange-600">{Number(simRating).toFixed(1)} ★</span>
                </div>
                <input type="range" min={1} max={5} step={0.1} value={simRating} onChange={(e) => setSimRating(Number(e.target.value))} className="mt-2 w-full accent-orange-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700">
                  <span>Điểm uy tín</span>
                  <span className="text-orange-600">{simReputation} điểm</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={simReputation} onChange={(e) => setSimReputation(Number(e.target.value))} className="mt-2 w-full accent-orange-500" />
              </div>

              {/* Thẻ hiển thị R_final định dạng công thức đẹp */}
              <div className="overflow-hidden rounded-2xl border border-orange-200/90 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-white p-5 text-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-800">
                    Kết quả tính R_final
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-medium text-orange-700">
                    {simulation.applied !== simulation.final
                      ? simulation.final === Number(form.minRate)
                        ? "Chạm sàn R_min"
                        : "Chạm trần R_max"
                      : "Trong khung chuẩn"}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-orange-600">{simulation.final}%</span>
                  {simulation.applied !== simulation.final && (
                    <span className="text-xs text-slate-500 line-through">
                      {simulation.applied}% (trước giới hạn)
                    </span>
                  )}
                </div>

                {/* Phân rã từng bước tính toán rõ ràng theo công thức */}
                <div className="mt-3.5 space-y-1.5 rounded-xl bg-white/95 p-3 text-[13px] shadow-xs ring-1 ring-orange-200/60">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500">R_base (cơ sở):</span>
                    <span className="font-semibold text-slate-800">{form.baseRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-slate-500">Δ Rating ({simRating}★ − {form.ratingBenchmark}★):</span>
                    <span className="font-semibold">
                      {simulation.deltaRating >= 0 ? `− ${simulation.deltaRating}%` : `+ ${Math.abs(simulation.deltaRating)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-slate-500">Δ Uy tín (({simReputation} − {form.reputationBenchmark})/10):</span>
                    <span className="font-semibold">
                      {simulation.deltaReputation >= 0 ? `− ${simulation.deltaReputation}%` : `+ ${Math.abs(simulation.deltaReputation)}%`}
                    </span>
                  </div>
                  <div className="border-t border-orange-100 pt-1.5 flex items-center justify-between text-orange-600 font-semibold">
                    <span>R_applied =</span>
                    <span>{simulation.applied}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Khung giới hạn [{form.minRate}%, {form.maxRate}%]:</span>
                    <span className="font-semibold text-slate-800">⇒ {simulation.final}%</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Cuốc 300.000đ: sàn thu <strong className="text-slate-900">{formatVnd(Math.round(300000 * simulation.final / 100))}</strong>, tài xế nhận{" "}
                <strong className="text-slate-900">{formatVnd(300000 - Math.round(300000 * simulation.final / 100))}</strong>.
                {simReputation < Number(form.minAcceptScore) ? (
                  <p className="mt-2 font-semibold text-red-600">Điểm uy tín dưới ngưỡng {form.minAcceptScore}: tài xế bị khóa nhận chuyến.</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="Bảng tham chiếu nhanh" icon={FaWallet}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="pb-2">Hồ sơ</th>
                    <th className="pb-2">Rating</th>
                    <th className="pb-2">Uy tín</th>
                    <th className="pb-2 text-right">
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-orange-700">
                        R_final
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_PROFILES.map((profile) => (
                    <tr key={profile.label} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-700">{profile.label}</td>
                      <td className="py-2">{profile.rating}★</td>
                      <td className="py-2">{profile.reputation}</td>
                      <td className="py-2 text-right font-bold text-orange-600">{simulateRate(form, profile.rating, profile.reputation).final}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      {toastElement}
    </AdminLayout>
  );
}

export default AdminCommissionConfigPage;
