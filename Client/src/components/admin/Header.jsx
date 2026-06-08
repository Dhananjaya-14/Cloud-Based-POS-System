import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const Header = ({ title = "Branch Management" }) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!user) {
      setCompanyName("");
      return;
    }
    // Read company name purely from the user's auth profile — no API call needed
    const uCompany = user?.com_name ?? user?.companyName ?? user?.company?.com_name ?? "";
    setCompanyName(uCompany);
  }, [user]);

  const fullName =
    user?.u_fname || user?.u_lname
      ? [user?.u_fname, user?.u_lname].filter(Boolean).join(" ")
      : user?.name || "";

  const email = user?.u_email || user?.email || "";

  return (
    <div
      style={{
        height: "70px",
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        margin: 0,
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
      }}
    >
      <h2 style={{ fontSize: "26px", margin: 0, fontWeight: "500" }}>{title}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <FaBell size={20} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.08)",
            padding: "6px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <FaUserCircle size={30} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>
              {fullName || "User"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.95 }}>{email || "—"}</div>
            {companyName && (
              <div style={{ fontSize: "12px", opacity: 0.9 }}>{companyName}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

























