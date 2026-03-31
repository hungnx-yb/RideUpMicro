import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { getApiErrorMessage } from "../services/authApi";
import { processVnpayCallbackApi } from "../services/paymentApi";

function PaymentVnpayResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  const [status, setStatus] = useState("loading");
  const [title, setTitle] = useState("Đang xác nhận thanh toán");
  const [message, setMessage] = useState("Vui lòng chờ trong giây lát...");
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    if (processedRef.current) {
      return;
    }
    processedRef.current = true;

    const callbackParams = Object.fromEntries(searchParams.entries());
    if (!Object.keys(callbackParams).length) {
      setStatus("error");
      setTitle("Không nhận được dữ liệu thanh toán");
      setMessage("Thiếu dữ liệu callback từ VNPay. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
      return;
    }

    const processCallback = async () => {
      try {
        const paymentResult = await processVnpayCallbackApi(callbackParams);
        const paymentStatus = paymentResult?.status;
        setBookingId(paymentResult?.bookingId || "");

        if (paymentStatus === "PAID") {
          setStatus("success");
          setTitle("Thanh toán thành công");
          setMessage("Giao dịch đã được xác nhận. Đơn đặt chỗ của bạn đã được cập nhật.");
          return;
        }

        setStatus("failed");
        setTitle("Thanh toán chưa thành công");
        setMessage(paymentResult?.failureReason || "Thanh toán chưa hoàn tất. Bạn có thể thử lại sau.");
      } catch (error) {
        setStatus("error");
        setTitle("Xử lý callback thất bại");
        setMessage(getApiErrorMessage(error, "Không thể xác nhận kết quả thanh toán. Vui lòng thử lại."));
      }
    };

    processCallback();
  }, [searchParams]);

  const renderIcon = () => {
    if (status === "loading") {
      return <FaSpinner className="text-3xl text-blue-600 animate-spin" />;
    }

    if (status === "success") {
      return <FaCheckCircle className="text-3xl text-emerald-600" />;
    }

    return <FaExclamationCircle className="text-3xl text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {renderIcon()}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>

        {bookingId ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Mã booking: <span className="font-semibold">{bookingId}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/trips/search")}
            className="rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Về trang tìm chuyến
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentVnpayResultPage;
