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
    { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" },
  ]);

  const [existingSuppliers, setExistingSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // read token set by login (AuthContext / api.setAuthToken)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // small helper to include Authorization header when available
  const fetchWithAuth = (url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
      // default JSON header for non-FormData requests
      headers["Content-Type"] = "application/json";
    }
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  };

  useEffect(() => {
    fetchSuppliers();
    fetchBranches();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth("/api/suppliers", { method: "GET" });
      if (res.status === 401) {
        showToast("Please login to access suppliers", "error");
        return;
      }
      const data = await res.json();
      setExistingSuppliers(data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetchWithAuth("/api/branches", { method: "GET" });
      if (res.status === 401) {
        // protected endpoint — user must be authenticated
        showToast("Please login to access branches", "error");
        return;
      }
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4500);
  };

  const handleSupplierChange = (field, value) => setSupplier({ ...supplier, [field]: value });

  const handleMaterialChange = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const addMaterialRow = () =>
    setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);

  const removeMaterialRow = (index) => {
    if (materials.length > 1) setMaterials(materials.filter((_, i) => i !== index));
    else showToast("At least one ingredient is required.", "error");
  };

  // helper to parse JSON safely and return status/message
  async function parseBody(res) {
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, body: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, body: text };
    }
  }

  const handleSubmit = async () => {
    try {
      if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
        throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
      }

      // choose branch id: prefer first available branch; if none, show a clear error
      const branchId = branches.length > 0 ? branches[0]["B_id"] : null;
      if (!branchId) {
        throw new Error("No branch available — please create a branch or login with an account that has branches.");
      }

      // 1) create or reuse supplier
      let finalSupId;
      const existing = existingSuppliers.find(
        (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
      );

      if (existing) finalSupId = existing.sup_id;
      else {
        const supRes = await fetchWithAuth("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(supplier),
        });
        const parsed = await parseBody(supRes);
        if (!parsed.ok) throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
        finalSupId = parsed.body.sup_id;
        fetchSuppliers();
      }

      // 2) create purchase order (pending)
      const poRes = await fetchWithAuth("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify({ sup_id: finalSupId, B_id: branchId, status: "pending" }),
      });
      const poParsed = await parseBody(poRes);
      if (!poParsed.ok) {
        // surface server message (e.g., Branch not found)
        throw new Error(poParsed.body?.message || `Failed to create Purchase Order (${poParsed.status})`);
      }
      const po_id = poParsed.body.po_id;

      // 3) sequentially create materials and purchase-items
      for (const item of materials) {
        if (!item.rm_name || !item.unit) continue;

        const normalizedName = item.rm_name.trim();
        if (!VALID_UNITS.includes(item.unit)) {
          throw new Error(`Unit "${item.unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
        }

        // make sure qty is a positive number before creating purchase-item
        const qty = Number(item.stock_qty);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Quantity for "${normalizedName}" must be a positive number`);
        }

        // try to create raw material (recover on duplicate 409)
        let rmData = null;
        const createRmRes = await fetchWithAuth("/api/raw-materials", {
          method: "POST",
          body: JSON.stringify({
            rm_name: normalizedName,
            unit: item.unit,
            stock_qty: qty,
            record_level: Number(item.record_level) || 0,
          }),
        });
        const createRmParsed = await parseBody(createRmRes);

        if (createRmParsed.ok) {
          rmData = createRmParsed.body;
        } else if (createRmParsed.status === 409) {
          // duplicate: lookup existing by name
          const listRes = await fetchWithAuth("/api/raw-materials", { method: "GET" });
          const listParsed = await parseBody(listRes);
          if (!listParsed.ok) throw new Error("Failed to recover existing raw material after duplicate error");
          const found = listParsed.body.find(
            (r) => r.rm_name && r.rm_name.trim().toLowerCase() === normalizedName.toLowerCase()
          );
          if (!found) throw new Error(`Duplicate error but existing material "${normalizedName}" not found`);
          rmData = found;
        } else {
          throw new Error(createRmParsed.body?.message || `Failed to create ${normalizedName} (${createRmParsed.status})`);
        }

        // create purchase item (link)
        const unitPrice = Number(item.unit_price) || 0;
        const piRes = await fetchWithAuth("/api/purchase-items", {
          method: "POST",
          body: JSON.stringify({
            po_id,
            rm_id: rmData.rm_id,
            qty,
            unit_price: unitPrice,
            price: qty * unitPrice,
          }),
        });
        const piParsed = await parseBody(piRes);
        if (!piParsed.ok) {
          throw new Error(piParsed.body?.message || `Failed to link ${normalizedName} to order (${piParsed.status})`);
        }
      }

      // 4) finalize: mark PO received (best-effort)
      const updatePoRes = await fetchWithAuth(`/api/purchase-orders/${po_id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "received" }),
      });
      const updatePoParsed = await parseBody(updatePoRes);
      if (!updatePoParsed.ok) console.warn("Failed to mark PO received:", updatePoParsed);

      showToast("Inventory and Purchase Order created successfully!", "success");

      // Reset
      setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
      setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
      fetchSuppliers();
    } catch (err) {
      console.error("Workflow Error:", err);
      showToast(err.message || "System error during sync", "error");
    }
  };

  // --- STYLING ---
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
        <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
      )}
      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
        <div style={{ padding: "10px 20px", minHeight: "calc(100vh - 70px)" }}>
          <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
              <div>
                <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
                <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px' }}>Onboard new suppliers and log incoming ingredients</p>
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
                <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
              </div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Supplier Name *</label>
                  <input style={inputStyle} placeholder="Enter supplier/business name" value={supplier.sup_name} onChange={(e) => handleSupplierChange("sup_name", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Number *</label>
                  <input style={inputStyle} placeholder="+94 7X XXX XXXX" value={supplier.sup_contact} onChange={(e) => handleSupplierChange("sup_contact", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input style={inputStyle} placeholder="supplier@example.com" value={supplier.sup_email} onChange={(e) => handleSupplierChange("sup_email", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} placeholder="Enter physical address (optional)" value={supplier.sup_address} onChange={(e) => handleSupplierChange("sup_address", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
                  <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
                </div>
                <button onClick={addMaterialRow} style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}>
                  <span style={{ fontSize: '16px' }}>+</span> Add Another Ingredient
                </button>
              </div>
              {materials.map((m, idx) => (
                <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
              ))}
            </div>

            <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
              <button style={{ ...secondaryBtnStyle, marginRight: '12px' }} onClick={() => { setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" }); setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]); }}>
                Cancel
              </button>
              <button style={primaryBtnStyle} onClick={handleSubmit} onMouseOver={(e) => e.target.style.background = "#2e3da3"} onMouseOut={(e) => e.target.style.background = primaryTeal}>
                Save All Records <span style={{ fontSize: '16px' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRawMaterials;






































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
//   const [branches, setBranches] = useState([]);
//   const [toast, setToast] = useState({ show: false, message: "", type: "success" });

//   useEffect(() => {
//     fetchSuppliers();
//     fetchBranches();
//   }, []);

//   const fetchSuppliers = async () => {
//     try {
//       const res = await fetch("/api/suppliers");
//       const data = await res.json();
//       setExistingSuppliers(data);
//     } catch (err) {
//       console.error("Error fetching suppliers:", err);
//     }
//   };

//   const fetchBranches = async () => {
//     try {
//       const res = await fetch("/api/branches");
//       const data = await res.json();
//       setBranches(data);
//     } catch (err) {
//       console.error("Error fetching branches:", err);
//     }
//   };

//   const showToast = (message, type = "success") => {
//     setToast({ show: true, message, type });
//     setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
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

//   // helper to parse JSON safely
//   async function parseBody(res) {
//     const text = await res.text();
//     try {
//       return { ok: res.ok, status: res.status, body: JSON.parse(text) };
//     } catch {
//       return { ok: res.ok, status: res.status, body: text };
//     }
//   }

//   const handleSubmit = async () => {
//     try {
//       if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
//         throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
//       }

//       // determine branch id: prefer first branch, fallback to 6
//       const branchId = branches.length > 0 ? branches[0]["B_id"] : 6;

//       // 1) create or reuse supplier
//       let finalSupId;
//       const existing = existingSuppliers.find(
//         (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
//       );

//       if (existing) {
//         finalSupId = existing.sup_id;
//       } else {
//         const supRes = await fetch("/api/suppliers", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(supplier),
//         });
//         const parsed = await parseBody(supRes);
//         if (!parsed.ok) throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
//         finalSupId = parsed.body.sup_id;
//         // refresh suppliers list
//         fetchSuppliers();
//       }

//       // 2) create purchase order as pending so we can add items
//       const poRes = await fetch("/api/purchase-orders", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           sup_id: finalSupId,
//           B_id: branchId,
//           status: "pending",
//         }),
//       });
//       const poParsed = await parseBody(poRes);
//       if (!poParsed.ok) throw new Error(poParsed.body?.message || `Failed to create Purchase Order (${poParsed.status})`);
//       const po_id = poParsed.body.po_id;

//       // 3) sequentially create materials and purchase-items; handle duplicates (409)
//       for (const item of materials) {
//         if (!item.rm_name || !item.unit) continue;

//         const normalizedName = item.rm_name.trim();
//         if (!VALID_UNITS.includes(item.unit)) {
//           throw new Error(`Unit "${item.unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
//         }

//         // try create raw material
//         let rmData = null;
//         const createRmRes = await fetch("/api/raw-materials", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             rm_name: normalizedName,
//             unit: item.unit,
//             stock_qty: parseFloat(item.stock_qty || 0),
//             record_level: parseFloat(item.record_level || 0),
//           }),
//         });
//         const createRmParsed = await parseBody(createRmRes);

//         if (createRmParsed.ok) {
//           rmData = createRmParsed.body;
//         } else if (createRmParsed.status === 409) {
//           // duplicate — fetch existing by name
//           const listRes = await fetch("/api/raw-materials");
//           const listParsed = await parseBody(listRes);
//           if (!listParsed.ok) throw new Error("Failed to recover existing raw material after duplicate error");
//           const found = listParsed.body.find(
//             (r) => r.rm_name && r.rm_name.trim().toLowerCase() === normalizedName.toLowerCase()
//           );
//           if (!found) throw new Error(`Duplicate error but existing material "${normalizedName}" not found`);
//           rmData = found;
//         } else {
//           throw new Error(createRmParsed.body?.message || `Failed to create ${normalizedName} (${createRmParsed.status})`);
//         }

//         // create purchase item (link)
//         const qty = parseFloat(item.stock_qty || 0);
//         const unitPrice = parseFloat(item.unit_price || 0);
//         const piRes = await fetch("/api/purchase-items", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             po_id,
//             rm_id: rmData.rm_id,
//             qty,
//             unit_price: unitPrice,
//             price: qty * unitPrice,
//           }),
//         });
//         const piParsed = await parseBody(piRes);
//         if (!piParsed.ok) {
//           // backend may return 409 if item already in order — surface that message
//           throw new Error(piParsed.body?.message || `Failed to link ${normalizedName} to order (${piParsed.status})`);
//         }
//       }

//       // 4) mark PO received (optional)
//       const updatePoRes = await fetch(`/api/purchase-orders/${po_id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: "received" }),
//       });
//       const updatePoParsed = await parseBody(updatePoRes);
//       if (!updatePoParsed.ok) {
//         // not fatal — log and continue
//         console.warn("Failed to mark PO received:", updatePoParsed);
//       }

//       showToast("Inventory and Purchase Order created successfully!", "success");

//       // Reset form
//       setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
//       setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
//       fetchSuppliers();
//     } catch (err) {
//       console.error("Workflow Error:", err);
//       showToast(err.message || "System error during sync", "error");
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
//         <div style={{ padding: "10px 20px", minHeight: "calc(100vh - 70px)" }}>
//           <div style={containerStyle}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
//               <div>
//                 <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
//                 <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px' }}>Onboard new suppliers and log incoming ingredients</p>
//               </div>
//             </div>

//             <div style={sectionStyle}>
//               <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
//                 <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
//                 <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
//               </div>
//               <div style={gridStyle}>
//                 <div>
//                   <label style={labelStyle}>Supplier Name *</label>
//                   <input style={inputStyle} placeholder="Enter supplier/business name" value={supplier.sup_name} onChange={(e) => handleSupplierChange("sup_name", e.target.value)} />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Contact Number *</label>
//                   <input style={inputStyle} placeholder="+94 7X XXX XXXX" value={supplier.sup_contact} onChange={(e) => handleSupplierChange("sup_contact", e.target.value)} />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Email Address *</label>
//                   <input style={inputStyle} placeholder="supplier@example.com" value={supplier.sup_email} onChange={(e) => handleSupplierChange("sup_email", e.target.value)} />
//                 </div>
//                 <div>
//                   <label style={labelStyle}>Address</label>
//                   <input style={inputStyle} placeholder="Enter physical address (optional)" value={supplier.sup_address} onChange={(e) => handleSupplierChange("sup_address", e.target.value)} />
//                 </div>
//               </div>
//             </div>

//             <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                   <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
//                   <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
//                 </div>
//                 <button onClick={addMaterialRow} style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}>
//                   <span style={{ fontSize: '16px' }}>+</span> Add Another Ingredient
//                 </button>
//               </div>
//               {materials.map((m, idx) => (
//                 <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
//               ))}
//             </div>

//             <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
//               <button style={{ ...secondaryBtnStyle, marginRight: '12px' }} onClick={() => { setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" }); setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]); }}>
//                 Cancel
//               </button>
//               <button style={primaryBtnStyle} onClick={handleSubmit} onMouseOver={(e) => e.target.style.background = "#2e3da3"} onMouseOut={(e) => e.target.style.background = primaryTeal}>
//                 Save All Records <span style={{ fontSize: '16px' }}>→</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddRawMaterials;




















































































// // // // components/branch-admin/AddRawMaterials.jsx
// // // import React, { useState, useEffect } from "react";
// // // import RawIngredient from "../../components/branch-admin/RawIngredient";
// // // import Sidebar from "../../components/branch-admin/Sidebar";
// // // import Header from "../../components/branch-admin/Header";
// // // import ToastMessage from "../../components/branch-admin/ToastMessage"; 

// // // const AddRawMaterials = () => {
// // //   const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
// // //   const primaryTeal = "#3A4DBF";
// // //   const primaryBlue = "#001F3F";
// // //   const bgGrey = "#F9FAFB";

// // //   const [supplier, setSupplier] = useState({
// // //     sup_name: "",
// // //     sup_email: "",
// // //     sup_contact: "",
// // //     sup_address: "",
// // //   });

// // //   const [materials, setMaterials] = useState([
// // //     { rm_name: "", unit: "", stock_qty: "", record_level: "" },
// // //   ]);

// // //   const [existingSuppliers, setExistingSuppliers] = useState([]);
// // //   const [toast, setToast] = useState({ show: false, message: "", type: "success" });

// // //   // --- LOGIC: Load existing suppliers ---
// // //   useEffect(() => {
// // //     fetch("/api/suppliers")
// // //       .then(res => res.json())
// // //       .then(data => setExistingSuppliers(data))
// // //       .catch(err => console.error("Error fetching suppliers:", err));
// // //   }, []);

// // //   const showToast = (message, type = "success") => {
// // //     setToast({ show: true, message, type });
// // //   };

// // //   const handleSupplierChange = (field, value) => {
// // //     setSupplier({ ...supplier, [field]: value });
// // //   };

// // //   const handleMaterialChange = (index, field, value) => {
// // //     const updated = [...materials];
// // //     updated[index][field] = value;
// // //     setMaterials(updated);
// // //   };

// // //   const addMaterialRow = () => {
// // //     setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "" }]);
// // //   };

// // //   const removeMaterialRow = (index) => {
// // //     if (materials.length > 1) {
// // //       setMaterials(materials.filter((_, i) => i !== index));
// // //     } else {
// // //       showToast("At least one ingredient is required.", "error");
// // //     }
// // //   };

// // //   // --- LOGIC: Handle Submit with Duplicate Check ---
// // //   const handleSubmit = async () => {
// // //     try {
// // //       if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
// // //         throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
// // //       }

// // //       let finalSupId;
// // //       const existing = existingSuppliers.find(
// // //         (s) => s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
// // //       );

// // //       if (existing) {
// // //         finalSupId = existing.sup_id;
// // //       } else {
// // //         const supRes = await fetch("/api/suppliers", {
// // //           method: "POST",
// // //           headers: { "Content-Type": "application/json" },
// // //           body: JSON.stringify(supplier),
// // //         });
// // //         const supplierData = await supRes.json();
// // //         if (!supRes.ok) throw new Error(supplierData.message || "Supplier creation failed");
// // //         finalSupId = supplierData.sup_id;
// // //       }

// // //       for (const item of materials) {
// // //         if (!item.rm_name || !item.unit) continue;
        
// // //         const matRes = await fetch("/api/raw-materials", {
// // //           method: "POST",
// // //           headers: { "Content-Type": "application/json" },
// // //           body: JSON.stringify({ ...item, sup_id: finalSupId }),
// // //         });
// // //         if (!matRes.ok) {
// // //           const matData = await matRes.json();
// // //           throw new Error(matData.message || `Failed to add ${item.rm_name}`);
// // //         }
// // //       }

// // //       showToast(existing ? "New materials added to existing supplier!" : "New supplier and materials saved!", "success");
      
// // //       setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
// // //       setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "" }]);
      
// // //       const updatedSups = await fetch("/api/suppliers").then(r => r.json());
// // //       setExistingSuppliers(updatedSups);

// // //     } catch (err) {
// // //       showToast(err.message, "error");
// // //     }
// // //   };

// // //   // --- STYLING: Reverting to the detailed layout ---
// // //   const containerStyle = { padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
// // //   const sectionStyle = { marginBottom: "30px", padding: "28px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
// // //   const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" };
// // //   const inputStyle = { width: "100%", padding: "12px 16px", marginTop: "8px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px", boxSizing: "border-box", transition: "border-color 0.2s ease" };
// // //   const labelStyle = { display: "block", fontSize: "14px", fontWeight: "500", color: "#344054" };

// // //   const secondaryBtnStyle = { background: "#fff", color: "#344054", padding: "12px 20px", border: "1px solid #D0D5DD", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease" };
// // //   const primaryBtnStyle = { background: primaryTeal, color: "white", padding: "12px 28px", border: `1px solid ${primaryTeal}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px", float: "right" };

// // //   return (
// // //     <div style={{ display: "flex", background: bgGrey, minHeight: "100vh" }}>
// // //       <Sidebar />
// // //       {toast.show && (
// // //         <ToastMessage
// // //           message={toast.message}
// // //           type={toast.type}
// // //           onClose={() => setToast({ ...toast, show: false })}
// // //         />
// // //       )}
// // //       <div style={{ flex: 1, marginLeft: "240px" }}>
// // //         <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
// // //         <div style={{ padding: "10px 20px" , minHeight: "calc(100vh - 70px)" }}>
// // //           <div style={containerStyle}>
            
// // //             {/* Page Title Section */}
// // //             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
// // //                 <div>
// // //                     <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
// // //                     <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px'}}>Onboard new suppliers and log incoming ingredients</p>
// // //                 </div>
// // //             </div>

// // //             {/* Section 1: Supplier Details (Reverted to Icons & Specific Placeholders) */}
// // //             <div style={sectionStyle}>
// // //               <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
// // //                   <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
// // //                   <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
// // //               </div>
// // //               <div style={gridStyle}>
// // //                 <div>
// // //                   <label style={labelStyle}>Supplier Name *</label>
// // //                   <input
// // //                     style={inputStyle}
// // //                     placeholder="Enter supplier/business name"
// // //                     value={supplier.sup_name}
// // //                     onChange={(e) => handleSupplierChange("sup_name", e.target.value)}
// // //                     onFocus={(e) => e.target.style.borderColor = primaryTeal}
// // //                     onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
// // //                   />
// // //                 </div>
// // //                 <div>
// // //                   <label style={labelStyle}>Contact Number *</label>
// // //                   <input
// // //                     style={inputStyle}
// // //                     placeholder="+94 7X XXX XXXX"
// // //                     value={supplier.sup_contact}
// // //                     onChange={(e) => handleSupplierChange("sup_contact", e.target.value)}
// // //                     onFocus={(e) => e.target.style.borderColor = primaryTeal}
// // //                     onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
// // //                   />
// // //                 </div>
// // //                 <div>
// // //                   <label style={labelStyle}>Email Address *</label>
// // //                   <input
// // //                     style={inputStyle}
// // //                     placeholder="supplier@example.com"
// // //                     value={supplier.sup_email}
// // //                     onChange={(e) => handleSupplierChange("sup_email", e.target.value)}
// // //                     onFocus={(e) => e.target.style.borderColor = primaryTeal}
// // //                     onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
// // //                   />
// // //                 </div>
// // //                 <div>
// // //                   <label style={labelStyle}>Address</label>
// // //                   <input
// // //                     style={inputStyle}
// // //                     placeholder="Enter physical address (optional)"
// // //                     value={supplier.sup_address}
// // //                     onChange={(e) => handleSupplierChange("sup_address", e.target.value)}
// // //                     onFocus={(e) => e.target.style.borderColor = primaryTeal}
// // //                     onBlur={(e) => e.target.style.borderColor = "#D0D5DD"}
// // //                   />
// // //                 </div>
// // //               </div>
// // //             </div>

// // //             {/* Section 2: Raw Ingredients (Reverted to Transparent Borderless Container) */}
// // //             <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
// // //               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
// // //                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// // //                     <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
// // //                     <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
// // //                 </div>
// // //                 <button 
// // //                   onClick={addMaterialRow} 
// // //                   style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}
// // //                   onMouseOver={(e) => { e.target.style.background = "#F0FDFB"; }}
// // //                   onMouseOut={(e) => { e.target.style.background = "#fff"; }}
// // //                 >
// // //                   <span style={{fontSize: '16px'}}>+</span> Add Another Ingredient
// // //                 </button>
// // //               </div>
// // //               {materials.map((m, idx) => (
// // //                 <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
// // //               ))}
// // //             </div>

// // //             {/* Action Buttons (Reverted with Hover Effects) */}
// // //             <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
// // //               <button 
// // //                 style={{ ...secondaryBtnStyle, marginRight: '12px' }}
// // //                 onMouseOver={(e) => {e.target.style.background = "#FEF3F2"; e.target.style.color = "#b42318"; e.target.style.borderColor = "#FDA29B";}}
// // //                 onMouseOut={(e) => {e.target.style.background = "#fff"; e.target.style.color = "#344054"; e.target.style.borderColor = "#D0D5DD";}}
// // //               >
// // //                 Cancel
// // //               </button>
// // //               <button 
// // //                 style={primaryBtnStyle} 
// // //                 onClick={handleSubmit}
// // //                 onMouseOver={(e) => e.target.style.background = "#2e3da3"}
// // //                 onMouseOut={(e) => e.target.style.background = primaryTeal}
// // //               >
// // //                 Save All Records <span style={{fontSize: '16px'}}>→</span>
// // //               </button>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default AddRawMaterials;
