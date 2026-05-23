import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getCompanies } from "../../services/api";

const Header = ({ title = "Branch Management" }) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCompany = async () => {
      if (!user) {
        if (mounted) setCompanyName("");
        return;
      }

      const uCompany = user?.com_name ?? user?.companyName ?? user?.company?.com_name ?? "";
      if (uCompany) {
        if (mounted) setCompanyName(uCompany);
        return;
      }

      if (user?.com_id) {
        try {
          const companies = await getCompanies();
          const found = Array.isArray(companies)
            ? companies.find((c) => Number(c.com_id) === Number(user.com_id))
            : null;
          if (mounted) setCompanyName(found?.com_name || "");
        } catch {
          if (mounted) setCompanyName("");
        }
      }
    };

    loadCompany();
    return () => {
      mounted = false;
    };
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

























