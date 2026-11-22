import { useEffect, useMemo, useRef, useState } from "react";
import { FaBroadcastTower, FaEye, FaHistory, FaPaperPlane, FaRegSave, FaUsers } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import AudienceFilterForm from "../../components/admin/AudienceFilterForm";
import MobilePreviewModal from "../../components/admin/MobilePreviewModal";
import { Button, Card, EmptyState, Field, StatusBadge, formatDateTime, inputClass, useToast } from "../../components/admin/AdminUi";
import {
  getBroadcastCampaignsApi,
  previewBroadcastAudienceApi,
  saveBroadcastDraftApi,
  sendBroadcastApi,
} from "../../services/adminApi";
import { getAllProvinces } from "../../services/locationApi";
import { getApiErrorMessage } from "../../services/authApi";

const EMPTY_AUDIENCE = { targetRole: "DRIVER", provinceIds: [], minReputation: 0, maxReputation: 100 };
const EMPTY_CONTENT = { title: "", content: "" };
const STATUS_TONE = { DRAFT: "slate", SENDING: "amber", SENT: "green", FAILED: "red" };
const ROLE_LABEL = { ALL: "Tất cả", DRIVER: "Tài xế", CUSTOMER: "Hành khách", DIRECT: "Gửi trực tiếp" };

function AdminBroadcastPage() {
  const [audience, setAudience] = useState(EMPTY_AUDIENCE);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const channels = ["IN_APP"];
  const [draftId, setDraftId] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [recipientCount, setRecipientCount] = useState(null);
  const [isCounting, setIsCounting] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const countRequestId = useRef(0);
  const { showToast, toastElement } = useToast();

  useEffect(() => {
    getAllProvinces().then((list) => setProvinces(list || [])).catch(() => { });
    getBroadcastCampaignsApi().then(setCampaigns).catch(() => { });
  }, []);

  // Bộ đếm người nhận thời gian thực (debounce 400ms)
  useEffect(() => {
    const requestId = ++countRequestId.current;
    setIsCounting(true);
    const timer = setTimeout(async () => {
      try {
        const result = await previewBroadcastAudienceApi(audience);
        if (requestId === countRequestId.current) setRecipientCount(result?.totalRecipients ?? 0);
      } catch {
        if (requestId === countRequestId.current) setRecipientCount(null);
      } finally {
        if (requestId === countRequestId.current) setIsCounting(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [audience]);

  const errors = useMemo(() => {
    const result = {};
    if (!content.title.trim()) result.title = "Vui lòng nhập tiêu đề";
    if (!content.content?.trim()) result.content = "Vui lòng nhập nội dung thông báo";
    return result;
  }, [content]);

  const buildPayload = () => ({
    campaignId: draftId || undefined,
    title: content.title.trim(),
    summary: content.title.trim().slice(0, 200), // Đáp ứng validation backend, tự động đồng bộ theo tiêu đề
    content: content.content.trim(),
    deepLink: "",
    ...audience,
    channels: ["IN_APP"],
  });

  const handleSaveDraft = async () => {
    if (errors.title || errors.content) {
      showToast("Vui lòng nhập tiêu đề và nội dung trước khi lưu nháp", "error");
      return;
    }
    try {
      setIsBusy(true);
      const saved = await saveBroadcastDraftApi(buildPayload());
      setDraftId(saved.id);
      setCampaigns(await getBroadcastCampaignsApi());
      showToast("Đã lưu bản nháp");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Lưu bản nháp thất bại"), "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSend = async () => {
    if (Object.keys(errors).length) {
      showToast(Object.values(errors)[0], "error");
      return;
    }
    if (!window.confirm(`Phát sóng thông báo tới khoảng ${recipientCount ?? "?"} người nhận? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    try {
      setIsBusy(true);
      const result = await sendBroadcastApi(buildPayload());
      showToast(`Đã phát sóng tới ${result.totalDelivered ?? 0}/${result.totalRecipients ?? 0} người nhận`);
      setContent(EMPTY_CONTENT);
      setDraftId(null);
      setCampaigns(await getBroadcastCampaignsApi());
    } catch (error) {
      showToast(getApiErrorMessage(error, "Phát sóng thất bại"), "error");
    } finally {
      setIsBusy(false);
    }
  };

  const loadDraft = (campaign) => {
    setDraftId(campaign.id);
    setContent({
      title: campaign.title || "",
      content: campaign.content || campaign.summary || "",
    });
    setAudience({
      targetRole: ["ALL", "DRIVER", "CUSTOMER"].includes(campaign.targetRole) ? campaign.targetRole : "ALL",
      provinceIds: campaign.provinceIds || [],
      minReputation: campaign.minReputation ?? 0,
      maxReputation: campaign.maxReputation ?? 100,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AdminLayout
      title="Phát sóng thông báo"
      subtitle="Soạn và gửi thông báo hàng loạt: thay đổi chính sách, cảnh báo thời tiết/tuyến đường, bảo trì hệ thống, hoặc thông điệp tới nhóm tài xế theo điểm uy tín."
      icon={FaBroadcastTower}
      actions={(
        <>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isBusy}>
            <FaRegSave /> {draftId ? "Cập nhật bản nháp" : "Lưu bản nháp"}
          </Button>
          <Button variant="secondary" onClick={() => setShowPreview(true)}>
            <FaEye /> Xem trước giao diện điện thoại
          </Button>
          <Button onClick={handleSend} disabled={isBusy || Object.keys(errors).length > 0}>
            <FaPaperPlane /> {isBusy ? "Đang xử lý..." : "Phát sóng ngay"}
          </Button>
        </>
      )}
    >
      {draftId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <span>Đang chỉnh sửa bản nháp đã lưu.</span>
          <button type="button" className="text-xs underline" onClick={() => { setDraftId(null); setContent(EMPTY_CONTENT); }}>
            Soạn thông báo mới
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="1. Phân khúc người nhận" icon={FaUsers}>
          <AudienceFilterForm
            value={audience}
            onChange={setAudience}
            provinces={provinces}
            recipientCount={recipientCount}
            isCounting={isCounting}
          />
        </Card>

        <div className="space-y-6">
          <Card title="2. Nội dung thông báo" icon={FaBroadcastTower}>
            <div className="space-y-4">
              <Field label="Tiêu đề" error={errors.title}>
                <input
                  value={content.title}
                  maxLength={200}
                  onChange={(e) => setContent((p) => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  placeholder="VD: Cảnh báo mưa bão tuyến Hà Nội – Lào Cai"
                />
              </Field>
              <Field label="Nội dung thông báo (hỗ trợ Markdown)" error={errors.content}>
                <textarea
                  rows={8}
                  value={content.content}
                  onChange={(e) => setContent((p) => ({ ...p, content: e.target.value }))}
                  className={`${inputClass} font-mono`}
                  placeholder={"**Lưu ý:** ...\n- Ý 1\n- Ý 2"}
                />
              </Field>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Kênh nhận thông báo:</span> Mặc định gửi vào <strong className="text-orange-600">Hòm thư trong App (Inbox)</strong>, không hiện popup, không FCM.
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6" title="Lịch sử chiến dịch" icon={FaHistory}>
        {campaigns.length === 0 ? (
          <EmptyState>Chưa có chiến dịch nào.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-3">Tiêu đề</th>
                  <th className="py-2 pr-3">Đối tượng</th>
                  <th className="py-2 pr-3">Kênh</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3 text-right">Đã gửi</th>
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 align-top">
                    <td className="max-w-[260px] py-2.5 pr-3">
                      <p className="font-bold text-slate-900">{c.title}</p>
                      {c.deliveryNote ? <p className="mt-0.5 text-xs text-slate-400">{c.deliveryNote}</p> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{ROLE_LABEL[c.targetRole] || c.targetRole}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-600">{(c.channels || []).join(", ")}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={STATUS_TONE[c.status]}>{c.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{c.totalDelivered ?? 0}/{c.totalRecipients ?? 0}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{formatDateTime(c.sentAt || c.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      {c.status === "DRAFT" ? (
                        <button type="button" onClick={() => loadDraft(c)} className="text-xs font-bold text-orange-600 hover:underline">Mở bản nháp</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showPreview ? <MobilePreviewModal draft={content} onClose={() => setShowPreview(false)} /> : null}
      {toastElement}
    </AdminLayout>
  );
}

export default AdminBroadcastPage;
