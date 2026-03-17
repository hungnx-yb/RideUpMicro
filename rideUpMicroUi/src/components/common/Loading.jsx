import { FaSpinner } from "react-icons/fa";

function Loading({ text = "Loading..." }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <FaSpinner className="animate-spin" />
      <span>{text}</span>
    </div>
  );
}

export default Loading;
