import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkedAlt,
  FaRoute,
} from "react-icons/fa";
import DriverNavbar from "../components/DriverNavbar";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";
import { getAllProvinces, getAllWards } from "../services/locationApi";
import { getRouteDetailByStartAndEndApi } from "../services/routeAdminApi";
import { createTripApi } from "../services/tripApi";

const initialForm = {
  startProvinceId: "",
  endProvinceId: "",
  startWardId: "",
  endWardId: "",
  startAddressText: "",
  endAddressText: "",
  departureTime: "",
  seatTotal: "",
  priceVnd: "",
};

function DriverCreateTripPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.fullName?.trim() || user?.email || "Tài xế";

  const [form, setForm] = useState(initialForm);
  const [provinces, setProvinces] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [routeDetail, setRouteDetail] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const items = await getAllProvinces();
        setProvinces(items || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      }
    };

    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchWards = async () => {
      if (!form.startProvinceId) {
        setStartWards([]);
        setForm((previous) => ({ ...previous, startWardId: "" }));
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
  }, [form.startProvinceId]);

  useEffect(() => {
    const fetchWards = async () => {
      if (!form.endProvinceId) {
        setEndWards([]);
        setForm((previous) => ({ ...previous, endWardId: "" }));
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
  }, [form.endProvinceId]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!form.startProvinceId || !form.endProvinceId) {
        setRouteDetail(null);
        setForm((previous) => ({ ...previous, priceVnd: "", seatTotal: previous.seatTotal }));
        return;
      }

      try {
        setIsLoadingRoute(true);
        const route = await getRouteDetailByStartAndEndApi(form.startProvinceId, form.endProvinceId);
        setRouteDetail(route);
        if (route?.basePriceVnd) {
          setForm((previous) => ({ ...previous, priceVnd: route.basePriceVnd?.toString() || "" }));
        }
      } catch (error) {
        setRouteDetail(null);
        setErrorMessage(getApiErrorMessage(error, "Không tìm thấy tuyến giữa hai tỉnh đã chọn"));
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [form.startProvinceId, form.endProvinceId]);

  const canSubmit = useMemo(() => {
    return (
      !!routeDetail &&
      form.startProvinceId &&
      form.endProvinceId &&
      form.startWardId &&
      form.endWardId &&
      form.departureTime &&
      Number(form.seatTotal) > 0 &&
      Number(form.priceVnd) > 0
    );
  }, [form, routeDetail]);

  const estimatedArrivalTimeIso = useMemo(() => {
    if (!routeDetail?.estimatedDurationMin || !form.departureTime) return null;
    const departure = new Date(form.departureTime);
    if (Number.isNaN(departure.getTime())) return null;
    const arrival = new Date(departure.getTime() + routeDetail.estimatedDurationMin * 60 * 1000);
    return arrival.toISOString();
  }, [form.departureTime, routeDetail]);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!routeDetail?.id) {
      setErrorMessage("Vui lòng chọn tuyến hợp lệ để tạo chuyến.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        routeId: routeDetail.id,
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        startAddressText: form.startAddressText?.trim() || undefined,
        endAddressText: form.endAddressText?.trim() || undefined,
        departureTime: form.departureTime ? new Date(form.departureTime).toISOString() : null,
        estimatedArrivalTime: estimatedArrivalTimeIso,
        seatTotal: Number(form.seatTotal),
        priceVnd: Number(form.priceVnd),
        stops: [
          {
            stopType: "PICKUP",
            wardId: form.startWardId,
            addressText: form.startAddressText?.trim() || undefined,
          },
          {
            stopType: "DROPOFF",
            wardId: form.endWardId,
            addressText: form.endAddressText?.trim() || undefined,
          },
        ],
      };

      await createTripApi(payload);
      setSuccessMessage("Tạo chuyến thành công. Bạn có thể xem trong bảng điều khiển.");
      setForm((previous) => ({ ...initialForm, priceVnd: previous.priceVnd }));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOptionList = (items) =>
    items?.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    ));

  return (
    <div className="min-h-screen bg-slate-50">
      <DriverNavbar driverName={displayName} tripsToday="" />

      <main className="mx-auto max-w-5xl px-3 pb-10 pt-6 sm:px-5 lg:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <FaArrowLeft />
            Quay lại
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Tài xế</p>
            <h1 className="text-2xl font-bold text-slate-900">Tạo chuyến mới</h1>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaRoute className="text-orange-500" />
                  Tuyến đường
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Tỉnh/Thành đi
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.startProvinceId}
                      onChange={(event) => handleChange("startProvinceId", event.target.value)}
                      required
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {renderOptionList(provinces)}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Tỉnh/Thành đến
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.endProvinceId}
                      onChange={(event) => handleChange("endProvinceId", event.target.value)}
                      required
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {renderOptionList(provinces)}
                    </select>
                  </label>
                </div>

                {isLoadingRoute ? (
                  <p className="mt-3 text-xs text-slate-500">Đang lấy thông tin tuyến...</p>
                ) : null}

                {routeDetail ? (
                  <div className="mt-4 grid gap-3 rounded-lg border border-orange-100 bg-orange-50 p-3 text-sm text-slate-800 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-orange-500">Tuyến</p>
                      <p className="font-semibold">{routeDetail.routeName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-orange-500">Quãng đường</p>
                      <p className="font-semibold">{routeDetail.distanceKm} km</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-orange-500">Thời gian ước tính</p>
                      <p className="font-semibold">{routeDetail.estimatedDurationMin} phút</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-orange-500">Giá gợi ý</p>
                      <p className="font-semibold">{routeDetail.basePriceVnd?.toLocaleString("vi-VN")} đ</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-orange-500">Người tạo</p>
                      <p className="font-semibold">{routeDetail.fullName || "Admin"}</p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaMapMarkedAlt className="text-orange-500" />
                  Điểm đón / trả
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Phường/Xã đón
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.startWardId}
                      onChange={(event) => handleChange("startWardId", event.target.value)}
                      required
                    >
                      <option value="">Chọn phường/xã</option>
                      {renderOptionList(startWards)}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Phường/Xã trả
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.endWardId}
                      onChange={(event) => handleChange("endWardId", event.target.value)}
                      required
                    >
                      <option value="">Chọn phường/xã</option>
                      {renderOptionList(endWards)}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Địa chỉ đón (tùy chọn)
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      placeholder="Số nhà, tên đường..."
                      value={form.startAddressText}
                      onChange={(event) => handleChange("startAddressText", event.target.value)}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Địa chỉ trả (tùy chọn)
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      placeholder="Số nhà, tên đường..."
                      value={form.endAddressText}
                      onChange={(event) => handleChange("endAddressText", event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaCalendarAlt className="text-orange-500" />
                  Thời gian & giá
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Thời gian xuất phát
                    <div className="relative mt-1">
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                        value={form.departureTime}
                        onChange={(event) => handleChange("departureTime", event.target.value)}
                        required
                      />
                      <FaClock className="pointer-events-none absolute right-3 top-2.5 text-slate-400" />
                    </div>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Số ghế trống
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.seatTotal}
                      onChange={(event) => handleChange("seatTotal", event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Giá vé (VND)
                    <input
                      type="number"
                      min="1000"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-orange-500 focus:outline-none"
                      value={form.priceVnd}
                      onChange={(event) => handleChange("priceVnd", event.target.value)}
                      required
                    />
                    {routeDetail?.basePriceVnd ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Gợi ý từ tuyến: {routeDetail.basePriceVnd.toLocaleString("vi-VN")} đ
                      </p>
                    ) : null}
                  </label>

                  {estimatedArrivalTimeIso ? (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-slate-800">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">Dự kiến kết thúc</p>
                      <p className="font-semibold">
                        {new Date(estimatedArrivalTimeIso).toLocaleString("vi-VN", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                      Nhập giờ xuất phát để xem giờ dự kiến kết thúc.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaMapMarkedAlt className="text-orange-500" />
                  Tóm tắt chuyến
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Đi:</span> {form.startProvinceId || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Đến:</span> {form.endProvinceId || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Ghế:</span> {form.seatTotal || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Giá:</span> {form.priceVnd ? `${Number(form.priceVnd).toLocaleString("vi-VN")} đ` : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FaCheckCircle className="text-orange-500" />
                  Hướng dẫn nhanh
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>1. Chọn tỉnh đi và đến từ dữ liệu location-service.</li>
                  <li>2. Hệ thống tự lấy tuyến (getRouteDetailByStartAndEnd) và điền giá gợi ý.</li>
                  <li>3. Chọn phường/xã đón và trả, nhập giờ xuất phát.</li>
                  <li>4. Bấm "Tạo chuyến" để gửi lên trip-service.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Dữ liệu tỉnh/thành & phường/xã lấy từ location-service. Tuyến được tự động tra cứu.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/driver-dashboard")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <FaArrowLeft />
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                  !canSubmit || isSubmitting
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isSubmitting ? "Đang tạo..." : "Tạo chuyến"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default DriverCreateTripPage;
