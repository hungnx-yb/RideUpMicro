import { useEffect, useState } from "react";
import {
  FaCarSide,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRegUserCircle,
  FaTimes,
  FaWallet,
} from "react-icons/fa";
import LocationMapPicker, { isValidCoordinate } from "./common/LocationMapPicker";
import { resolveImageUrl } from "../utils/imageUrl";

function TripDetailModal({ open, trip, onClose, onConfirmBooking, isSubmitting = false }) {
  const [selectedPickupWardId, setSelectedPickupWardId] = useState("");
  const [selectedDropoffWardId, setSelectedDropoffWardId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [pickupLocation, setPickupLocation] = useState({ lat: NaN, lng: NaN, addressText: "" });
  const [dropoffLocation, setDropoffLocation] = useState({ lat: NaN, lng: NaN, addressText: "" });
  const vehicleImageSrc = resolveImageUrl(trip?.vehicleImage);
  const driverAvatarSrc = resolveImageUrl(trip?.driver?.avatarUrl);

  const mapStopToLocation = (stop) => ({
    lat: Number(stop?.lat),
    lng: Number(stop?.lng),
    addressText: stop?.addressText || "",
  });

  useEffect(() => {
    if (!trip) {
      setSelectedPickupWardId("");
      setSelectedDropoffWardId("");
      setPickupLocation({ lat: NaN, lng: NaN, addressText: "" });
      setDropoffLocation({ lat: NaN, lng: NaN, addressText: "" });
      return;
    }

    const defaultPickupStop = trip.pickupStopOptions?.[0] || null;
    const defaultDropoffStop = trip.dropoffStopOptions?.[0] || null;
    setSelectedPickupWardId(defaultPickupStop?.wardId || "");
    setSelectedDropoffWardId(defaultDropoffStop?.wardId || "");
    setPickupLocation(mapStopToLocation(defaultPickupStop));
    setDropoffLocation(mapStopToLocation(defaultDropoffStop));
    setSelectedPaymentMethod("CASH");
  }, [trip]);

  const pickupStopOptions = trip?.pickupStopOptions || [];
  const dropoffStopOptions = trip?.dropoffStopOptions || [];
  const selectedPickupStop = pickupStopOptions.find((stop) => stop.wardId === selectedPickupWardId) || null;
  const selectedDropoffStop = dropoffStopOptions.find((stop) => stop.wardId === selectedDropoffWardId) || null;
  const isPickupLocationValid = isValidCoordinate(Number(pickupLocation?.lat), Number(pickupLocation?.lng));
  const isDropoffLocationValid = isValidCoordinate(Number(dropoffLocation?.lat), Number(dropoffLocation?.lng));
  const hasAddressDetail = Boolean(pickupLocation?.addressText?.trim()) && Boolean(dropoffLocation?.addressText?.trim());
  const canSubmit = Boolean(selectedPickupStop && selectedDropoffStop && isPickupLocationValid && isDropoffLocationValid && hasAddressDetail);

  useEffect(() => {
    if (!selectedPickupStop) {
      return;
    }

    setPickupLocation(mapStopToLocation(selectedPickupStop));
  }, [selectedPickupStop]);

  useEffect(() => {
    if (!selectedDropoffStop) {
      return;
    }

    setDropoffLocation(mapStopToLocation(selectedDropoffStop));
  }, [selectedDropoffStop]);

  if (!open || !trip) return null;

  const handleConfirm = () => {
    if (!canSubmit || !onConfirmBooking || isSubmitting) {
      return;
    }

    onConfirmBooking({
      paymentMethod: selectedPaymentMethod,
      pickupStop: selectedPickupStop,
      dropoffStop: selectedDropoffStop,
      pickupLocation: {
        lat: Number(pickupLocation.lat),
        lng: Number(pickupLocation.lng),
        addressText: pickupLocation.addressText.trim(),
      },
      dropoffLocation: {
        lat: Number(dropoffLocation.lat),
        lng: Number(dropoffLocation.lng),
        addressText: dropoffLocation.addressText.trim(),
      },
    });
  };

  const paymentMethods = [
    {
      id: "CASH",
      label: "Tiền mặt",
      description: "Thanh toán khi lên xe",
      icon: FaMoneyBillWave,
      accentClass: "text-emerald-600",
    },
    {
      id: "VNPAY",
      label: "VNPAY",
      description: "Thanh toán online qua VNPAY",
      icon: FaWallet,
      accentClass: "text-sky-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-slate-900/65 px-4 py-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 sm:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Chi tiết chuyến đi</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">
              {trip.origin} <span className="mx-1 text-orange-500">{"->"}</span> {trip.destination}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <section className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
              <FaCarSide className="text-orange-500" />
              Thông tin xe
            </p>
            <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr]">
              <div>
                {vehicleImageSrc ? (
                  <img
                    src={vehicleImageSrc}
                    alt={trip.driver?.vehicle || "Vehicle"}
                    className="h-24 w-full rounded-lg border border-orange-100 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-lg border border-orange-100 bg-white text-orange-500">
                    <FaCarSide size={24} />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-orange-100 bg-white p-2.5">
                <p className="text-sm font-semibold text-slate-900">{trip.driver?.vehicle || "Xe ghep"}</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <p className="text-slate-600">Giá vé: <span className="font-bold text-orange-600">{trip.price}</span></p>
                  <p className="text-slate-600">Giờ xuất phát: <span className="font-semibold text-slate-900">{trip.departureTime}</span></p>
                  <p className="text-slate-600">Thời lượng: <span className="font-semibold text-slate-900">{trip.duration}</span></p>
                  <p className="text-slate-600">
                    Chỗ trống: <span className="font-semibold text-emerald-600">{trip.availableSeats}/{trip.totalSeats}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
              <FaRegUserCircle className="text-orange-500" />
              Thông tin tài xế
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center gap-3">
                {driverAvatarSrc ? (
                  <img
                    src={driverAvatarSrc}
                    alt={trip.driver?.name || "Driver avatar"}
                    className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500 font-bold text-white">
                    {(trip.driver?.initial || "R").toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-900">{trip.driver?.name || "Tài xế RideUp"}</p>
                  <p className="text-xs text-slate-500">Đánh giá: {trip.driver?.rating || "--"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-sky-800">Chọn phường/xã đón</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {pickupStopOptions.map((point) => {
                const checked = selectedPickupWardId === point.wardId;
                return (
                  <button
                    key={`pickup-${point.wardId}-${point.addressText}`}
                    type="button"
                    onClick={() => setSelectedPickupWardId(point.wardId)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-sm transition ${
                      checked
                        ? "border-sky-300 bg-white text-sky-700"
                        : "border-sky-100 bg-white/80 text-slate-700 hover:border-sky-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[11px] text-sky-500" />
                      {point.addressText}
                    </span>
                    {checked ? <FaCheckCircle className="text-sky-500" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-red-100 bg-red-50/40 p-3">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-red-800">Chọn phường/xã đến</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {dropoffStopOptions.map((point) => {
                const checked = selectedDropoffWardId === point.wardId;
                return (
                  <button
                    key={`dropoff-${point.wardId}-${point.addressText}`}
                    type="button"
                    onClick={() => setSelectedDropoffWardId(point.wardId)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-sm transition ${
                      checked
                        ? "border-red-300 bg-white text-red-700"
                        : "border-red-100 bg-white/80 text-slate-700 hover:border-red-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[11px] text-red-500" />
                      {point.addressText}
                    </span>
                    {checked ? <FaCheckCircle className="text-red-500" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <LocationMapPicker
            title="Địa chỉ đón chi tiết trên map"
            value={pickupLocation}
            onChange={setPickupLocation}
            wardId={selectedPickupStop?.wardId || ""}
            accentClass="border-sky-100 bg-sky-50/30"
          />

          <LocationMapPicker
            title="Địa chỉ trả chi tiết trên map"
            value={dropoffLocation}
            onChange={setDropoffLocation}
            wardId={selectedDropoffStop?.wardId || ""}
            accentClass="border-red-100 bg-red-50/30"
          />

          <section className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-violet-800">Phương thức thanh toán</p>
            <div className="grid gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = selectedPaymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition ${
                      active
                        ? "border-violet-300 bg-white"
                        : "border-violet-100 bg-white/80 hover:border-violet-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className={method.accentClass} size={16} />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">{method.label}</span>
                        <span className="block text-xs text-slate-500">{method.description}</span>
                      </span>
                    </span>
                    {active ? <FaCheckCircle className="text-violet-500" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          {!canSubmit ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Vui lòng chọn đầy đủ điểm đón/trả trên bản đồ và nhập địa chỉ chi tiết trước khi xác nhận đặt chỗ.
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit || isSubmitting}
              className="rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:opacity-95"
            >
              {isSubmitting ? "Đang đặt chỗ..." : `Xác nhận đặt chỗ`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripDetailModal;
