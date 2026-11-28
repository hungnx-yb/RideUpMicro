import { useCallback, useEffect, useMemo, useState } from "react";
import { FaClock, FaSave } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button, Card, EmptyState, StatusBadge, formatDateTime, inputClass, useToast } from "../../components/admin/AdminUi";
import {
  getSystemTimeoutsApi,
  updateAllSystemTimeoutsApi,
  updateSystemTimeoutApi,
} from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/authApi";

function AdminTimeoutConfigPage() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [isSavingAll, setIsSavingAll] = useState(false);
  const { showToast, toastElement } = useToast();

  const applyItems = useCallback((list) => {
    setItems(list);
    setDrafts(Object.fromEntries(list.map((item) => [item.configKey, String(item.valueMinutes)])));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        applyItems(await getSystemTimeoutsApi());
      } catch (error) {
        showToast(getApiErrorMessage(error, "Không tải được cấu hình timeout"), "error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [applyItems, showToast]);

  const validationErrors = useMemo(() => {
    const errors = {};
    items.forEach((item) => {
      const value = Number(drafts[item.configKey]);
      if (!Number.isInteger(value) || value < 0) {
        errors[item.configKey] = "Vui lòng nhập số phút (>= 0)";
      }
    });
    return errors;
  }, [items, drafts]);

  const changedItems = items.filter((item) => String(item.valueMinutes) !== drafts[item.configKey]);

  // Nhóm các dòng cùng service liền nhau (giữ thứ tự xuất hiện) để gộp ô Service bằng rowSpan
  const groupedRows = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const key = item.ownerService || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.values()].flatMap((group) =>
      group.map((item, index) => ({ item, serviceRowSpan: index === 0 ? group.length : 0 })),
    );
  }, [items]);

  const replaceItem = (updated) => {
    setItems((prev) => prev.map((item) => (item.configKey === updated.configKey ? updated : item)));
    setDrafts((prev) => ({ ...prev, [updated.configKey]: String(updated.valueMinutes) }));
  };

  const handleUpdate = async (item) => {
    if (validationErrors[item.configKey]) {
      showToast(validationErrors[item.configKey], "error");
      return;
    }
    try {
      setSavingKey(item.configKey);
      replaceItem(await updateSystemTimeoutApi(item.configKey, Number(drafts[item.configKey])));
      showToast(`Đã cập nhật "${item.displayName}"`);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Cập nhật thất bại"), "error");
    } finally {
      setSavingKey("");
    }
  };

  const handleSaveAll = async () => {
    if (Object.keys(validationErrors).length) {
      showToast("Có giá trị nằm ngoài giới hạn cho phép", "error");
      return;
    }
    try {
      setIsSavingAll(true);
      applyItems(await updateAllSystemTimeoutsApi(
        changedItems.map((item) => ({ configKey: item.configKey, valueMinutes: Number(drafts[item.configKey]) })),
      ));
      showToast(`Đã lưu ${changedItems.length} thay đổi`);
    } catch (error) {
      showToast(getApiErrorMessage(error, "Lưu thay đổi thất bại"), "error");
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <AdminLayout
      title="Thời gian Timeout"
      subtitle="Điều chỉnh các mốc thời gian chờ theo mùa vụ, thời tiết mà không cần sửa mã nguồn. Giá trị mới áp dụng cho giao dịch phát sinh sau khi lưu; các tiến trình quét hết hạn chạy mỗi phút."
      icon={FaClock}
      actions={(
        <Button onClick={handleSaveAll} disabled={isSavingAll || changedItems.length === 0}>
          <FaSave /> {isSavingAll ? "Đang lưu..." : `Lưu toàn bộ thay đổi${changedItems.length ? ` (${changedItems.length})` : ""}`}
        </Button>
      )}
    >
      <Card>
        {isLoading ? (
          <EmptyState>Đang tải cấu hình…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Không có tham số timeout nào.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-3">Mã cấu hình</th>
                  <th className="py-3 pr-3">Service</th>
                  <th className="py-3 pr-3">Nghiệp vụ</th>
                  <th className="py-3 pr-3">Thời gian (phút)</th>
                  <th className="py-3 pr-3">Khi quá hạn</th>
                  <th className="py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(({ item, serviceRowSpan }) => {
                  const error = validationErrors[item.configKey];
                  const isChanged = String(item.valueMinutes) !== drafts[item.configKey];
                  return (
                    <tr key={item.configKey} className="border-b border-slate-300 align-top">
                      <td className="py-4 pr-3">
                        <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.configKey}</code>
                      </td>
                      {serviceRowSpan > 0 && (
                        <td
                          rowSpan={serviceRowSpan}
                          className="border-x border-slate-300 px-3 py-4 align-middle"
                        >
                          <StatusBadge tone="blue">{item.ownerService}</StatusBadge>
                        </td>
                      )}
                      <td className="py-4 pr-3">
                        <p className="font-bold text-slate-900">{item.displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Cập nhật: {formatDateTime(item.updatedAt)}
                        </p>
                      </td>
                      <td className="py-4 pr-3">
                        <input
                          type="number"
                          min="0"
                          value={drafts[item.configKey] ?? ""}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [item.configKey]: e.target.value }))}
                          className={`${inputClass} w-28 ${error ? "border-red-400" : isChanged ? "border-orange-400" : ""}`}
                        />
                        {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
                      </td>
                      <td className="max-w-[280px] py-4 pr-3 text-slate-600">{item.expireAction}</td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            className="px-3 py-1.5 text-xs"
                            onClick={() => handleUpdate(item)}
                            disabled={!isChanged || Boolean(error) || savingKey === item.configKey}
                          >
                            Cập nhật
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {toastElement}
    </AdminLayout>
  );
}

export default AdminTimeoutConfigPage;
