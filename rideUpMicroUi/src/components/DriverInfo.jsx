import { FaCarSide, FaStar } from "react-icons/fa";
import { resolveImageUrl } from "../utils/imageUrl";

function DriverInfo({ driver }) {
  const avatarSrc = resolveImageUrl(driver.avatarUrl);

  return (
    <div className="flex items-center gap-3">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={driver.name || "Driver avatar"}
          className="h-11 w-11 rounded-xl border border-slate-200 object-cover shadow-md"
        />
      ) : (
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-base font-bold text-white shadow-md">
          {driver.initial}
        </span>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <FaStar className="text-amber-400" />
          <span>{driver.rating}</span>
          <span>•</span>
          <FaCarSide className="text-slate-400" />
          <span>{driver.vehicle}</span>
        </div>
      </div>
    </div>
  );
}

export default DriverInfo;
