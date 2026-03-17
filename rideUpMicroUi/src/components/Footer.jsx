import { FaCarSide } from "react-icons/fa";

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-sm sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-semibold text-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-xs text-white">
            <FaCarSide />
          </span>
          <span>RideUp</span>
        </div>
        <p className="text-center text-xs text-slate-400 sm:text-sm">
          © {new Date().getFullYear()} RideUp. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
