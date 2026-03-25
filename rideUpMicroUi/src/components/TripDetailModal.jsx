import { useEffect, useState } from "react";
import {
  FaCarSide,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRegCreditCard,
  FaRegUserCircle,
  FaTimes,
  FaUniversity,
} from "react-icons/fa";
import { resolveImageUrl } from "../utils/imageUrl";

function TripDetailModal({ open, trip, onClose }) {
  const [selectedPickupPoint, setSelectedPickupPoint] = useState("");
  const [selectedDropoffPoint, setSelectedDropoffPoint] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const vehicleImageSrc = resolveImageUrl(trip?.vehicleImage);
  const driverAvatarSrc = resolveImageUrl(trip?.driver?.avatarUrl);

  useEffect(() => {
    if (!trip) {
      setSelectedPickupPoint("");
      setSelectedDropoffPoint("");
      return;
    }

    setSelectedPickupPoint(trip.pickupPoints?.[0] || "");
    setSelectedDropoffPoint(trip.dropoffPoints?.[0] || "");
  }, [trip]);

  if (!open || !trip) return null;

  const paymentMethods = [
    {
      id: "CASH",
      label: "Tien mat",
      description: "Thanh toan khi len xe",
      icon: FaMoneyBillWave,
      accentClass: "text-emerald-600",
    },
    {
      id: "BANK_TRANSFER",
      label: "Chuyen khoan",
      description: "Thanh toan ve tai khoan nha xe",
      icon: FaUniversity,
      accentClass: "text-sky-600",
    },
    {
      id: "CARD",
      label: "The ngan hang",
      description: "The ATM / Visa / Mastercard",
      icon: FaRegCreditCard,
      accentClass: "text-orange-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-slate-900/65 px-4 py-6">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-red-50 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Chi tiet chuyen di</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-900">
              {trip.origin} <span className="mx-1 text-orange-500">{"->"}</span> {trip.destination}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Dong"
          >
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
              <FaCarSide className="text-orange-500" />
              Thong tin xe
            </p>
            <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr]">
              <div>
                {vehicleImageSrc ? (
                  <img
                    src={vehicleImageSrc}
                    alt={trip.driver?.vehicle || "Vehicle"}
                    className="h-28 w-full rounded-xl border border-orange-100 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-xl border border-orange-100 bg-white text-orange-500">
                    <FaCarSide size={24} />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-orange-100 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{trip.driver?.vehicle || "Xe ghep"}</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  <p className="text-slate-600">Gia ve: <span className="font-bold text-orange-600">{trip.price}</span></p>
                  <p className="text-slate-600">Gio xuat phat: <span className="font-semibold text-slate-900">{trip.departureTime}</span></p>
                  <p className="text-slate-600">Thoi luong: <span className="font-semibold text-slate-900">{trip.duration}</span></p>
                  <p className="text-slate-600">
                    Cho trong: <span className="font-semibold text-emerald-600">{trip.availableSeats}/{trip.totalSeats}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-800">
              <FaRegUserCircle className="text-orange-500" />
              Thong tin tai xe
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3">
                {driverAvatarSrc ? (
                  <img
                    src={driverAvatarSrc}
                    alt={trip.driver?.name || "Driver avatar"}
                    className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-orange-500 font-bold text-white">
                    {(trip.driver?.initial || "R").toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-900">{trip.driver?.name || "Tai xe RideUp"}</p>
                  <p className="text-xs text-slate-500">Danh gia: {trip.driver?.rating || "--"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-sky-800">Chon phuong/xa don</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(trip.pickupPoints || []).map((point) => {
                const checked = selectedPickupPoint === point;
                return (
                  <button
                    key={point}
                    type="button"
                    onClick={() => setSelectedPickupPoint(point)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-sky-300 bg-white text-sky-700"
                        : "border-sky-100 bg-white/80 text-slate-700 hover:border-sky-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[11px] text-sky-500" />
                      {point}
                    </span>
                    {checked ? <FaCheckCircle className="text-sky-500" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-red-800">Chon phuong/xa den</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(trip.dropoffPoints || []).map((point) => {
                const checked = selectedDropoffPoint === point;
                return (
                  <button
                    key={point}
                    type="button"
                    onClick={() => setSelectedDropoffPoint(point)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-red-300 bg-white text-red-700"
                        : "border-red-100 bg-white/80 text-slate-700 hover:border-red-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[11px] text-red-500" />
                      {point}
                    </span>
                    {checked ? <FaCheckCircle className="text-red-500" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-violet-800">Phuong thuc thanh toan</p>
            <div className="grid gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = selectedPaymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
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

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dong
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:opacity-95"
            >
              Xac nhan dat cho ({selectedPickupPoint || "-"} {"->"} {selectedDropoffPoint || "-"})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TripDetailModal;
