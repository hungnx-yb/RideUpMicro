import { FaCarSide, FaStar } from "react-icons/fa";
import { resolveImageUrl } from "../utils/imageUrl";

function DriverInfo({ driver }) {
  const avatarSrc = resolveImageUrl(driver.avatarUrl);

  return (
    <div className="flex items-center gap-2.5">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={driver.name || "Driver avatar"}
          className="h-9 w-9 rounded-lg border border-slate-200 object-cover shadow-sm"
        />
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-sm font-bold text-white shadow-sm">
          {driver.initial}
        </span>
      )}

      <div>
        <p className="text-[13px] font-semibold text-slate-900">{driver.name}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
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
