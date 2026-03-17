import { FaUser, FaCarSide } from "react-icons/fa";

const roleMeta = {
  CUSTOMER: {
    icon: FaUser,
    title: "Khách hàng",
    description: "Tìm kiếm và đặt chỗ trên các chuyến xe",
  },
  DRIVER: {
    icon: FaCarSide,
    title: "Tài xế",
    description: "Tạo và quản lý các chuyến xe ghép",
  },
};

function RoleCard({ role, selectedRole, onSelect }) {
  const currentRole = roleMeta[role];
  const Icon = currentRole.icon;
  const isSelected = selectedRole === role;

  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      className={`group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 ${
        isSelected
          ? "border-orange-300 bg-orange-50 shadow-md shadow-orange-500/15"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-all duration-300 ${
          isSelected
            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
            : "bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-600"
        }`}
      >
        <Icon />
      </span>

      <span>
        <span className="block text-sm font-semibold text-slate-900">{currentRole.title}</span>
        <span className="mt-1 block text-xs text-slate-500">{currentRole.description}</span>
      </span>
    </button>
  );
}

export default RoleCard;
