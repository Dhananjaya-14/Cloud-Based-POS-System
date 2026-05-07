import React from "react";
import { FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import icon1 from "../../assets/images/DashboardIcon.png";
import posIcon from "../../assets/images/PosIcon.png";
import { useAuth } from "../../context/AuthContext";

const CashierHeader = () => {
  const { logout } = useAuth();

  return (
    <header className="w-full bg-gradient-to-r from-[#0052A8] via-[#00B4EB] to-[#40D463] text-white shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Left: Logo + app name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-white/20">
            <img
              src={posIcon}
              alt="Hotel POS logo"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">Hotel POS</div>
            <div className="text-[11px] text-white/80">Point of Sale System</div>
          </div>
        </div>

        {/* Center: main navigation */}
        <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium">
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors flex items-center gap-1.5">
            <span className="text-xs">🧾</span>
            <span>POS</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white text-[#0052A8] shadow-sm flex items-center gap-1.5">
            <img
              src={icon1}
              alt="Dashboard"
              className="w-4 h-4 object-contain"
            />
            <span>Dashboard</span>
          </button>
        </nav>

        {/* Right: user summary */}
        <div className="flex items-center gap-3">
           
           
         

          <div className="flex items-center gap-2 bg-black/15 rounded-lg px-3 py-1.5 border border-white/20">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FaUserCircle className="w-5 h-5" />
            </div>
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-xs font-semibold">Samantha</div>
              <div className="text-[11px] text-white/80">Cashier • Kandy</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="ml-1 px-5 py-2 text-xs font-medium rounded-lg bg-black hover:bg-black/40 border border-white/20 transition-colors flex items-center gap-2"
          >
            <FaSignOutAlt className="w-3 h-8" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CashierHeader;
