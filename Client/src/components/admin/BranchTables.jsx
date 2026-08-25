import { useTranslation } from "react-i18next";
import React from "react";
export default function BranchTables({
  branches = [],
  branchStats = []
}) {
  const { t } = useTranslation();
// Merge stats by B_id
  const statsById = Object.fromEntries(branchStats.map(s => [String(s.B_id), s]));
  const rows = branches.map(b => {
    const s = statsById[String(b.B_id)] || {
      revenue: 0,
      orders: 0
    };
    return {
      ...b,
      revenue: Number(s.revenue || 0),
      orders: Number(s.orders || 0)
    };
  });
  return <div style={{
    background: "#fff",
    padding: 16,
    borderRadius: 12
  }}>
      <h3 style={{
      marginTop: 0
    }}>{t("company_admin.branch_summary", "Branch Summary")}</h3>
      <table style={{
      width: "100%",
      borderCollapse: "collapse"
    }}>
        <thead>
          <tr style={{
          textAlign: "left",
          color: "#475569"
        }}>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.id", "ID")}</th>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.name", "Name")}</th>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.email", "Email")}</th>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.contact", "Contact")}</th>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.revenue", "Revenue")}</th>
            <th style={{
            padding: "8px 6px"
          }}>{t("company_admin.orders", "Orders")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => <tr key={r.B_id} style={{
          borderTop: "1px solid #EEF2F7"
        }}>
              <td style={{
            padding: "8px 6px"
          }}>{r.B_id}</td>
              <td style={{
            padding: "8px 6px"
          }}>{r.B_name}</td>
              <td style={{
            padding: "8px 6px"
          }}>{r.B_email}</td>
              <td style={{
            padding: "8px 6px"
          }}>{r.B_conNo}</td>
              <td style={{
            padding: "8px 6px"
          }}>${r.revenue.toFixed(2)}</td>
              <td style={{
            padding: "8px 6px"
          }}>{r.orders}</td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}