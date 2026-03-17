import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCar,
  FaCheckCircle,
  FaClock,
  FaInfoCircle,
  FaTimesCircle,
  FaUpload,
  FaUserShield,
} from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";
import {
  getMyDriverProfileApi,
  getMyVehicleApi,
  registerDriverApi,
  registerVehicleApi,
  updateDriverProfileApi,
} from "../services/driverOnboardingApi";

const vehicleTypeOptions = [
  "CAR_4_SEAT",
  "CAR_5_SEAT",
  "CAR_7_SEAT",
  "VAN_9_SEAT",
  "VAN_12_SEAT",
  "LIMOUSINE_9_SEAT",
  "LIMOUSINE_11_SEAT",
  "MINIBUS_16_SEAT",
  "MINIBUS_24_SEAT",
  "BUS_29_SEAT",
  "BUS_35_SEAT",
  "BUS_45_SEAT",
];

function StepIndicator({ currentStep }) {
  const steps = [
    { id: 1, label: "Đăng ký bổ sung", icon: FaUserShield },
    { id: 2, label: "Đăng ký xe", icon: FaCar },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {steps.map((step) => {
        const Icon = step.icon;
        const isDone = currentStep > step.id;
        const isCurrent = currentStep === step.id;

        return (
          <div
            key={step.id}
            className={`rounded-2xl border px-4 py-3 ${
              isDone
                ? "border-emerald-200 bg-emerald-50"
                : isCurrent
                  ? "border-orange-300 bg-orange-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-orange-500 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {isDone ? <FaCheckCircle /> : <Icon />}
              </span>
              <span className="text-sm font-semibold text-slate-800">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DriverOnboardingPage() {
  const navigate = useNavigate();
  const { addRole, switchRole } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [driverProfile, setDriverProfile] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [driverNotice, setDriverNotice] = useState("");
  const [vehicleNotice, setVehicleNotice] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const [profileForm, setProfileForm] = useState({
    cccd: "",
    cccdImageFront: null,
    cccdImageBack: null,
    gplx: "",
    gplxExpiryDate: "",
    gplxImage: null,
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    seatCapacity: "",
    vehicleType: "CAR_4_SEAT",
    vehicleImage: null,
    registrationImage: null,
    registrationExpiryDate: "",
    insuranceImage: null,
    insuranceExpiryDate: "",
  });
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);

  const isAnySubmitting = useMemo(() => isSubmittingProfile || isSubmittingVehicle, [isSubmittingProfile, isSubmittingVehicle]);

  const driverStatus = driverProfile?.status || "NOT_REGISTERED";
  const isDriverApproved = driverStatus === "APPROVED";
  const hasRegisteredDriver = driverStatus !== "NOT_REGISTERED";
  const hasVehicle = Boolean(vehicle);
  const isVehicleApproved = vehicle?.isVerified === true && vehicle?.isActive === true;
  const isVehicleRejected = vehicle?.rejectedAt != null;

  const canGoDriverDashboard = isDriverApproved && isVehicleApproved;

  const getErrorCode = (error) =>
    error?.response?.data?.code ?? error?.response?.data?.error?.code ?? null;

  const loadOnboardingStatus = async () => {
    try {
      setIsCheckingStatus(true);
      setDriverNotice("");
      setVehicleNotice("");

      const profile = await getMyDriverProfileApi();
      setDriverProfile(profile);

      if (profile?.status !== "APPROVED") {
        setVehicle(null);
        if (profile?.status === "PENDING") {
          setDriverNotice("Hồ sơ tài xế đang chờ admin duyệt. Bạn chưa thể vào dashboard.");
          setCurrentStep(1);
        } else if (profile?.status === "REJECTED") {
          setDriverNotice(
            profile?.rejectionReason
              ? `Hồ sơ bị từ chối: ${profile.rejectionReason}`
              : "Hồ sơ bị từ chối. Vui lòng bổ sung thông tin và gửi lại."
          );
          setCurrentStep(1);
        } else {
          setCurrentStep(1);
        }
        return;
      }

      setDriverNotice("Hồ sơ tài xế đã duyệt.");

      try {
        const myVehicle = await getMyVehicleApi();
        setVehicle(myVehicle);

        if (myVehicle?.isVerified === true && myVehicle?.isActive === true) {
          setVehicleNotice("Xe đã được duyệt. Bạn có thể vào dashboard.");
        } else if (myVehicle?.rejectedAt) {
          setVehicleNotice(
            myVehicle?.rejectionReason
              ? `Xe bị từ chối: ${myVehicle.rejectionReason}`
              : "Xe bị từ chối. Vui lòng cập nhật hồ sơ xe."
          );
        } else {
          setVehicleNotice("Xe đang chờ duyệt. Bạn chưa thể vào dashboard.");
        }
      } catch (vehicleError) {
        const vehicleCode = getErrorCode(vehicleError);
        if (vehicleCode === 3002) {
          setVehicle(null);
          setVehicleNotice("Bạn chưa đăng ký xe. Vui lòng hoàn tất form đăng ký xe.");
        } else {
          throw vehicleError;
        }
      }

      setCurrentStep(2);
    } catch (error) {
      const code = getErrorCode(error);
      if (code === 2002) {
        setDriverProfile(null);
        setVehicle(null);
        setDriverNotice("Bạn chưa có hồ sơ tài xế. Vui lòng bổ sung thông tin tài xế.");
        setVehicleNotice("");
        setCurrentStep(1);
      } else {
        setDriverProfile(null);
        setVehicle(null);
        setDriverNotice("");
        setVehicleNotice("");
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const handleProfileInputChange = (event) => {
    const { name, value, files } = event.target;
    setProfileForm((previous) => ({
      ...previous,
      [name]: files ? files[0] : value,
    }));
  };

  const handleVehicleInputChange = (event) => {
    const { name, value, files } = event.target;
    setVehicleForm((previous) => ({
      ...previous,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmitProfile = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSubmittingProfile(true);

      const payload = {};
      if (profileForm.cccd.trim()) {
        payload.cccd = profileForm.cccd.trim();
      }
      if (profileForm.gplx.trim()) {
        payload.gplx = profileForm.gplx.trim();
      }
      if (profileForm.gplxExpiryDate) {
        payload.gplxExpiryDate = profileForm.gplxExpiryDate;
      }

      if (profileForm.cccdImageFront) {
        payload.cccdImageFront = profileForm.cccdImageFront;
      }
      if (profileForm.cccdImageBack) {
        payload.cccdImageBack = profileForm.cccdImageBack;
      }
      if (profileForm.gplxImage) {
        payload.gplxImage = profileForm.gplxImage;
      }

      if (!Object.keys(payload).length) {
        setErrorMessage("Vui lòng nhập ít nhất một thông tin hồ sơ tài xế.");
        return;
      }

      if (!hasRegisteredDriver) {
        const missingRequired =
          !payload.cccd ||
          !payload.gplx ||
          !payload.gplxExpiryDate ||
          !payload.cccdImageFront ||
          !payload.cccdImageBack ||
          !payload.gplxImage;

        if (missingRequired) {
          setErrorMessage("Tài khoản chưa có hồ sơ tài xế. Vui lòng nhập đầy đủ thông tin bắt buộc.");
          return;
        }

        await registerDriverApi(payload);
        addRole("DRIVER");
        setSuccessMessage("Gửi hồ sơ tài xế thành công. Hồ sơ đang chờ admin duyệt.");
      } else {
        await updateDriverProfileApi(payload);
        setSuccessMessage("Cập nhật hồ sơ tài xế thành công. Vui lòng chờ admin duyệt trước khi đăng ký xe.");
      }

      await loadOnboardingStatus();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Cập nhật hồ sơ tài xế thất bại"));
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleSubmitVehicle = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSubmittingVehicle(true);
      await registerVehicleApi({
        ...vehicleForm,
        vehicleYear: Number(vehicleForm.vehicleYear),
        seatCapacity: Number(vehicleForm.seatCapacity),
      });

      setSuccessMessage("Đăng ký xe thành công. Xe của bạn đang chờ admin duyệt.");
      await loadOnboardingStatus();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Đăng ký xe thất bại"));
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2f0]">
      <CustomerNavbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-5 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
          <h1 className="text-2xl font-extrabold">Luồng đăng ký tài xế</h1>
          <p className="mt-1 text-sm text-orange-50">
            Chỉ gồm 2 bước: bổ sung hồ sơ tài xế và đăng ký xe.
          </p>
        </section>

        <StepIndicator currentStep={currentStep} />

        {isCheckingStatus ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Đang đồng bộ trạng thái duyệt hồ sơ tài xế và xe...
          </div>
        ) : null}

        {!isCheckingStatus && driverStatus === "PENDING" ? (
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-8 py-7 shadow-md max-w-xl w-full">
              <span className="mb-2 flex items-center justify-center rounded-full bg-yellow-200 p-4 text-yellow-600 text-3xl shadow">
                <FaClock />
              </span>
              <h2 className="text-lg font-bold text-yellow-800 mb-1">Hồ sơ tài xế đang chờ duyệt</h2>
              <p className="text-sm text-yellow-700 text-center">
                Hồ sơ của bạn đã gửi thành công và đang được admin kiểm tra.<br/>
                Vui lòng chờ duyệt để tiếp tục đăng ký xe hoặc vào dashboard.<br/>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-yellow-600 font-medium">
                  <FaInfoCircle className="text-base" /> Thời gian duyệt thường trong vòng 24h làm việc.
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {!isCheckingStatus && driverStatus === "REJECTED" ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaTimesCircle /> Hồ sơ bị từ chối
            </p>
            <p className="mt-1">{driverNotice || "Vui lòng cập nhật lại hồ sơ và gửi duyệt lại."}</p>
          </div>
        ) : null}

        {!isCheckingStatus && driverStatus === "NOT_REGISTERED" ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaInfoCircle /> Chưa có hồ sơ tài xế
            </p>
            <p className="mt-1">{driverNotice || "Vui lòng nhập thông tin ở bước 1 để tạo hồ sơ tài xế."}</p>
          </div>
        ) : null}

        {!isCheckingStatus && isDriverApproved ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaCheckCircle /> Hồ sơ đã được duyệt
            </p>
            <p className="mt-1">Bạn có thể hoàn tất bước đăng ký xe ngay bên dưới.</p>
          </div>
        ) : null}

        {!isCheckingStatus && isDriverApproved && hasVehicle && !isVehicleApproved && !isVehicleRejected ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaClock /> Xe đang chờ duyệt
            </p>
            <p className="mt-1">{vehicleNotice || "Xe của bạn đang được admin kiểm tra."}</p>
          </div>
        ) : null}

        {!isCheckingStatus && isDriverApproved && isVehicleRejected ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaTimesCircle /> Xe bị từ chối
            </p>
            <p className="mt-1">{vehicleNotice || "Vui lòng cập nhật lại hồ sơ xe."}</p>
            {vehicle?.rejectionReason ? <p className="mt-1 font-medium">Lý do: {vehicle.rejectionReason}</p> : null}
          </div>
        ) : null}

        {!isCheckingStatus && canGoDriverDashboard ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaCheckCircle /> Xe đã được duyệt
            </p>
            <p className="mt-1">{vehicleNotice || "Bạn đã đủ điều kiện nhận cuốc."}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {currentStep === 1 && driverStatus !== "PENDING" ? (
          <form onSubmit={handleSubmitProfile} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Bước 1 - Đăng ký bổ sung hồ sơ tài xế</h2>
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
              <FaInfoCircle />
              {hasRegisteredDriver
                ? "Cập nhật thông tin hồ sơ tài xế nếu cần."
                : "Tài khoản chưa có hồ sơ tài xế. Vui lòng nhập đầy đủ thông tin bắt buộc."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                CCCD {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  name="cccd"
                  value={profileForm.cccd}
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                GPLX {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  name="gplx"
                  value={profileForm.gplx}
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Ngày hết hạn GPLX {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  type="date"
                  name="gplxExpiryDate"
                  value={profileForm.gplxExpiryDate}
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Ảnh CCCD mặt trước {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  type="file"
                  accept="image/*"
                  name="cccdImageFront"
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700">
                Ảnh CCCD mặt sau {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  type="file"
                  accept="image/*"
                  name="cccdImageBack"
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Ảnh GPLX {!hasRegisteredDriver ? "*" : "(tuỳ chọn)"}
                <input
                  required={!hasRegisteredDriver}
                  type="file"
                  accept="image/*"
                  name="gplxImage"
                  onChange={handleProfileInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isAnySubmitting}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              <FaUpload className="text-xs" />
              {isSubmittingProfile ? "Đang gửi..." : "Hoàn tất bước 1"}
            </button>
          </form>
        ) : null}

        {currentStep === 2 && isDriverApproved && !hasVehicle ? (
          <form onSubmit={handleSubmitVehicle} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Bước 2 - Đăng ký xe</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Biển số xe
                <input
                  required
                  name="plateNumber"
                  value={vehicleForm.plateNumber}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Hãng xe
                <input
                  required
                  name="vehicleBrand"
                  value={vehicleForm.vehicleBrand}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Dòng xe
                <input
                  required
                  name="vehicleModel"
                  value={vehicleForm.vehicleModel}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Năm sản xuất
                <input
                  required
                  type="number"
                  name="vehicleYear"
                  min={1990}
                  max={2030}
                  value={vehicleForm.vehicleYear}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Màu xe
                <input
                  required
                  name="vehicleColor"
                  value={vehicleForm.vehicleColor}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700">
                Số chỗ
                <input
                  required
                  type="number"
                  min={2}
                  max={50}
                  name="seatCapacity"
                  value={vehicleForm.seatCapacity}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Loại xe
                <select
                  required
                  name="vehicleType"
                  value={vehicleForm.vehicleType}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-orange-300"
                >
                  {vehicleTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Ảnh xe
                <input
                  required
                  type="file"
                  accept="image/*"
                  name="vehicleImage"
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700">
                Ảnh đăng kiểm
                <input
                  required
                  type="file"
                  accept="image/*"
                  name="registrationImage"
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700">
                Hạn đăng kiểm
                <input
                  required
                  type="date"
                  name="registrationExpiryDate"
                  value={vehicleForm.registrationExpiryDate}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700">
                Ảnh bảo hiểm
                <input
                  required
                  type="file"
                  accept="image/*"
                  name="insuranceImage"
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Hạn bảo hiểm
                <input
                  required
                  type="date"
                  name="insuranceExpiryDate"
                  value={vehicleForm.insuranceExpiryDate}
                  onChange={handleVehicleInputChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isAnySubmitting}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              <FaUpload className="text-xs" />
              {isSubmittingVehicle ? "Đang gửi..." : "Hoàn tất đăng ký xe"}
            </button>
          </form>
        ) : null}

        {currentStep === 2 && isDriverApproved && hasVehicle && !isVehicleApproved ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Trạng thái xe</h2>
            <p className="mt-2 text-sm text-slate-600">
              {vehicleNotice || "Xe đã đăng ký, đang chờ admin duyệt."}
            </p>
            <p className="mt-1 text-xs text-slate-500">Bạn chưa thể vào dashboard cho đến khi xe được duyệt.</p>
            <button
              type="button"
              onClick={loadOnboardingStatus}
              disabled={isCheckingStatus}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Kiểm tra lại trạng thái
            </button>
          </div>
        ) : null}

        {!isCheckingStatus && driverStatus !== "APPROVED" ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Bước 2 - Đăng ký xe</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bước đăng ký xe sẽ mở khi hồ sơ tài xế được admin duyệt ({" "}
              <span className="font-semibold">APPROVED</span>).
            </p>
            <button
              type="button"
              onClick={loadOnboardingStatus}
              disabled={isCheckingStatus}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Kiểm tra lại trạng thái
            </button>
          </div>
        ) : null}

        {!isCheckingStatus && canGoDriverDashboard ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Tài khoản tài xế đã sẵn sàng</h2>
            <p className="mt-2 text-sm text-slate-600">
              Hồ sơ tài xế và xe đều đã được duyệt. Bạn có thể bắt đầu nhận cuốc.
            </p>
            <button
              type="button"
              onClick={() => {
                switchRole("DRIVER");
                navigate("/driver-dashboard", { replace: true });
              }}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Vào trang tài xế
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default DriverOnboardingPage;
