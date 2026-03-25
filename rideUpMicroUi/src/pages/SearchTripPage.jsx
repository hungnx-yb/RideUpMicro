import { useEffect, useMemo, useState } from "react";
import {
  FaBolt,
  FaCalendarCheck,
  FaClock,
  FaHeadset,
  FaShieldAlt,
  FaStar,
  FaUsers,
} from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import FloatingSupportMenu from "../components/FloatingSupportMenu";
import TripDetailModal from "../components/TripDetailModal";
import TripSearchBar from "../components/TripSearchBar";
import TripList from "../components/TripList";
import superCarBanner from "../assets/anh-nen-sieu-xe_020255797.jpg";
import { getApiErrorMessage } from "../services/authApi";
import { getAllProvinces, getAllWards } from "../services/locationApi";
import { getAllTripsApi } from "../services/tripApi";

function formatMoneyVnd(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatDepartureTime(isoString) {
  if (!isoString) return "--:--";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(departureIso, arrivalIso) {
  if (!departureIso || !arrivalIso) return "--";
  const start = new Date(departureIso);
  const end = new Date(arrivalIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "--";

  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
  if (totalMinutes < 60) return `${totalMinutes} phút`;

  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return minute ? `${hour} giờ ${minute} phút` : `${hour} giờ`;
}

function normalizeStopType(stopType) {
  return typeof stopType === "string" ? stopType.toUpperCase() : "";
}

function mapTripToCard(trip, index) {
  const pickupStops = (trip?.stops || []).filter((stop) => normalizeStopType(stop?.stopType) === "PICKUP");
  const dropoffStops = (trip?.stops || []).filter((stop) => normalizeStopType(stop?.stopType) === "DROPOFF");

  const pickupPoints = pickupStops.length
    ? pickupStops.map((stop) => stop?.addressText || stop?.wardId || "Điểm đón").slice(0, 4)
    : ["Sẽ cập nhật điểm đón"];

  const dropoffPoints = dropoffStops.length
    ? dropoffStops.map((stop) => stop?.addressText || stop?.wardId || "Điểm trả").slice(0, 4)
    : ["Sẽ cập nhật điểm trả"];

  const driverName = trip?.driverName || "Tài xế RideUp";
  const vehicle = [trip?.vehicleBrand, trip?.vehicleModel].filter(Boolean).join(" ") || "Xe ghép";

  return {
    id: trip?.id || `trip-${index}`,
    origin: trip?.startAddressText || pickupPoints[0] || "Điểm đi",
    destination: trip?.endAddressText || dropoffPoints[0] || "Điểm đến",
    distance: "--",
    duration: formatDuration(trip?.departureTime, trip?.estimatedArrivalTime),
    price: formatMoneyVnd(trip?.priceVnd),
    driver: {
      initial: (driverName.charAt(0) || "R").toUpperCase(),
      name: driverName,
      rating: trip?.driverRating ? Number(trip.driverRating).toFixed(1) : "--",
      vehicle,
      avatarUrl: trip?.avatarUrl || "",
    },
    vehicleImage: trip?.vehicleImage || "",
    departureTime: formatDepartureTime(trip?.departureTime),
    availableSeats: Number(trip?.seatAvailable ?? trip?.seatTotal ?? 0),
    totalSeats: Number(trip?.seatTotal ?? trip?.seatAvailable ?? 0),
    pickupPoints,
    dropoffPoints,
    note: trip?.note || "Không có ghi chú từ tài xế",
    date: trip?.departureTime?.split("T")?.[0] || "",
  };
}

function SearchTripPage() {
  const [searchForm, setSearchForm] = useState({
    startProvinceId: "",
    startWardId: "",
    endProvinceId: "",
    endWardId: "",
    date: "",
  });

  const [provinces, setProvinces] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [trips, setTrips] = useState([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingStartWards, setIsLoadingStartWards] = useState(false);
  const [isLoadingEndWards, setIsLoadingEndWards] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchProvinces = async () => {
    try {
      setIsLoadingProvinces(true);
      const response = await getAllProvinces();
      setProvinces(response || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách tỉnh/thành"));
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  useEffect(() => {
    fetchProvinces();
  }, []);

  const handleProvinceFocus = () => {
    if (provinces.length === 0 && !isLoadingProvinces) {
      fetchProvinces();
    }
  };

  useEffect(() => {
    const fetchStartWards = async () => {
      if (!searchForm.startProvinceId) {
        setStartWards([]);
        return;
      }

      try {
        setIsLoadingStartWards(true);
        const response = await getAllWards(searchForm.startProvinceId);
        setStartWards(response || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "Không tải được phường/xã điểm đi"));
      } finally {
        setIsLoadingStartWards(false);
      }
    };

    fetchStartWards();
  }, [searchForm.startProvinceId]);

  useEffect(() => {
    const fetchEndWards = async () => {
      if (!searchForm.endProvinceId) {
        setEndWards([]);
        return;
      }

      try {
        setIsLoadingEndWards(true);
        const response = await getAllWards(searchForm.endProvinceId);
        setEndWards(response || []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "Không tải được phường/xã điểm đến"));
      } finally {
        setIsLoadingEndWards(false);
      }
    };

    fetchEndWards();
  }, [searchForm.endProvinceId]);

  const mappedTrips = useMemo(() => trips.map((trip, index) => mapTripToCard(trip, index)), [trips]);

  const totalAvailableSeats = useMemo(
    () => mappedTrips.reduce((sum, trip) => sum + trip.availableSeats, 0),
    [mappedTrips]
  );

  const destinationCount = useMemo(() => {
    const uniqueDestinations = new Set(mappedTrips.map((trip) => trip.destination));
    return uniqueDestinations.size;
  }, [mappedTrips]);

  const handleFormChange = (field, value) => {
    setSearchForm((previous) => {
      if (field === "startProvinceId") {
        return { ...previous, startProvinceId: value, startWardId: "" };
      }

      if (field === "endProvinceId") {
        return { ...previous, endProvinceId: value, endWardId: "" };
      }

      return { ...previous, [field]: value };
    });

    setErrorMessage("");
  };

  const fetchTrips = async ({ startWardId = "", endWardId = "", date, showError = true }) => {
    try {
      setIsSearching(true);
      if (showError) {
        setErrorMessage("");
      }

      const response = await getAllTripsApi({
        startWardId,
        endWardId,
        date: date || undefined,
        page: 0,
        size: 20,
      });

      setTrips(response?.items || []);
    } catch (error) {
      setTrips([]);
      if (showError) {
        setErrorMessage(getApiErrorMessage(error, "Không tìm được chuyến xe phù hợp"));
      }
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrips({ showError: false });
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!searchForm.startWardId || !searchForm.endWardId) {
      setErrorMessage("Vui lòng chọn đầy đủ phường/xã điểm đi và điểm đến");
      return;
    }

    await fetchTrips({
        startWardId: searchForm.startWardId,
        endWardId: searchForm.endWardId,
        date: searchForm.date || undefined,
      showError: true,
    });
  };

  const applyToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setSearchForm((previous) => ({ ...previous, date: today }));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#fff1df_0%,#fff8f1_42%,#f7fafc_100%)]">
      <CustomerNavbar />

      <main className="pb-12">
        <section className="relative overflow-hidden border-b border-slate-200/60 bg-slate-900 text-white">
          <img
            src={superCarBanner}
            alt="Banner xe ghép RideUp"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-90"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
          <div className="pointer-events-none absolute -left-20 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-7 sm:px-6 lg:px-8 lg:pb-10">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-50">
                  <FaBolt className="text-[11px]" />
                  Xe ghép liên tỉnh nhanh chóng, tiết kiệm đến 40% so với đi xe khách thông thường
                </p>
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Chọn chuyến đi phù hợp, đi nhanh và tiết kiệm</h1>
                <p className="mt-2 text-sm text-rose-50/90 sm:text-base">
                  Đặt chỗ trên các tuyến xe ghép uy tín với điểm đón-trả linh hoạt, thông tin tài xế rõ ràng và hỗ trợ tức thì.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-rose-50/80">Chỗ trống</p>
                  <p className="text-xl font-extrabold">{totalAvailableSeats}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-rose-50/80">Điểm đến</p>
                  <p className="text-xl font-extrabold">{destinationCount}</p>
                </div>
              </div>
            </div>

            <TripSearchBar
              form={searchForm}
              onChange={handleFormChange}
              onSubmit={handleSearch}
              onProvinceFocus={handleProvinceFocus}
              startProvinceOptions={provinces}
              endProvinceOptions={provinces}
              startWardOptions={startWards}
              endWardOptions={endWards}
              isLoadingStartWards={isLoadingStartWards}
              isLoadingEndWards={isLoadingEndWards}
              isSearching={isSearching}
            />

            {errorMessage ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {isLoadingProvinces ? (
              <div className="mt-3 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white">
                Đang tải danh sách tỉnh/thành...
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyToday}
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
              >
                <FaClock className="text-[11px]" />
                Đi hôm nay
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 grid w-full max-w-[1320px] gap-5 px-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-4">
          <TripList trips={mappedTrips} onOpenDetail={setSelectedTrip} />

          <aside className="space-y-4">
            <article className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-rose-800">
                <FaCalendarCheck />
                Lịch trình gợi ý
              </h3>
              <div className="mt-3 space-y-2 text-sm text-rose-900/90">
                <p className="rounded-lg border border-rose-100 bg-white/80 px-3 py-2">
                  <span className="font-semibold">Sáng (06:00 - 09:00):</span> Hợp cho người đi làm.
                </p>
                <p className="rounded-lg border border-rose-100 bg-white/80 px-3 py-2">
                  <span className="font-semibold">Trưa (09:00 - 13:00):</span> Dễ đặt được mức giá tốt.
                </p>
                <p className="rounded-lg border border-rose-100 bg-white/80 px-3 py-2">
                  <span className="font-semibold">Chiều (13:00 - 18:00):</span> Nên đặt sớm để tránh hết chỗ.
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-emerald-800">
                <FaUsers />
                Mẹo đặt chỗ nhanh
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900/90">
                <li className="rounded-lg bg-white/70 px-3 py-2">Chọn chuyến còn nhiều chỗ để linh hoạt đổi lịch.</li>
                <li className="rounded-lg bg-white/70 px-3 py-2">Đặt sớm chuyến giờ cao điểm để có chỗ đẹp.</li>
                <li className="rounded-lg bg-white/70 px-3 py-2">Xem kỹ điểm đón/trả để tiết kiệm thời gian di chuyển.</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-orange-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-orange-800">
                <FaShieldAlt />
                Cam kết RideUp
              </h3>
              <p className="mt-2 text-sm text-orange-900/90">
                Tài xế đã xác minh, thông tin chuyến minh bạch và hỗ trợ 24/7 qua menu trợ giúp.
              </p>
              <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-orange-700">
                Mỗi chuyến hiển thị rõ giá, điểm đón/trả và ghi chú từ tài xế.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-700">
                <FaStar className="text-amber-500" />
                Trải nghiệm tốt hơn
              </h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p className="rounded-lg bg-slate-50 px-3 py-2">Lọc theo tỉnh và phường/xã theo đúng luồng đi thực tế.</p>
                <p className="rounded-lg bg-slate-50 px-3 py-2">Thông tin tài xế, chỗ ngồi và ghi chú hiển thị ngay trên từng chuyến.</p>
                <p className="rounded-lg bg-slate-50 px-3 py-2">Danh sách cập nhật ngay sau mỗi lần tìm kiếm.</p>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                <FaHeadset className="text-xs" />
                Hỗ trợ đặt chuyến
              </button>
            </article>
          </aside>
        </section>
      </main>

      <TripDetailModal open={!!selectedTrip} trip={selectedTrip} onClose={() => setSelectedTrip(null)} />

      <FloatingSupportMenu />
    </div>
  );
}

export default SearchTripPage;
