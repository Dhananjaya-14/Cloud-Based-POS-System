import { useTranslation } from "react-i18next";
import React from "react";
import { FaHotel, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaExternalLinkAlt, FaBuilding } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
const BranchTable = ({
  branches
}) => {
  const { t } = useTranslation();
const navigate = useNavigate();
  const {
    user
  } = useAuth();
  return <div style={{
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    overflowX: "auto" // Responsive scroll for small screens
  }}>
      <table style={{
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 8px"
    }}>
        <thead>
          <tr style={{
          textAlign: "left"
        }}>
            <th style={headerStyle}>{t("company_admin.branch_details", "Branch Details")}</th>
            {user?.role_id === 6 && <th style={headerStyle}>{t("company_admin.company", "Company")}</th>}
            <th style={headerStyle}>{t("company_admin.location", "Location")}</th>
            <th style={headerStyle}>{t("company_admin.contact", "Contact")}</th>
            <th style={headerStyle}>{t("company_admin.email", "Email")}</th>
            <th style={{
            ...headerStyle,
            textAlign: "center"
          }}>{t("company_admin.profile", "Profile")}</th>
          </tr>
        </thead>

        <tbody>
          {branches.map(b => <tr key={b.B_id} className="table-row" style={rowStyle}>
              {/* Branch Name with Icon */}
              <td style={{
            ...cellStyle,
            fontWeight: "600",
            color: "#1A1A1A"
          }}>
                <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
                  <div style={iconContainerStyle}>
                    <FaHotel size={18} color="#3A4DBF" />
                  </div>
                  {b.B_name}
                </div>
              </td>

              {/* Company (Super Admin only) */}
              {user?.role_id === 6 && <td style={{
            ...cellStyle,
            color: "#666"
          }}>
                  <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
                    <FaBuilding size={12} color="#999" />
                    {b.com_name || "N/A"}
                  </div>
                </td>}

              {/* Address with icon */}
              <td style={{
            ...cellStyle,
            color: "#666"
          }}>
                <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
                  <FaMapMarkerAlt size={12} color="#999" />
                  {b.B_address}
                </div>
              </td>

              {/* Contact */}
              <td style={{
            ...cellStyle,
            color: "#666"
          }}>
                <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
                  <FaPhoneAlt size={12} color="#999" />
                  {b.B_conNo}
                </div>
              </td>

              {/* Email */}
              <td style={{
            ...cellStyle,
            color: "#666"
          }}>
                <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
                  <FaEnvelope size={12} color="#999" />
                  {b.B_email}
                </div>
              </td>

              {/* Action Button */}
              <td style={{
            ...cellStyle,
            textAlign: "right"
          }}>
                <button style={buttonStyle} onClick={() => navigate(`/branch_profile/${b.B_id}`, {
              state: {
                branch: b
              }
            })} onMouseOver={e => {
              e.currentTarget.style.background = "#3A4DBF";
              e.currentTarget.style.color = "#fff";
            }} onMouseOut={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#3A4DBF";
            }}>{t("company_admin.view_profile", "View Profile")}<FaExternalLinkAlt size={10} style={{
                marginLeft: "6px"
              }} />
                </button>
              </td>
            </tr>)}
        </tbody>
      </table>

      {/* Adding a bit of CSS for the hover effect via JS is tricky, 
          so I've used inline styles above. For a production app, 
          I'd recommend a .css file or Styled Components. */}
    </div>;
};

// --- Styled Objects (Maintaining Clean Code) ---

const headerStyle = {
  padding: "12px 16px",
  color: "#888",
  fontSize: "0.85rem",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};
const cellStyle = {
  padding: "16px",
  fontSize: "0.95rem",
  background: "#F9FAFB" // Light background for the "row card"
};
const rowStyle = {
  transition: "transform 0.2s ease"
};
const iconContainerStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "#EEF0FF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};
const buttonStyle = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1.5px solid #3A4DBF",
  background: "transparent",
  color: "#3A4DBF",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
  transition: "all 0.3s ease",
  display: "inline-flex",
  alignItems: "center"
};
export default BranchTable;