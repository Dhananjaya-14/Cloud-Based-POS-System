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
  return <div className="admin-branch-table-card" style={{
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    overflowX: "auto"
  }}>
      {/* Desktop & Tablet Table View */}
      <div className="admin-branch-table-desktop">
        <table style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 8px",
          minWidth: 680
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
            {branches.map(b => {
              const branchId = b.B_id ?? b.b_id ?? b.id;
              const branchName = b.B_name ?? b.b_name ?? b.name;
              const branchAddress = b.B_address ?? b.b_address ?? b.address;
              const branchContact = b.B_conNo ?? b.b_conNo ?? b.contact;
              const branchEmail = b.B_email ?? b.b_email ?? b.email;
              const companyName = b.com_name ?? b.companyName;

              return <tr key={branchId} className="table-row" style={rowStyle}>
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
                    {branchName}
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
                      {companyName || "N/A"}
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
                    {branchAddress}
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
                    {branchContact}
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
                    {branchEmail}
                  </div>
                </td>

                {/* Action Button */}
                <td style={{
                ...cellStyle,
                textAlign: "right"
              }}>
                  <button style={buttonStyle} onClick={() => navigate(`/branch_profile/${branchId}`, {
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
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="admin-branch-cards-mobile">
        {branches.map(b => {
          const branchId = b.B_id ?? b.b_id ?? b.id;
          const branchName = b.B_name ?? b.b_name ?? b.name ?? "Branch";
          const branchAddress = b.B_address ?? b.b_address ?? b.address;
          const branchContact = b.B_conNo ?? b.b_conNo ?? b.contact;
          const branchEmail = b.B_email ?? b.b_email ?? b.email;
          const companyName = b.com_name ?? b.companyName;

          return (
            <div
              key={branchId}
              className="admin-branch-mobile-card"
              onClick={() => navigate(`/branch_profile/${branchId}`, {
                state: { branch: b }
              })}
            >
              <div className="admin-branch-mobile-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={iconContainerStyle}>
                    <FaHotel size={18} color="#3A4DBF" />
                  </div>
                  <div>
                    <h3 className="admin-branch-mobile-title">{branchName}</h3>
                    {user?.role_id === 6 && companyName && (
                      <span className="admin-branch-mobile-company">
                        <FaBuilding size={11} style={{ marginRight: "4px" }} />
                        {companyName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-branch-mobile-card-body">
                {branchAddress && (
                  <div className="admin-branch-mobile-info-row">
                    <FaMapMarkerAlt size={13} color="#999" style={{ flexShrink: 0 }} />
                    <span>{branchAddress}</span>
                  </div>
                )}
                {branchContact && (
                  <div className="admin-branch-mobile-info-row">
                    <FaPhoneAlt size={13} color="#999" style={{ flexShrink: 0 }} />
                    <span>{branchContact}</span>
                  </div>
                )}
                {branchEmail && (
                  <div className="admin-branch-mobile-info-row">
                    <FaEnvelope size={13} color="#999" style={{ flexShrink: 0 }} />
                    <span>{branchEmail}</span>
                  </div>
                )}
              </div>

              <div className="admin-branch-mobile-card-footer">
                <button
                  style={buttonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/branch_profile/${branchId}`, {
                      state: { branch: b }
                    });
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = "#3A4DBF";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#3A4DBF";
                  }}
                >
                  {t("company_admin.view_profile", "View Profile")}
                  <FaExternalLinkAlt size={10} style={{ marginLeft: "6px" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
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