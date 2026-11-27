import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { getApiErrorMessage, verifyAccountApi } from "../services/authApi";

/**
 * Trang công khai mở từ link xác thực trong email đăng ký.
 * Người dùng đăng ký qua app (khách hàng / tài xế) nên sau khi xác thực
 * chỉ hướng dẫn quay lại app đăng nhập, không chuyển sang trang đăng nhập admin.
 */
function AuthVerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Đang xác thực tài khoản...");
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Liên kết xác thực không hợp lệ.");
      return;
    }
    if (hasRequested.current) {
      return;
    }
    hasRequested.current = true;

    const verify = async () => {
      try {
        await verifyAccountApi(token);
        setStatus("success");
        setMessage("Tài khoản của bạn đã được kích hoạt. Hãy quay lại ứng dụng RideUp để đăng nhập.");
      } catch (error) {
        setStatus("error");
        setMessage(getApiErrorMessage(error, "Xác thực thất bại hoặc liên kết đã hết hạn."));
      }
    };
    verify();
  }, [token]);

  const iconByStatus = {
    loading: <FaSpinner size={24} className="animate-spin" />,
    success: <FaCheckCircle size={24} />,
    error: <FaExclamationTriangle size={24} />,
  };

  const titleByStatus = {
    loading: "Đang xác thực tài khoản",
    success: "Xác thực thành công",
    error: "Xác thực không thành công",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_55%)] px-4 py-10">
      <main className="mx-auto w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            status === "success" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
          }`}
        >
          {iconByStatus[status]}
        </span>

        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">{titleByStatus[status]}</h1>
        <p className="mt-3 text-slate-600">{message}</p>

        {status === "error" && (
          <p className="mt-4 text-sm text-slate-500">
            Nếu liên kết đã hết hạn, hãy đăng ký lại trên ứng dụng RideUp để nhận email xác thực mới.
          </p>
        )}
      </main>
    </div>
  );
}

export default AuthVerifyAccountPage;
