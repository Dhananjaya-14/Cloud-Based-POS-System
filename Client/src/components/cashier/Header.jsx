import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import icon1 from "../../assets/images/DashboardIcon.png";
import posIcon from "../../assets/images/PosIcon.png";
import { useAuth } from "../../context/AuthContext";
import { getBranchById } from "../../services/api";

const ROLE_LABELS = {
  1: "Branch Admin",
  2: "Admin",
  3: "Cashier",
  6: "Super Admin",
  8: "Waiter",
  9: "Kitchen Staff",
};

const CashierHeader = () => {
  const { user, logout } = useAuth();
  const [branchName, setBranchName] = useState("Loading...");
  const roleLabel = ROLE_LABELS[user?.role_id] || "Staff";

  useEffect(() => {
    const branchId = user?.b_id ?? user?.B_id ?? null;

    const fetchBranch = async () => {
      try {
        const res = await getBranchById(branchId);
        // handle both direct { B_name } and wrapped { data: { B_name } }
        const name = res?.B_name ?? res?.data?.B_name ?? null;
        setBranchName(name || "—");
      } catch {
        setBranchName("—");
      }
    };

    if (branchId) fetchBranch();
    else setBranchName("—");
  }, [user?.b_id, user?.B_id]);

  return (
    <header className="w-full bg-gradient-to-r from-[#0052A8] via-[#00B4EB] to-[#40D463] text-white shadow-sm">
      <div className="mx-auto max-w-380 px-3 flex items-center justify-between px-6 py-3">
        {/* Left: Logo + app name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-white/20">
            <img
              src={posIcon}
              alt="Hotel POS logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-semibold tracking-wide">Hotel POS</div>
            <div className="text-[13px] text-white/80">Point of Sale System</div>
          </div>
        </div>

        {/* Right: user summary */}
        <div className="flex items-center gap-2">

          <div className="flex items-center gap-2 bg-black/15 rounded-lg px-3 py-1.5 border border-white/20">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FaUserCircle className="w-5 h-5" />
            </div>
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-xs font-semibold">{user?.u_fname || "Cashier"} {user?.u_lname || ""}</div>
              <div className="text-[11px] text-white/80">{roleLabel} • {branchName}</div>
            </div>
          </div>

          <button
            onClick={logout}
             className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
          >
            <FaSignOutAlt className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default CashierHeader;
