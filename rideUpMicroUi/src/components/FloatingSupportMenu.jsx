import { useState } from "react";
import { FaComments, FaPhoneAlt, FaQuestionCircle, FaPlus } from "react-icons/fa";

const actions = [
  {
    id: "chat",
    label: "Chat hỗ trợ",
    icon: FaComments,
    href: "#",
    className: "from-blue-500 to-blue-600",
  },
  {
    id: "hotline",
    label: "Gọi hotline",
    icon: FaPhoneAlt,
    href: "tel:19001000",
    className: "from-emerald-500 to-green-500",
  },
  {
    id: "help",
    label: "Trung tâm trợ giúp",
    icon: FaQuestionCircle,
    href: "#",
    className: "from-purple-500 to-fuchsia-500",
  },
];

function FloatingSupportMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 z-50 sm:right-6">
      <div className="mb-3 flex flex-col items-end gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <a
              key={action.id}
              href={action.href}
              className={`inline-flex min-w-[170px] items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:translate-x-0.5 hover:shadow-xl ${action.className} ${
                isOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: isOpen ? `${index * 70}ms` : "0ms" }}
            >
              <Icon className="text-xs" />
              <span>{action.label}</span>
            </a>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="ml-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900 text-white shadow-xl shadow-emerald-900/25 transition-all duration-300 hover:scale-105 hover:bg-emerald-800"
        aria-label={isOpen ? "Đóng menu hỗ trợ" : "Mở menu hỗ trợ"}
      >
        <FaPlus className={`text-2xl transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}

export default FloatingSupportMenu;
