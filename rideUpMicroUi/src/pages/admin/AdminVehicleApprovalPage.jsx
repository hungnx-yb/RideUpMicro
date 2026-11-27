import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCar,
  FaCalendarAlt,
  FaChartBar,
  FaChevronDown,
  FaCheckCircle,
  FaComments,
  FaEnvelope,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaEye,
  FaImage,
  FaIdBadge,
  FaRegChartBar,
  FaSignOutAlt,
  FaTaxi,
  FaTimes,
  FaTimesCircle,
  FaUserShield,
  FaUser,
  FaUserFriends,
  FaPhoneAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  approveVehicleApi,
  getPendingVehiclesApi,
  rejectVehicleApi,
} from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/authApi";
import { resolveImageUrl, vehicleBackAndExtraDocs } from "../../utils/imageUrl";
import { formatVehicleId } from "../../utils/formatId";

function AdminVehicleApprovalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);


  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const data = await getPendingVehiclesApi();
      setPendingVehicles(data || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách xe chờ duyệt"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedVehicle(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleApproveVehicle = async (vehicle) => {
    try {
      setActionLoadingId(vehicle.id);
      setErrorMessage("");
      await approveVehicleApi(vehicle.id);
      setSuccessMessage("Đã duyệt hồ sơ xe thành công.");
      await loadVehicles();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Duyệt xe thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectVehicle = async (vehicle) => {
    const reason = window.prompt("Nhập lý do từ chối hồ sơ xe", "Giấy tờ xe chưa hợp lệ") || "";

    try {
      setActionLoadingId(vehicle.id);
      setErrorMessage("");
      await rejectVehicleApi(vehicle.id, reason.trim());
      setSuccessMessage("Đã từ chối hồ sơ xe.");
      await loadVehicles();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Từ chối xe thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const openQuickView = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const closeQuickView = () => {
    setSelectedVehicle(null);
  };

  const handleApproveFromModal = async () => {
    if (!selectedVehicle) {
      return;
    }

    await handleApproveVehicle(selectedVehicle);
    closeQuickView();
  };

  const handleRejectFromModal = async () => {
    if (!selectedVehicle) {
      return;
    }

    await handleRejectVehicle(selectedVehicle);
    closeQuickView();
  };

  return (
    <AdminLayout
      title="Duyệt phương tiện di chuyển"
      subtitle="Xác minh thông tin cà vẹt, biển số và hình ảnh xe trước khi kích hoạt hoạt động trong hệ thống"
      icon={FaCar}
      actions={
        <button
          type="button"
          onClick={loadVehicles}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <FaCar className={isLoading ? "animate-spin text-orange-500" : "text-slate-400"} />
          Làm mới
        </button>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-blue-200 bg-white px-4 py-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              <FaCar /> Xe chờ duyệt
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{pendingVehicles.length}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <FaCheckCircle /> Sẵn sàng duyệt
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{pendingVehicles.length}</p>
          </article>
          <article className="rounded-2xl border border-red-200 bg-white px-4 py-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
              <FaTimesCircle /> Cần rà soát
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{actionLoadingId ? 1 : 0}</p>
          </article>
        </section>

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaExclamationTriangle /> Có lỗi xảy ra
            </p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-6 text-sm text-blue-700">
            Đang tải danh sách xe chờ duyệt...
          </div>
        ) : !pendingVehicles.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
            Không có xe nào đang chờ duyệt.
          </div>
        ) : (
          <section className="mt-5 space-y-4">

            {pendingVehicles.map((row) => {
              const isActing = actionLoadingId === row.id;
              // Map driver info from flat fields (API v2)
              const driverName = row?.driverName || "Chưa cập nhật";
              const driverPhone = row?.driverPhone || "Chưa cập nhật";
              const driverEmail = row?.driverEmail || "Chưa cập nhật";
              const driverRating = row?.driverRating;
              const createdAtText = row?.createdAt
                ? new Date(row.createdAt).toLocaleString("vi-VN")
                : "Mới đăng ký";
              const plateNumber = row?.plateNumber || "-";
              const vehicleType = row?.vehicleType || "Chưa cập nhật";
              const displayInitial = plateNumber.charAt(0).toUpperCase();

              return (
                <article
                  key={row.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-[240px] flex-1 items-start gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-lg font-bold text-sky-600">
                        {displayInitial}
                      </span>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{plateNumber}</p>
                        <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          <FaCar className="text-[11px]" /> {vehicleType}
                        </p>
                      </div>
                    </div>


                    <div className="min-w-[260px] flex-1">
                      <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <FaUserShield className="text-xs text-sky-500" /> {driverName}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                        <FaEnvelope className="text-xs text-sky-500" /> {driverEmail}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                        <FaCalendarAlt className="text-xs text-sky-500" /> Đăng ký: {createdAtText}
                      </p>
                      {driverPhone && (
                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                          <FaPhoneAlt className="text-xs text-sky-500" /> {driverPhone}
                        </p>
                      )}
                      {driverRating && (
                        <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">⭐ {driverRating}</span>
                        </p>
                      )}
                    </div>

                    <div className="min-w-[200px] flex-1">
                      <p className="inline-flex items-center gap-2 text-sm text-slate-500" title={row?.id}>
                        <FaIdBadge className="text-xs text-sky-500" /> ID xe:{" "}
                        <span className="font-mono font-semibold text-slate-700">{formatVehicleId(row?.id)}</span>
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">PENDING</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openQuickView(row)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                    >
                      <FaEye /> Xem chi tiết
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleApproveVehicle(row)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <FaCheckCircle /> Phê duyệt
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleRejectVehicle(row)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <FaTimesCircle /> Từ chối
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {selectedVehicle ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6"
            onClick={closeQuickView}
          >
            <div
              className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  <FaEye className="text-sky-500" /> Chi tiết phương tiện
                </h3>
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 text-white">
                <p className="text-xl font-extrabold">{selectedVehicle?.plateNumber || "-"}</p>
                <p className="mt-1 text-sm text-sky-50" title={selectedVehicle?.id}>
                  Mã hồ sơ: <span className="font-mono font-semibold">{formatVehicleId(selectedVehicle?.id)}</span>
                </p>
              </div>

              <div className="mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-2">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Thông tin phương tiện</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCar className="text-sky-500" />
                      Biển số: {selectedVehicle?.plateNumber || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCar className="text-sky-500" />
                      Loại xe: {selectedVehicle?.vehicleType || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCalendarAlt className="text-sky-500" />
                      Ngày tạo: {selectedVehicle?.createdAt ? new Date(selectedVehicle.createdAt).toLocaleString("vi-VN") : "-"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700" title={selectedVehicle?.id}>
                      <FaIdBadge className="text-sky-500" />
                      ID xe: <span className="font-mono font-semibold">{formatVehicleId(selectedVehicle?.id)}</span>
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Thông tin tài xế</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaUserShield className="text-sky-500" />
                      {selectedVehicle?.driverName || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaEnvelope className="text-sky-500" />
                      {selectedVehicle?.driverEmail || "Chưa cập nhật"}
                    </p>
                    {selectedVehicle?.driverPhone && (
                      <p className="flex items-center gap-2 text-slate-700">
                        <FaPhoneAlt className="text-sky-500" />
                        {selectedVehicle?.driverPhone}
                      </p>
                    )}
                    {selectedVehicle?.driverRating && (
                      <p className="flex items-center gap-2 text-slate-700">
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">⭐ {selectedVehicle?.driverRating}</span>
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Ảnh hồ sơ</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Ảnh xe", url: resolveImageUrl(selectedVehicle?.vehicleImage) },
                      { label: "Đăng ký xe mặt trước", url: resolveImageUrl(selectedVehicle?.registrationImage) },
                      ...vehicleBackAndExtraDocs(selectedVehicle),
                    ].map((doc) => (
                      <div key={doc.label} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noreferrer" title={doc.label}>
                            <img src={doc.url} alt={doc.label} className="h-36 w-full object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                            Chưa có ảnh
                          </div>
                        )}
                        <p className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                          {doc.label}
                          {doc.url ? <FaExternalLinkAlt className="ml-1 inline-block text-[10px]" /> : null}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FaTimes /> Đóng
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === selectedVehicle?.id}
                  onClick={handleApproveFromModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <FaCheckCircle /> Phê duyệt
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === selectedVehicle?.id}
                  onClick={handleRejectFromModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <FaTimesCircle /> Từ chối
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}

export default AdminVehicleApprovalPage;

