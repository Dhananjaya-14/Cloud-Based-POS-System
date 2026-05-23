import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getBranchById } from "../../services/api";

const Header = ({ title = "Product Management", showAddUserIcon = true }) => {
  const { user } = useAuth();
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadBranch = async () => {
      const fromUser = user?.B_name ?? user?.b_name ?? user?.branchName ?? null;
      if (fromUser) {
        if (mounted) setBranchName(fromUser);
        return;
      }

      if (user?.b_id) {
        try {
          const res = await getBranchById(user.b_id);
          const branch = res?.data ?? res;
          if (mounted) setBranchName(branch?.B_name ?? branch?.b_name ?? "");
        } catch {
          if (mounted) setBranchName("");
        }
      } else {
        if (mounted) setBranchName("");
      }
    };

    loadBranch();
    return () => {
      mounted = false;
    };
  }, [user]);

  const fullName =
    (user?.u_fname || user?.u_lname)
      ? [user?.u_fname, user?.u_lname].filter(Boolean).join(" ")
      : user?.name || "";
  const email = user?.u_email || user?.email || "";
  const role = user?.role_name || user?.role || user?.role?.name || "";

  return (
    <div
      style={{
        position: "relative",
        top: "-10px",
        left: 0,
        right: 0,
        height: "70px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        boxSizing: "border-box",
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
      }}
    >
      <h2 style={{ fontSize: "30px", margin: 0, fontWeight: 700 }}>{title}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {showAddUserIcon && <FaUserPlus size={18} />}
        <FaBell size={20} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid rgba(255,255,255,0.6)",
            padding: "6px 14px",
            borderRadius: "10px",
          }}
        >
          <FaUserCircle size={30} />
          <div>
            <div style={{ fontSize: "14px", lineHeight: 1.2 }}>
              {fullName || role || "User"}
            </div>
            <div style={{ fontSize: "12px", lineHeight: 1.2 }}>{email || "—"}</div>
            {branchName ? (
              <div style={{ fontSize: "12px", lineHeight: 1.2 }}>{branchName}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;




























