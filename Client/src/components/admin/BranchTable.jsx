import React from "react";
import Button from "./Button";
import { FaUserCircle } from "react-icons/fa";

const BranchTable = ({ branches }) => {
  return (
    <div
      style={{
        // background: "#fff",
        borderRadius: "10px",
        padding: "20px",
        marginTop: "20px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#EAEAEA", textAlign: "left" }}>
            <th style={{ padding: "10px" }}>Branch Name</th>
            <th>Address</th>
            <th>Contact Number</th>
            <th>Email Address</th>
            <th>Profile</th>
          </tr>
        </thead>

        <tbody>
          {branches.map((b) => (
            <tr key={b.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
                <FaUserCircle size={30} color="#3A4DBF" />
                {b.name}
              </td>
              <td>{b.address}</td>
              <td>{b.contact}</td>
              <td>{b.email}</td>
              <td>
                <button
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid #3A4DBF",
                    background: "transparent",
                    color: "#3A4DBF",
                    cursor: "pointer",
                  }}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BranchTable;

