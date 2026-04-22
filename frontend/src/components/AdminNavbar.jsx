import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";

export default function AdminNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 px-4 py-2">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white p-1.5 rounded-lg">
            <ShieldCheck size={16} />
          </div>
          <span className="font-black text-base tracking-tighter text-white">NxtWave</span>
          <span className="text-slate-600 font-thin">|</span>
          <span className="text-blue-400 font-bold text-[10px] tracking-widest uppercase">
            Admin Panel
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-widest cursor-pointer"
        >
          <LogOut size={12} /> Logout
        </button>
      </div>
    </nav>
  );
}
