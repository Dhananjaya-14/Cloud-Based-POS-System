// // components/branch-admin/AddRawMaterials.jsx
// import React, { useState, useEffect } from "react";
// import RawIngredient from "../../components/branch-admin/RawIngredient";
// import Sidebar from "../../components/branch-admin/Sidebar";
// import Header from "../../components/branch-admin/Header";
// import ToastMessage from "../../components/branch-admin/ToastMessage"; 

// const AddRawMaterials = () => {
//   const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
//   const primaryTeal = "#3A4DBF";
//   const primaryBlue = "#001F3F";
//   const bgGrey = "#F9FAFB";

//   const [supplier, setSupplier] = useState({
//     sup_name: "",
//     sup_email: "",
//     sup_contact: "",
//     sup_address: "",
//   });

//   const [materials, setMaterials] = useState([
//     { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" },
//   ]);

//   const [existingSuppliers, setExistingSuppliers] = useState([]);
//   const [toast, setToast] = useState({ show: false, message: "", type: "success" });

//   // --- LOGIC: Load existing suppliers ---
//   useEffect(() => {
//     fetch("/api/suppliers")
//       .then(res => res.json())
//       .then(data => setExistingSuppliers(data))
//       .catch(err => console.error("Error fetching suppliers:", err));
//   }, []);

//   const showToast = (message, type = "success") => {
//     setToast({ show: true, message, type });
//   };

//   const handleSupplierChange = (field, value) => {
//     setSupplier({ ...supplier, [field]: value });
//   };

//   const handleMaterialChange = (index, field, value) => {
//     const updated = [...materials];
//     updated[index][field] = value;
//     setMaterials(updated);
//   };

//   const addMaterialRow = () => {
//     setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
//   };

//   const removeMaterialRow = (index) => {
//     if (materials.length > 1) {
//       setMaterials(materials.filter((_, i) => i !== index));
//     } else {
//       showToast("At least one ingredient is required.", "error");
//     }
//   };

//   // --- LOGIC: Handle Submit with Transactional Flow ---
//   const handleSubmit = async () => {
//     try {
//       if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
//         throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
//       }

//       // 1. Handle Supplier (Existing logic)
//       let finalSupId;
//       const existing = existingSuppliers.find(
//         (s) => s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
//       );

//       if (existing) {
//         finalSupId = existing.sup_id;
//       } else {
//         const supRes = await fetch("/api/suppliers", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(supplier),
//         });
//         const supplierData = await supRes.json();
//         if (!supRes.ok) throw new Error(supplierData.message || "Supplier creation failed");
//         finalSupId = supplierData.sup_id;
//       }

//       // 2. Create the Purchase Order (The Header)
//       const poRes = await fetch("/api/purchase-orders", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           sup_id: finalSupId,
//           B_id: 6, // Branch ID
//           status: "received",
//           order_date: new Date().toISOString()
//         }),
//       });
//       const poData = await poRes.json();
//       if (!poRes.ok) throw new Error(poData.message || "Purchase Order creation failed");
//       const finalPoId = poData.po_id;

//       // 3. Loop through materials to create Raw Materials AND Purchase Items
//       for (const item of materials) {
//         if (!item.rm_name || !item.unit) continue;

//         // A. Create/Update Raw Material (Inventory)
//         const matRes = await fetch("/api/raw-materials", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ 
//             rm_name: item.rm_name, 
//             unit: item.unit, 
//             stock_qty: item.stock_qty, 
//             record_level: item.record_level 
//           }),
//         });
//         const matData = await matRes.json();
//         if (!matRes.ok) throw new Error(matData.message || `Failed to add ${item.rm_name}`);
//         const finalRmId = matData.rm_id;

//         // B. Create the Purchase Item (Financial Link)
//         const piRes = await fetch("/api/purchase-items", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             po_id: finalPoId,
//             rm_id: finalRmId,
//             qty: item.stock_qty,
//             unit_price: item.unit_price,
//             price: parseFloat(item.stock_qty) * parseFloat(item.unit_price)
//           }),
//         });
//         if (!piRes.ok) throw new Error(`Failed to record purchase for ${item.rm_name}`);
//       }

//       showToast("Inventory and Purchase Records updated successfully!", "success");
      
//       // Reset State
//       setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
//       setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
      
//       // Refresh local supplier list
//       const updatedSups = await fetch("/api/suppliers").then(r => r.json());
//       setExistingSuppliers(updatedSups);

//     } catch (err) {
//       showToast(err.message, "error");
//     }
//   };

//   // --- STYLING ---
//   const containerStyle = { padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
//   const sectionStyle = { marginBottom: "30px", padding: "28px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
//   const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" };
//   const inputStyle = { width: "100%", padding: "12px 16px", marginTop: "8px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px", boxSizing: "border-box", transition: "border-color 0.2s ease" };
//   const labelStyle = { display: "block", fontSize: "14px", fontWeight: "500", color: "#344054" };

//   const secondaryBtnStyle = { background: "#fff", color: "#344054", padding: "12px 20px", border: "1px solid #D0D5DD", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease" };
//   const primaryBtnStyle = { background: primaryTeal, color: "white", padding: "12px 28px", border: `1px solid ${primaryTeal}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px", float: "right" };

//   return (
//     <div style={{ display: "flex", background: bgGrey, minHeight: "100vh" }}>
//       <Sidebar />
//       {toast.show && (
//         <ToastMessage
//           message={toast.message}
//           type={toast.type}
//           onClose={() => setToast({ ...toast, show: false })}
//         />
//       )}
//       <div style={{ flex: 1, marginLeft: "240px" }}>
//         <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
//         <div style={{ padding: "10px 20px" , minHeight: "calc(100vh - 70px)" }}>
//           <div style={containerStyle}>
            
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
//                 <div>
//                     <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
//                     <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px'}}>Onboard new suppliers and log incoming ingredients</p>
//                 </div>
//             </div>

//             {/* Section 1: Supplier Details */}
//             <div style={sectionStyle}>
//               <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
//                   <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
//                   <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
//               </div>
//               <div style={gridStyle}>
//                 <div>
//                   <label style={labelStyle}>Supplier Name *</label>
//                   <input
//                     style={inputStyle}
//                     placeholder="Enter supplier/business name"
//                     value={supplier.sup_name}
//                     onChange={(e) => handleSupplierChange("sup_name", e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Contact Number *</label>
//                   <input
//                     style={inputStyle}
//                     placeholder="+94 7X XXX XXXX"
//                     value={supplier.sup_contact}
//                     onChange={(e) => handleSupplierChange("sup_contact", e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Email Address *</label>
//                   <input
//                     style={inputStyle}
//                     placeholder="supplier@example.com"
//                     value={supplier.sup_email}
//                     onChange={(e) => handleSupplierChange("sup_email", e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Address</label>
//                   <input
//                     style={inputStyle}
//                     placeholder="Enter physical address (optional)"
//                     value={supplier.sup_address}
//                     onChange={(e) => handleSupplierChange("sup_address", e.target.value)}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Section 2: Raw Ingredients */}
//             <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                     <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
//                     <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
//                 </div>
//                 <button 
//                   onClick={addMaterialRow} 
//                   style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}
//                 >
//                   <span style={{fontSize: '16px'}}>+</span> Add Another Ingredient
//                 </button>
//               </div>
//               {materials.map((m, idx) => (
//                 <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
//               ))}
//             </div>

//             {/* Action Buttons */}
//             <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
//               <button style={{ ...secondaryBtnStyle, marginRight: '12px' }}>
//                 Cancel
//               </button>
//               <button 
//                 style={primaryBtnStyle} 
//                 onClick={handleSubmit}
//                 onMouseOver={(e) => e.target.style.background = "#2e3da3"}
//                 onMouseOut={(e) => e.target.style.background = primaryTeal}
//               >
//                 Save All Records <span style={{fontSize: '16px'}}>→</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddRawMaterials;







































// components/branch-admin/AddRawMaterials.jsx
import React, { useState, useEffect } from "react";
import RawIngredient from "../../components/branch-admin/RawIngredient";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage"; 

const AddRawMaterials = () => {
  const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
  const primaryTeal = "#3A4DBF";
  const primaryBlue = "#001F3F";
  const bgGrey = "#F9FAFB";

  const [supplier, setSupplier] = useState({
    sup_name: "",
    sup_email: "",
    sup_contact: "",
    sup_address: "",
  });

  const [materials, setMaterials] = useState([
    { rm_name: "", unit: "", stock_qty: "", record_level: "" },
  ]);

  const [existingSuppliers, setExistingSuppliers] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // --- LOGIC: Load existing suppliers ---
  useEffect(() => {
    fetch("/api/suppliers")
      .then(res => res.json())
      .then(data => setExistingSuppliers(data))
      .catch(err => console.error("Error fetching suppliers:", err));
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const handleSupplierChange = (field, value) => {
    setSupplier({ ...supplier, [field]: value });
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const addMaterialRow = () => {
    setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "" }]);
  };

  const removeMaterialRow = (index) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    } else {
      showToast("At least one ingredient is required.", "error");
    }
  };

  // --- LOGIC: Handle Submit with Duplicate Check ---
  const handleSubmit = async () => {
    try {
      if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
        throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
      }

      let finalSupId;
      const existing = existingSuppliers.find(
        (s) => s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
      );

      if (existing) {
        finalSupId = existing.sup_id;
      } else {
        const supRes = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supplier),
        });
        const supplierData = await supRes.json();
        if (!supRes.ok) throw new Error(supplierData.message || "Supplier creation failed");
        finalSupId = supplierData.sup_id;
      }

      for (const item of materials) {
        if (!item.rm_name || !item.unit) continue;
        
        const matRes = await fetch("/api/raw-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, sup_id: finalSupId }),
        });
        if (!matRes.ok) {
          const matData = await matRes.json();
          throw new Error(matData.message || `Failed to add ${item.rm_name}`);
        }
      }

      showToast(existing ? "New materials added to existing supplier!" : "New supplier and materials saved!", "success");
      
      setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
      setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "" }]);
      
      const updatedSups = await fetch("/api/suppliers").then(r => r.json());
      setExistingSuppliers(updatedSups);

    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // --- STYLING: Reverting to the detailed layout ---
  const containerStyle = { padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
  const sectionStyle = { marginBottom: "30px", padding: "28px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" };
  const inputStyle = { width: "100%", padding: "12px 16px", marginTop: "8px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px", boxSizing: "border-box", transition: "border-color 0.2s ease" };
  const labelStyle = { display: "block", fontSize: "14px", fontWeight: "500", color: "#344054" };

  const secondaryBtnStyle = { background: "#fff", color: "#344054", padding: "12px 20px", border: "1px solid #D0D5DD", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease" };
  const primaryBtnStyle = { background: primaryTeal, color: "white", padding: "12px 28px", border: `1px solid ${primaryTeal}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px", float: "right" };

  return (
    <div style={{ display: "flex", background: bgGrey, minHeight: "100vh" }}>
      <Sidebar />
      {toast.show && (
        <ToastMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
        <div style={{ padding: "10px 20px" , minHeight: "calc(100vh - 70px)" }}>
          <div style={containerStyle}>
            
            {/* Page Title Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
                <div>
                    <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
                    <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px'}}>Onboard new suppliers and log incoming ingredients</p>
                </div>
            </div>

            {/* Section 1: Supplier Details (Reverted to Icons & Specific Placeholders) */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
                  <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
              </div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Supplier Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Enter supplier/business name"
                    value={supplier.sup_name}
                    onChange={(e) => handleSupplierChange("sup_name", e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = primaryTeal}
                    onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact Number *</label>
                  <input
                    style={inputStyle}
                    placeholder="+94 7X XXX XXXX"
                    value={supplier.sup_contact}
                    onChange={(e) => handleSupplierChange("sup_contact", e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = primaryTeal}
                    onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    style={inputStyle}
                    placeholder="supplier@example.com"
                    value={supplier.sup_email}
                    onChange={(e) => handleSupplierChange("sup_email", e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = primaryTeal}
                    onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    style={inputStyle}
                    placeholder="Enter physical address (optional)"
                    value={supplier.sup_address}
                    onChange={(e) => handleSupplierChange("sup_address", e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = primaryTeal}
                    onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Raw Ingredients (Reverted to Transparent Borderless Container) */}
            <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
                    <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
                </div>
                <button 
                  onClick={addMaterialRow} 
                  style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}
                  onMouseOver={(e) => { e.target.style.background = "#F0FDFB"; }}
                  onMouseOut={(e) => { e.target.style.background = "#fff"; }}
                >
                  <span style={{fontSize: '16px'}}>+</span> Add Another Ingredient
                </button>
              </div>
              {materials.map((m, idx) => (
                <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
              ))}
            </div>

            {/* Action Buttons (Reverted with Hover Effects) */}
            <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
              <button 
                style={{ ...secondaryBtnStyle, marginRight: '12px' }}
                onMouseOver={(e) => {e.target.style.background = "#FEF3F2"; e.target.style.color = "#b42318"; e.target.style.borderColor = "#FDA29B";}}
                onMouseOut={(e) => {e.target.style.background = "#fff"; e.target.style.color = "#344054"; e.target.style.borderColor = "#D0D5DD";}}
              >
                Cancel
              </button>
              <button 
                style={primaryBtnStyle} 
                onClick={handleSubmit}
                onMouseOver={(e) => e.target.style.background = "#2e3da3"}
                onMouseOut={(e) => e.target.style.background = primaryTeal}
              >
                Save All Records <span style={{fontSize: '16px'}}>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRawMaterials;
