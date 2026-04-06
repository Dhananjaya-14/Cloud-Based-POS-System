// components/branch-admin/RawIngredient.jsx
import React from "react";

const RawIngredient = ({ index, data, onChange, onRemove, validUnits }) => {
  // Theme Color (matching image)
  const primaryTeal = "#13B5B1";

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "3fr 1.5fr 1.5fr 1.5fr 50px", // Adjusted ratios for cleaner look
    gap: "20px",
    alignItems: "start", // Align items to top for better label/input handling
    padding: "20px",
    background: "#fff", // White background for the card
    border: "1px solid #E4E7EC", // Subtle border
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)", // Minimal shadow
    transition: "box-shadow 0.2s ease, border-color 0.2s ease",
  };

  // Define input style to be reused
  const baseInputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #D0D5DD", // Standard bordered look from theme
    fontSize: "14px",
    color: "#101828",
    background: "white",
    boxSizing: "border-box", // Important for padding
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#344054", // Dark grey from theme
    marginBottom: "6px",
  };

  return (
    <div style={rowStyle} className="ingredient-row-card">
      <div>
        <label style={labelStyle}>Ingredient Name *</label>
        <input
          style={baseInputStyle}
          placeholder="e.g. Fresh Tomatoes"
          value={data.rm_name}
          onChange={(e) => onChange(index, "rm_name", e.target.value)}
          onFocus={(e) => e.target.style.borderColor = primaryTeal} // Focus state
          onBlur={(e) => e.target.style.borderColor = "#D0D5DD"} // Blur state
        />
      </div>

      <div>
        <label style={labelStyle}>Unit *</label>
        <select
          style={baseInputStyle}
          value={data.unit}
          onChange={(e) => onChange(index, "unit", e.target.value)}
          onFocus={(e) => e.target.style.borderColor = primaryTeal}
          onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
        >
          <option value="" disabled>Select</option>
          {validUnits.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Initial Qty *</label>
        <input
          type="number"
          style={baseInputStyle}
          placeholder="0"
          value={data.stock_qty}
          onChange={(e) => onChange(index, "stock_qty", e.target.value)}
          onFocus={(e) => e.target.style.borderColor = primaryTeal}
          onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
        />
      </div>

      <div>
        <label style={labelStyle}>Min. Stock *</label>
        <input
          type="number"
          style={baseInputStyle}
          placeholder="0"
          value={data.record_level}
          onChange={(e) => onChange(index, "record_level", e.target.value)}
          onFocus={(e) => e.target.style.borderColor = primaryTeal}
          onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', paddingTop: '28px' }}>
        <button
          onClick={() => onRemove(index)}
          title="Remove item"
          style={{
            background: "none",
            border: "1px solid transparent",
            color: "#667085", // Muted grey
            cursor: "pointer",
            fontSize: "22px",
            padding: "8px",
            borderRadius: "50%",
            transition: "all 0.2s ease",
            marginTop: "auto"
          }}
          onMouseOver={(e) => {e.target.style.color = "#dc3545"; e.target.style.background = "#FEF3F2"}}
          onMouseOut={(e) => {e.target.style.color = "#667085"; e.target.style.background = "none"}}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default RawIngredient;







































// import React from "react";

// const RawIngredient = ({ index, data, onChange, onRemove, validUnits }) => {
//   const rowStyle = {
//     display: "grid",
//     gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
//     gap: "15px",
//     alignItems: "end",
//     padding: "15px",
//     background: "#f8f9fa",
//     borderRadius: "8px",
//     marginBottom: "10px",
//   };

//   const inputStyle = {
//     width: "100%",
//     padding: "8px 12px",
//     borderRadius: "4px",
//     border: "1px solid #ccc",
//     fontSize: "14px",
//   };

//   const labelStyle = {
//     display: "block",
//     fontSize: "12px",
//     fontWeight: "600",
//     color: "#555",
//     marginBottom: "5px",
//   };

//   return (
//     <div style={rowStyle}>
//       <div>
//         <label style={labelStyle}>Ingredient Name *</label>
//         <input
//           style={inputStyle}
//           placeholder="e.g. Fresh Tomatoes"
//           value={data.rm_name}
//           onChange={(e) => onChange(index, "rm_name", e.target.value)}
//         />
//       </div>

//       <div>
//         <label style={labelStyle}>Unit *</label>
//         <select
//           style={inputStyle}
//           value={data.unit}
//           onChange={(e) => onChange(index, "unit", e.target.value)}
//         >
//           <option value="">Select</option>
//           {validUnits.map((u) => (
//             <option key={u} value={u}>{u}</option>
//           ))}
//         </select>
//       </div>

//       <div>
//         <label style={labelStyle}>Initial Qty *</label>
//         <input
//           type="number"
//           style={inputStyle}
//           value={data.stock_qty}
//           onChange={(e) => onChange(index, "stock_qty", e.target.value)}
//         />
//       </div>

//       <div>
//         <label style={labelStyle}>Min. Stock *</label>
//         <input
//           type="number"
//           style={inputStyle}
//           value={data.record_level}
//           onChange={(e) => onChange(index, "record_level", e.target.value)}
//         />
//       </div>

//       <button
//         onClick={() => onRemove(index)}
//         style={{
//           background: "none",
//           border: "none",
//           color: "#dc3545",
//           cursor: "pointer",
//           fontSize: "20px",
//           paddingBottom: "8px"
//         }}
//       >
//         ×
//       </button>
//     </div>
//   );
// };

// export default RawIngredient;