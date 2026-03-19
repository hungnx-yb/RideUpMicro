import { useEffect, useMemo, useRef, useState } from "react";
import { getAllProvinces, getAllWards } from "../services/locationApi";
import {
  FaChartBar,
  FaChevronDown,
  FaComments,
  FaExclamationTriangle,
  FaLocationArrow,
  FaMapMarkedAlt,
  FaPlus,
  FaRegChartBar,
  FaSignOutAlt,
  FaSyncAlt,
  FaTaxi,
  FaToggleOff,
  FaToggleOn,
  FaUser,
  FaUserFriends,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";
import { activateRouteApi, createRouteApi, getRoutesApi } from "../services/routeAdminApi";

const initialFormState = {
  routeName: "",
  startProvinceId: "",
  endProvinceId: "",
  basePriceVnd: "",
  distanceKm: "",
  estimatedDurationMin: "",
};

const topMenus = [
  { label: "Thống kê", icon: FaRegChartBar, active: false, path: "/admin-dashboard" },
  { label: "Phân tích", icon: FaChartBar, active: false },
  { label: "Người dùng", icon: FaUserFriends, active: false, path: "/admin-dashboard/drivers-approval" },
  { label: "Tuyến đường", icon: FaLocationArrow, active: true, path: "/admin-dashboard/routes" },
  { label: "Hỗ trợ", icon: FaComments, active: false },
];

function AdminRouteManagementPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [formValues, setFormValues] = useState(initialFormState);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState({ start: false, end: false });
  const [locationErrorMessage, setLocationErrorMessage] = useState("");
  const [isStartDropdownOpen, setIsStartDropdownOpen] = useState(false);
  const [isEndDropdownOpen, setIsEndDropdownOpen] = useState(false);
  const [isFilterStartDropdownOpen, setIsFilterStartDropdownOpen] = useState(false);
  const [isFilterEndDropdownOpen, setIsFilterEndDropdownOpen] = useState(false);
    // Fetch all provinces on mount (for dropdowns)
    useEffect(() => {
      const fetchProvinces = async () => {
        setProvinceLoading(true);
        setLocationErrorMessage("");
        try {
          const provinces = await getAllProvinces();
          setProvinceOptions(provinces || []);
        } catch (e) {
          setProvinceOptions([]);
          setLocationErrorMessage(getApiErrorMessage(e, "Không tải được danh sách tỉnh/thành phố"));
        } finally {
          setProvinceLoading(false);
        }
      };
      fetchProvinces();
    }, []);

    // Fetch wards when start province changes
    useEffect(() => {
      if (!formValues.startProvinceId) {
        setStartWards([]);
        return;
      }
      setWardLoading((prev) => ({ ...prev, start: true }));
      getAllWards(formValues.startProvinceId)
        .then((wards) => setStartWards(wards || []))
        .catch(() => setStartWards([]))
        .finally(() => setWardLoading((prev) => ({ ...prev, start: false })));
    }, [formValues.startProvinceId]);

    // Fetch wards when end province changes
    useEffect(() => {
      if (!formValues.endProvinceId) {
        setEndWards([]);
        return;
      }
      setWardLoading((prev) => ({ ...prev, end: true }));
      getAllWards(formValues.endProvinceId)
        .then((wards) => setEndWards(wards || []))
        .catch(() => setEndWards([]))
        .finally(() => setWardLoading((prev) => ({ ...prev, end: false })));
    }, [formValues.endProvinceId]);
  const [routes, setRoutes] = useState([]);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingRouteId, setProcessingRouteId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [startFilter, setStartFilter] = useState("");
  const [endFilter, setEndFilter] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const startDropdownRef = useRef(null);
  const endDropdownRef = useRef(null);
  const filterStartDropdownRef = useRef(null);
  const filterEndDropdownRef = useRef(null);

  const adminName = user?.fullName?.trim() || user?.email || "Quản trị viên";
  const adminInitial = adminName.charAt(0).toUpperCase();

  const totalActiveRoutes = useMemo(
    () => routes.filter((route) => route?.isActive === true).length,
    [routes]
  );

  const totalInactiveRoutes = useMemo(
    () => routes.filter((route) => route?.isActive === false).length,
    [routes]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
      if (!startDropdownRef.current?.contains(event.target)) setIsStartDropdownOpen(false);
      if (!endDropdownRef.current?.contains(event.target)) setIsEndDropdownOpen(false);
      if (!filterStartDropdownRef.current?.contains(event.target)) setIsFilterStartDropdownOpen(false);
      if (!filterEndDropdownRef.current?.contains(event.target)) setIsFilterEndDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/auth/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const loadRoutes = async () => {
    try {
      setIsLoadingList(true);
      setErrorMessage("");
      const params = {
        page: 0,
        size: 20,
      };

      if (startFilter.trim()) {
        params.startProvinceId = startFilter.trim();
      }

      if (endFilter.trim()) {
        params.endProvinceId = endFilter.trim();
      }

      if (isActiveFilter !== "") {
        params.isActive = isActiveFilter === "true";
      }

      const response = await getRoutesApi(params);
      setRoutes(response.items || []);
      setTotalRoutes(response.total || 0);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách tuyến"));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleChangeField = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateRoute = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        routeName: formValues.routeName.trim(),
        startProvinceId: formValues.startProvinceId.trim(),
        endProvinceId: formValues.endProvinceId.trim(),
        basePriceVnd: Number(formValues.basePriceVnd),
        distanceKm: Number(formValues.distanceKm),
        estimatedDurationMin: Number(formValues.estimatedDurationMin),
      };

      await createRouteApi(payload);
      setSuccessMessage("Đã tạo tuyến mới thành công.");
      setFormValues(initialFormState);
      setIsCreateModalOpen(false);
      await loadRoutes();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Tạo tuyến thất bại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRoute = async (route) => {
    try {
      setProcessingRouteId(route.id);
      setErrorMessage("");
      setSuccessMessage("");
      const nextStatus = !route.isActive;
      await activateRouteApi(route.id, nextStatus);
      setSuccessMessage(nextStatus ? "Đã kích hoạt tuyến." : "Đã tắt tuyến.");
      await loadRoutes();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Cập nhật trạng thái tuyến thất bại"));
    } finally {
      setProcessingRouteId("");
    }
  };

  const handleApplyFilters = async () => {
    await loadRoutes();
  };

  const handleResetFilters = async () => {
    setStartFilter("");
    setEndFilter("");
    setIsActiveFilter("");

    try {
      setIsLoadingList(true);
      const response = await getRoutesApi({ page: 0, size: 20 });
      setRoutes(response.items || []);
      setTotalRoutes(response.total || 0);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách tuyến"));
    } finally {
      setIsLoadingList(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <FaTaxi />
              </span>
              <p className="text-3xl font-extrabold tracking-tight text-slate-800">
                Ride<span className="text-orange-500">Up</span>
              </p>
            </div>

            <nav className="hidden items-center gap-2 xl:flex">
              {topMenus.map((menu) => {
                const Icon = menu.icon;
                return (
                  <button
                    key={menu.label}
                    type="button"
                    onClick={() => menu.path && navigate(menu.path)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold ${
                      menu.active
                        ? "bg-orange-50 text-orange-600"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="text-sm" />
                    {menu.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((previous) => !previous)}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm hover:border-orange-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-400 text-xl font-bold text-white">
                {adminInitial}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xl font-bold leading-tight text-slate-800">{adminName}</span>
                <span className="block text-sm font-semibold text-orange-500">Quản trị viên</span>
              </span>
              <FaChevronDown
                className={`ml-2 text-slate-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                size={16}
              />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/admin-dashboard");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FaUser size={14} /> Quay lại dashboard admin
                </button>
                <div className="my-2 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  <FaSignOutAlt size={15} />
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-orange-200 bg-[linear-gradient(125deg,#ef4444_0%,#f97316_48%,#f59e0b_100%)] px-6 py-9 text-white shadow-xl shadow-orange-500/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h1 className="inline-flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                <FaMapMarkedAlt className="text-2xl sm:text-3xl" /> Quản lý tuyến đường
              </h1>
              <p className="mt-2 text-sm font-semibold text-orange-100 sm:text-base">
                Tạo tuyến mới và quản lý trạng thái hoạt động của tuyến ngay trên một màn hình.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Tổng tuyến</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{totalRoutes}</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Đang hoạt động</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{totalActiveRoutes}</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Tạm dừng</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{totalInactiveRoutes}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Danh sách tuyến</h2>
                <p className="mt-1 text-sm text-slate-500">Hiển thị tối đa 20 tuyến gần nhất theo bộ lọc.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormValues(initialFormState);
                    setIsCreateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                >
                  <FaPlus /> Tạo tuyến
                </button>

                <button
                  type="button"
                  onClick={loadRoutes}
                  disabled={isLoadingList}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                >
                  <FaSyncAlt className={isLoadingList ? "animate-spin" : ""} />
                  Làm mới
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="relative" ref={filterStartDropdownRef}>
                <button
                  type="button"
                  onClick={() => !provinceLoading && setIsFilterStartDropdownOpen((prev) => !prev)}
                  disabled={provinceLoading || provinceOptions.length === 0}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-orange-300 transition hover:border-orange-300 focus:border-orange-400 focus:ring disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <span className="truncate text-left">
                    {provinceLoading
                      ? "Đang tải tỉnh bắt đầu..."
                      : provinceOptions.find((p) => p.id === startFilter)?.name || "Lọc tỉnh/TP bắt đầu"}
                  </span>
                  <FaChevronDown className={`ml-2 text-xs transition-transform ${isFilterStartDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isFilterStartDropdownOpen ? (
                  <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="max-h-56 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setStartFilter("");
                          setIsFilterStartDropdownOpen(false);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-orange-50"
                      >
                        Bỏ chọn
                      </button>
                      {provinceOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setStartFilter(p.id);
                            setIsFilterStartDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                            p.id === startFilter ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={filterEndDropdownRef}>
                <button
                  type="button"
                  onClick={() => !provinceLoading && setIsFilterEndDropdownOpen((prev) => !prev)}
                  disabled={provinceLoading || provinceOptions.length === 0}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-orange-300 transition hover:border-orange-300 focus:border-orange-400 focus:ring disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <span className="truncate text-left">
                    {provinceLoading
                      ? "Đang tải tỉnh kết thúc..."
                      : provinceOptions.find((p) => p.id === endFilter)?.name || "Lọc tỉnh/TP kết thúc"}
                  </span>
                  <FaChevronDown className={`ml-2 text-xs transition-transform ${isFilterEndDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isFilterEndDropdownOpen ? (
                  <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="max-h-56 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEndFilter("");
                          setIsFilterEndDropdownOpen(false);
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-orange-50"
                      >
                        Bỏ chọn
                      </button>
                      {provinceOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setEndFilter(p.id);
                            setIsFilterEndDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                            p.id === endFilter ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <select
                value={isActiveFilter}
                onChange={(event) => setIsActiveFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Tạm dừng</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>

            {isLoadingList ? (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Đang tải danh sách tuyến...
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-2 font-semibold">Tên tuyến</th>
                    <th className="px-3 py-2 font-semibold">Giá (VND)</th>
                    <th className="px-3 py-2 font-semibold">Khoảng cách (km)</th>
                    <th className="px-3 py-2 font-semibold">Thời gian (phút)</th>
                    <th className="px-3 py-2 font-semibold">Trạng thái</th>
                    <th className="px-3 py-2 font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Không có tuyến phù hợp.
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => {
                      const isProcessing = processingRouteId === route.id;
                      return (
                        <tr key={route.id} className="border-b border-slate-100 align-top">
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-800">{route.routeName}</p>
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {Number(route.basePriceVnd || 0).toLocaleString("vi-VN")} đ
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {route.distanceKm}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {route.estimatedDurationMin}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                route.isActive
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-slate-300 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {route.isActive ? "Đang hoạt động" : "Tạm dừng"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleRoute(route)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                            >
                              {route.isActive ? <FaToggleOff /> : <FaToggleOn />}
                              {isProcessing ? "Đang cập nhật..." : route.isActive ? "Tắt tuyến" : "Kích hoạt"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Tạo tuyến mới</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleCreateRoute}>
                {locationErrorMessage ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {locationErrorMessage}
                  </div>
                ) : null}

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Tên tuyến</span>
                  <input
                    type="text"
                    name="routeName"
                    value={formValues.routeName}
                    onChange={handleChangeField}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                    placeholder="VD: Sai Gon - Vung Tau"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block" ref={startDropdownRef}>
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Tỉnh/TP bắt đầu</span>
                    <button
                      type="button"
                      onClick={() => !provinceLoading && setIsStartDropdownOpen((prev) => !prev)}
                      disabled={provinceLoading || provinceOptions.length === 0}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none ring-orange-300 transition hover:border-orange-300 focus:border-orange-400 focus:ring disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <span className="truncate text-left">
                        {provinceLoading
                          ? "Đang tải tỉnh/thành phố..."
                          : provinceOptions.find((p) => p.id === formValues.startProvinceId)?.name || "Chọn tỉnh/thành phố"}
                      </span>
                      <FaChevronDown className={`ml-2 text-xs transition-transform ${isStartDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStartDropdownOpen ? (
                      <div className="relative mt-2">
                        <div className="absolute z-30 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
                          <div className="max-h-56 overflow-y-auto">
                            {provinceOptions.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFormValues((prev) => ({ ...prev, startProvinceId: p.id }));
                                  setIsStartDropdownOpen(false);
                                }}
                                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                                  p.id === formValues.startProvinceId ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </label>

                  <label className="block" ref={endDropdownRef}>
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Tỉnh/TP kết thúc</span>
                    <button
                      type="button"
                      onClick={() => !provinceLoading && setIsEndDropdownOpen((prev) => !prev)}
                      disabled={provinceLoading || provinceOptions.length === 0}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none ring-orange-300 transition hover:border-orange-300 focus:border-orange-400 focus:ring disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      <span className="truncate text-left">
                        {provinceLoading
                          ? "Đang tải tỉnh/thành phố..."
                          : provinceOptions.find((p) => p.id === formValues.endProvinceId)?.name || "Chọn tỉnh/thành phố"}
                      </span>
                      <FaChevronDown className={`ml-2 text-xs transition-transform ${isEndDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isEndDropdownOpen ? (
                      <div className="relative mt-2">
                        <div className="absolute z-30 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
                          <div className="max-h-56 overflow-y-auto">
                            {provinceOptions.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFormValues((prev) => ({ ...prev, endProvinceId: p.id }));
                                  setIsEndDropdownOpen(false);
                                }}
                                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                                  p.id === formValues.endProvinceId ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </label>
                </div>

                {/* Optionally, you can add ward selection if needed: */}
                {/*
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Phường/Xã bắt đầu</span>
                    <select
                      name="startWardId"
                      value={formValues.startWardId || ""}
                      onChange={handleChangeField}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                      disabled={!formValues.startProvinceId || wardLoading.start}
                    >
                      <option value="">Chọn phường/xã</option>
                      {startWards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Phường/Xã kết thúc</span>
                    <select
                      name="endWardId"
                      value={formValues.endWardId || ""}
                      onChange={handleChangeField}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                      disabled={!formValues.endProvinceId || wardLoading.end}
                    >
                      <option value="">Chọn phường/xã</option>
                      {endWards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                */}

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Giá cơ bản (VND)</span>
                    <input
                      type="number"
                      name="basePriceVnd"
                      value={formValues.basePriceVnd}
                      onChange={handleChangeField}
                      min="1"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Khoảng cách (km)</span>
                    <input
                      type="number"
                      step="0.01"
                      name="distanceKm"
                      value={formValues.distanceKm}
                      onChange={handleChangeField}
                      min="0.01"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Thời gian dự kiến (phút)</span>
                    <input
                      type="number"
                      name="estimatedDurationMin"
                      value={formValues.estimatedDurationMin}
                      onChange={handleChangeField}
                      min="1"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-orange-300 transition focus:border-orange-400 focus:ring"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Huy
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-70"
                  >
                    <FaPlus />
                    {isSubmitting ? "Đang tạo tuyến..." : "ạo tuyến"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

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
      </main>
    </div>
  );
}

export default AdminRouteManagementPage;