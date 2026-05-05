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

  const [isNewSupplier, setIsNewSupplier] = useState(false);
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
  const [defaultBranchInput, setDefaultBranchInput] = useState(localStorage.getItem("defaultBranchId") || "");

  // --- network helpers ---
  const fetchWithAuth = (url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers, credentials: "include" });
  };

  const extractArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.suppliers)) return data.suppliers;
    if (Array.isArray(data.branches)) return data.branches;
    return [];
  };

  async function parseBody(res) {
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, body: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, body: text };
    }
  }

  // --- Client-side supplier validator/normalizer ---
  const clientValidateSupplier = (s) => {
    const name = (s.sup_name || "").trim();
    if (!name || name.length < 2 || name.length > 120) {
      throw new Error("Supplier name must be 2–120 characters");
    }
    if (!/^[\w\s\-().&/,]+$/.test(name)) {
      throw new Error("Supplier name contains invalid characters");
    }

    const email = (s.sup_email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
      throw new Error("Invalid supplier email");
    }

    const contact = String(s.sup_contact || "").trim();
    if (!/^[0-9+\-\s()]{7,30}$/.test(contact)) {
      throw new Error("Contact must be 7–30 chars (digits, + - () and spaces only)");
    }

    const address = s.sup_address !== undefined ? String(s.sup_address).trim() : null;
    if (address && address.length > 100) {
      throw new Error("Address cannot exceed 100 characters");
    }

    return {
      sup_name: name,
      sup_email: email.toLowerCase(),
      sup_contact: contact,
      sup_address: address,
    };
  };

  // --- lifecycle: load suppliers & branches ---
  useEffect(() => {
    fetchSuppliers();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth("/api/suppliers", { method: "GET" });
      if (res.status === 401) {
        showToast("Session expired — please login", "error");
        setExistingSuppliers([]);
        return;
      }
      if (res.status === 403) {
        showToast("You don't have permission to view suppliers", "error");
        setExistingSuppliers([]);
        return;
      }
      if (!res.ok) {
        showToast(`Failed to load suppliers (${res.status})`, "error");
        setExistingSuppliers([]);
        return;
      }
      const data = await res.json().catch(() => ([]));
      setExistingSuppliers(extractArray(data));
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      setExistingSuppliers([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetchWithAuth("/api/branches", { method: "GET" });

      if (res.status === 401) {
        showToast("Please login to access branches", "error");
        setBranches([]);
        return;
      }

      if (res.status === 403) {
        // server forbids listing branches for this role — use local fallback if available
        showToast("Branches listing is not permitted for this account. Use saved branch id.", "error");
        setBranches([]);
      } else if (!res.ok) {
        showToast(`Failed to load branches (${res.status})`, "error");
        setBranches([]);
      } else {
        const data = await res.json().catch(() => ([]));
        const list = extractArray(data);
        if (list.length > 0) {
          setBranches(list);
          return;
        }
        setBranches([]);
      }

      // client-side fallback: localStorage.defaultBranchId or Vite env
      const fallbackId = Number(localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0);
      if (fallbackId && !Number.isNaN(fallbackId)) {
        setBranches([{ B_id: fallbackId, B_name: `Local fallback (${fallbackId})` }]);
        showToast("Using saved branch id from local settings.", "info");
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setBranches([]);
      const fallbackId = Number(localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0);
      if (fallbackId && !Number.isNaN(fallbackId)) {
        setBranches([{ B_id: fallbackId, B_name: `Local fallback (${fallbackId})` }]);
      }
    }
  };

  // --- UI helpers ---
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4500);
  };

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

  const saveDefaultBranchId = () => {
    const id = Number(defaultBranchInput);
    if (!id || Number.isNaN(id) || id <= 0) {
      showToast("Please enter a valid positive branch id", "error");
      return;
    }
    localStorage.setItem("defaultBranchId", String(id));
    setBranches([{ B_id: id, B_name: `Local fallback (${id})` }]);
    showToast("Saved default branch id locally. You can now create POs.", "success");
  };

  // --- main workflow: create supplier -> create PO -> create raw materials -> link purchase-items ---
  const handleSubmit = async () => {
    try {
      if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
        throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
      }

      // choose branch id: prefer first available branch; fall back to saved default (localStorage or VITE)
      const branchCandidate = Array.isArray(branches) && branches.length > 0 ? branches[0] : null;
      const fallbackId = Number(localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0);
      const branchId = branchCandidate?.B_id ?? branchCandidate?.b_id ?? branchCandidate?.id ?? (fallbackId || null);

      if (!branchId) {
        showToast("No branch available — please save a default branch id in settings or ask an Admin to provide one.", "error");
        return;
      }

      // 1) create or reuse supplier
      let finalSupId;
      const existing = (Array.isArray(existingSuppliers) ? existingSuppliers : []).find(
        (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
      );

      if (existing) finalSupId = existing.sup_id;
      else {
        // validate + normalize client-side before sending to server
        let validatedSupplier;
        try {
          validatedSupplier = clientValidateSupplier(supplier);
        } catch (e) {
          showToast(e.message, "error");
          return;
        }

        const supRes = await fetchWithAuth("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(validatedSupplier),
        });
        const parsed = await parseBody(supRes);
        if (!parsed.ok) {
          console.error("Supplier creation failed response:", parsed);
          throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
        }
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
          const listArray = Array.isArray(listParsed.body) ? listParsed.body : extractArray(listParsed.body);
          const found = listArray.find(
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

      // Reset form
      setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
      setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
      fetchSuppliers();
    } catch (err) {
      console.error("Workflow Error:", err);
      showToast(err.message || "System error during sync", "error");
    }
  };

  // --- STYLES ---
  const containerStyle = { padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
  const sectionStyle = { marginBottom: "30px", padding: "28px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
  const inputStyle = { width: "100%", padding: "12px 16px", marginTop: "8px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: "14px", fontWeight: "500", color: "#344054" };
  const primaryBtnStyle = { background: primaryTeal, color: "white", padding: "12px 28px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" };

  return (
    <div style={{ display: "flex", background: bgGrey, minHeight: "100vh" }}>
      <Sidebar />
      {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
        <div style={containerStyle}>
          <h2 style={{ color: "#101828", fontWeight: '700', fontSize: '24px', marginBottom: '20px' }}>Add Raw Materials</h2>

          {/* Fallback branch UI shown when no branches are available */}
          {(!branches || branches.length === 0) && (
            <div style={{ ...sectionStyle }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: 8 }}>
                <span style={{ fontSize: 18, color: primaryTeal }}>⚠️</span>
                <h4 style={{ margin: 0, color: primaryBlue, fontSize: 16, fontWeight: 600 }}>No branches available</h4>
              </div>
              <p style={{ marginTop: 8, color: "#475569" }}>
                The server does not allow listing branches for your account. Enter your branch's numeric ID below to continue.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <input
                  style={{ ...inputStyle, maxWidth: 240 }}
                  placeholder="Your branch id (e.g. 6)"
                  value={defaultBranchInput}
                  onChange={(e) => setDefaultBranchInput(e.target.value)}
                />
                <button style={{ ...primaryBtnStyle, background: "#fff", color: primaryTeal, border: `1px solid ${primaryTeal}` }} onClick={saveDefaultBranchId}>
                  Save branch id
                </button>
              </div>
            </div>
          )}

          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, color: primaryTeal }}>📦</span>
                <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>1. Incoming Raw Ingredients</h3>
              </div>
              <button onClick={addMaterialRow} style={{ background: 'none', border: `1px solid ${primaryTeal}`, padding: '8px 16px', borderRadius: '8px', color: primaryTeal, cursor: 'pointer', fontWeight: '600' }}>
                + Add Another Ingredient
              </button>
            </div>
            {materials.map((m, idx) => (
              <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
            ))}
          </div>

          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, color: primaryTeal }}>👤</span>
                <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>2. Supplier Information</h3>
              </div>
              {!isNewSupplier && (
                <button
                  onClick={() => { setIsNewSupplier(true); setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" }); }}
                  style={{ background: primaryTeal, color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: 14 }}
                >
                  + Add New Supplier
                </button>
              )}
            </div>

            {!isNewSupplier ? (
              <div>
                <label style={labelStyle}>Select Existing Supplier</label>
                <select
                  style={inputStyle}
                  onChange={(e) => {
                    const selected = existingSuppliers.find(s => s.sup_id === parseInt(e.target.value));
                    if (selected) setSupplier(selected);
                  }}
                >
                  <option value="">-- Choose a Supplier --</option>
                  {existingSuppliers.map(sup => (
                    <option key={sup.sup_id} value={sup.sup_id}>{sup.sup_name} ({sup.sup_email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsNewSupplier(false)}
                  style={{ position: 'absolute', top: '-40px', right: 0, color: primaryTeal, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                >
                  Back to existing suppliers
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <label style={labelStyle}>Supplier Name *</label>
                    <input style={inputStyle} value={supplier.sup_name} onChange={(e) => setSupplier({...supplier, sup_name: e.target.value})} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Number *</label>
                    <input style={inputStyle} value={supplier.sup_contact} onChange={(e) => setSupplier({...supplier, sup_contact: e.target.value})} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address *</label>
                    <input style={inputStyle} value={supplier.sup_email} onChange={(e) => setSupplier({...supplier, sup_email: e.target.value})} />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input style={inputStyle} value={supplier.sup_address} onChange={(e) => setSupplier({...supplier, sup_address: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <button style={primaryBtnStyle} onClick={handleSubmit}>
              Save All Records →
            </button>
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

//   // UI state for saving a local fallback branch id
//   const [defaultBranchInput, setDefaultBranchInput] = useState(
//     localStorage.getItem("defaultBranchId") || ""
//   );

//   // helper: always read token fresh (supports login after mount)
//   const fetchWithAuth = (url, opts = {}) => {
//     const headers = { ...(opts.headers || {}) };
//     if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
//       headers["Content-Type"] = "application/json";
//     }
//     const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//     if (token) headers["Authorization"] = `Bearer ${token}`;
//     // include credentials in case backend uses cookies
//     return fetch(url, { ...opts, headers, credentials: "include" });
//   };

//   const extractArray = (data) => {
//     if (!data) return [];
//     if (Array.isArray(data)) return data;
//     if (Array.isArray(data.data)) return data.data;
//     if (Array.isArray(data.suppliers)) return data.suppliers;
//     if (Array.isArray(data.branches)) return data.branches;
//     return [];
//   };

//   useEffect(() => {
//     fetchSuppliers();
//     fetchBranches();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const fetchSuppliers = async () => {
//     try {
//       const res = await fetchWithAuth("/api/suppliers", { method: "GET" });
//       if (res.status === 401) {
//         showToast("Session expired — please login", "error");
//         setExistingSuppliers([]);
//         return;
//       }
//       if (res.status === 403) {
//         showToast("You don't have permission to view suppliers", "error");
//         setExistingSuppliers([]);
//         return;
//       }
//       if (!res.ok) {
//         showToast(`Failed to load suppliers (${res.status})`, "error");
//         setExistingSuppliers([]);
//         return;
//       }
//       const data = await res.json().catch(() => ([]));
//       setExistingSuppliers(extractArray(data));
//     } catch (err) {
//       console.error("Error fetching suppliers:", err);
//       setExistingSuppliers([]);
//     }
//   };

//   const fetchBranches = async () => {
//     try {
//       const res = await fetchWithAuth("/api/branches", { method: "GET" });
//       if (res.status === 401) {
//         showToast("Please login to access branches", "error");
//         setBranches([]);
//         return;
//       }
//       if (res.status === 403) {
//         // Backend forbids listing branches for this role.
//         showToast("Branches listing is not permitted for this account. Using local fallback if available.", "error");
//         setBranches([]);
//         // try client fallback below
//       } else if (!res.ok) {
//         showToast(`Failed to load branches (${res.status})`, "error");
//         setBranches([]);
//       } else {
//         const data = await res.json().catch(() => ([]));
//         const list = extractArray(data);
//         if (list.length > 0) {
//           setBranches(list);
//           return;
//         }
//         setBranches([]);
//       }

//       // If we reach here branches array is empty — attempt local fallback
//       const fallbackId = Number(
//         localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0
//       );
//       if (fallbackId && !Number.isNaN(fallbackId)) {
//         setBranches([{ B_id: fallbackId, B_name: `Local fallback (${fallbackId})` }]);
//         showToast("Using saved branch id from local settings.", "info");
//       }
//     } catch (err) {
//       console.error("Error fetching branches:", err);
//       setBranches([]);
//       const fallbackId = Number(
//         localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0
//       );
//       if (fallbackId && !Number.isNaN(fallbackId)) {
//         setBranches([{ B_id: fallbackId, B_name: `Local fallback (${fallbackId})` }]);
//       }
//     }
//   };

//   const showToast = (message, type = "success") => {
//     setToast({ show: true, message, type });
//     setTimeout(() => setToast((t) => ({ ...t, show: false })), 4500);
//   };

//   const handleSupplierChange = (field, value) => setSupplier({ ...supplier, [field]: value });

//   const handleMaterialChange = (index, field, value) => {
//     const updated = [...materials];
//     updated[index][field] = value;
//     setMaterials(updated);
//   };

//   const addMaterialRow = () =>
//     setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);

//   const removeMaterialRow = (index) => {
//     if (materials.length > 1) setMaterials(materials.filter((_, i) => i !== index));
//     else showToast("At least one ingredient is required.", "error");
//   };

//   // helper to parse JSON safely and return status/message
//   async function parseBody(res) {
//     const text = await res.text();
//     try {
//       return { ok: res.ok, status: res.status, body: JSON.parse(text) };
//     } catch {
//       return { ok: res.ok, status: res.status, body: text };
//     }
//   }

//   // Save the local fallback branch id (Branch Admin can set this once)
//   const saveDefaultBranchId = () => {
//     const id = Number(defaultBranchInput);
//     if (!id || Number.isNaN(id) || id <= 0) {
//       showToast("Please enter a valid positive branch id", "error");
//       return;
//     }
//     localStorage.setItem("defaultBranchId", String(id));
//     setBranches([{ B_id: id, B_name: `Local fallback (${id})` }]);
//     showToast("Saved default branch id locally. You can now create POs.", "success");
//   };

//   const handleSubmit = async () => {
//     try {
//       if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
//         throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
//       }

//       // choose branch id: prefer first available branch; fall back to saved default
//       const branchCandidate = Array.isArray(branches) && branches.length > 0 ? branches[0] : null;
//       const fallbackId = Number(localStorage.getItem("defaultBranchId") || import.meta.env.VITE_DEFAULT_BRANCH_ID || 0);
//       const branchId =
//         branchCandidate?.B_id ?? branchCandidate?.b_id ?? branchCandidate?.id ?? (fallbackId || null);

//       if (!branchId) {
//         showToast("No branch available — please save a default branch id in settings or ask an Admin to provide one.", "error");
//         return;
//       }

//       // 1) create or reuse supplier
//       let finalSupId;
//       const existing = (Array.isArray(existingSuppliers) ? existingSuppliers : []).find(
//         (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
//       );

//       if (existing) finalSupId = existing.sup_id;
//       else {
//         const supRes = await fetchWithAuth("/api/suppliers", {
//           method: "POST",
//           body: JSON.stringify(supplier),
//         });
//         const parsed = await parseBody(supRes);
//         if (!parsed.ok) throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
//         finalSupId = parsed.body.sup_id;
//         fetchSuppliers();
//       }

//       // 2) create purchase order (pending)
//       const poRes = await fetchWithAuth("/api/purchase-orders", {
//         method: "POST",
//         body: JSON.stringify({ sup_id: finalSupId, B_id: branchId, status: "pending" }),
//       });
//       const poParsed = await parseBody(poRes);
//       if (!poParsed.ok) {
//         throw new Error(poParsed.body?.message || `Failed to create Purchase Order (${poParsed.status})`);
//       }
//       const po_id = poParsed.body.po_id;

//       // 3) sequentially create materials and purchase-items
//       for (const item of materials) {
//         if (!item.rm_name || !item.unit) continue;

//         const normalizedName = item.rm_name.trim();
//         if (!VALID_UNITS.includes(item.unit)) {
//           throw new Error(`Unit "${item.unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
//         }

//         // make sure qty is a positive number before creating purchase-item
//         const qty = Number(item.stock_qty);
//         if (isNaN(qty) || qty <= 0) {
//           throw new Error(`Quantity for "${normalizedName}" must be a positive number`);
//         }

//         // try to create raw material (recover on duplicate 409)
//         let rmData = null;
//         const createRmRes = await fetchWithAuth("/api/raw-materials", {
//           method: "POST",
//           body: JSON.stringify({
//             rm_name: normalizedName,
//             unit: item.unit,
//             stock_qty: qty,
//             record_level: Number(item.record_level) || 0,
//           }),
//         });
//         const createRmParsed = await parseBody(createRmRes);

//         if (createRmParsed.ok) {
//           rmData = createRmParsed.body;
//         } else if (createRmParsed.status === 409) {
//           // duplicate: lookup existing by name
//           const listRes = await fetchWithAuth("/api/raw-materials", { method: "GET" });
//           const listParsed = await parseBody(listRes);
//           if (!listParsed.ok) throw new Error("Failed to recover existing raw material after duplicate error");
//           const listArray = Array.isArray(listParsed.body) ? listParsed.body : extractArray(listParsed.body);
//           const found = listArray.find(
//             (r) => r.rm_name && r.rm_name.trim().toLowerCase() === normalizedName.toLowerCase()
//           );
//           if (!found) throw new Error(`Duplicate error but existing material "${normalizedName}" not found`);
//           rmData = found;
//         } else {
//           throw new Error(createRmParsed.body?.message || `Failed to create ${normalizedName} (${createRmParsed.status})`);
//         }

//         // create purchase item (link)
//         const unitPrice = Number(item.unit_price) || 0;
//         const piRes = await fetchWithAuth("/api/purchase-items", {
//           method: "POST",
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
//           throw new Error(piParsed.body?.message || `Failed to link ${normalizedName} to order (${piParsed.status})`);
//         }
//       }

//       // 4) finalize: mark PO received (best-effort)
//       const updatePoRes = await fetchWithAuth(`/api/purchase-orders/${po_id}`, {
//         method: "PUT",
//         body: JSON.stringify({ status: "received" }),
//       });
//       const updatePoParsed = await parseBody(updatePoRes);
//       if (!updatePoParsed.ok) console.warn("Failed to mark PO received:", updatePoParsed);

//       showToast("Inventory and Purchase Order created successfully!", "success");

//       // Reset
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
//         <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
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

//             {/* Fallback branch UI: shown when branches list is empty */}
//             {(!branches || branches.length === 0) && (
//               <div style={{ ...sectionStyle }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
//                   <span style={{ fontSize: "18px", color: primaryTeal }}>⚠️</span>
//                   <h4 style={{ margin: 0, color: primaryBlue, fontSize: '16px', fontWeight: '600' }}>No branches available</h4>
//                 </div>
//                 <p style={{ marginTop: 8, color: "#475569" }}>
//                   The server does not allow listing branches for your account. Enter your branch's numeric ID below to continue.
//                 </p>
//                 <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
//                   <input
//                     style={{ ...inputStyle, maxWidth: 240 }}
//                     placeholder="Your branch id (e.g. 6)"
//                     value={defaultBranchInput}
//                     onChange={(e) => setDefaultBranchInput(e.target.value)}
//                   />
//                   <button style={secondaryBtnStyle} onClick={saveDefaultBranchId}>Save branch id</button>
//                 </div>
//               </div>
//             )}

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


















































// // import React, { useState, useEffect } from "react";
// // import RawIngredient from "../../components/branch-admin/RawIngredient";
// // import Sidebar from "../../components/branch-admin/Sidebar";
// // import Header from "../../components/branch-admin/Header";
// // import ToastMessage from "../../components/branch-admin/ToastMessage";

// // const AddRawMaterials = () => {
// //   const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
// //   const primaryTeal = "#3A4DBF";
// //   const primaryBlue = "#001F3F";
// //   const bgGrey = "#F9FAFB";

// //   const [supplier, setSupplier] = useState({
// //     sup_name: "",
// //     sup_email: "",
// //     sup_contact: "",
// //     sup_address: "",
// //   });

// //   const [materials, setMaterials] = useState([
// //     { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" },
// //   ]);

// //   const [existingSuppliers, setExistingSuppliers] = useState([]);
// //   const [branches, setBranches] = useState([]);
// //   const [toast, setToast] = useState({ show: false, message: "", type: "success" });

// //   // read token set by login (AuthContext / api.setAuthToken)
// //   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

// //   // small helper to include Authorization header when available
// //   const fetchWithAuth = (url, opts = {}) => {
// //     const headers = { ...(opts.headers || {}) };
// //     if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
// //       // default JSON header for non-FormData requests
// //       headers["Content-Type"] = "application/json";
// //     }
// //     if (token) headers["Authorization"] = `Bearer ${token}`;
// //     return fetch(url, { ...opts, headers });
// //   };

// //   useEffect(() => {
// //     fetchSuppliers();
// //     fetchBranches();
// //   }, []);

// //   const fetchSuppliers = async () => {
// //     try {
// //       const res = await fetchWithAuth("/api/suppliers", { method: "GET" });
// //       if (res.status === 401) {
// //         showToast("Please login to access suppliers", "error");
// //         return;
// //       }
// //       const data = await res.json();
// //       setExistingSuppliers(data);
// //     } catch (err) {
// //       console.error("Error fetching suppliers:", err);
// //     }
// //   };

// //   const fetchBranches = async () => {
// //     try {
// //       const res = await fetchWithAuth("/api/branches", { method: "GET" });
// //       if (res.status === 401) {
// //         // protected endpoint — user must be authenticated
// //         showToast("Please login to access branches", "error");
// //         return;
// //       }
// //       const data = await res.json();
// //       setBranches(data);
// //     } catch (err) {
// //       console.error("Error fetching branches:", err);
// //     }
// //   };

// //   const showToast = (message, type = "success") => {
// //     setToast({ show: true, message, type });
// //     setTimeout(() => setToast((t) => ({ ...t, show: false })), 4500);
// //   };

// //   const handleSupplierChange = (field, value) => setSupplier({ ...supplier, [field]: value });

// //   const handleMaterialChange = (index, field, value) => {
// //     const updated = [...materials];
// //     updated[index][field] = value;
// //     setMaterials(updated);
// //   };

// //   const addMaterialRow = () =>
// //     setMaterials([...materials, { rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);

// //   const removeMaterialRow = (index) => {
// //     if (materials.length > 1) setMaterials(materials.filter((_, i) => i !== index));
// //     else showToast("At least one ingredient is required.", "error");
// //   };

// //   // helper to parse JSON safely and return status/message
// //   async function parseBody(res) {
// //     const text = await res.text();
// //     try {
// //       return { ok: res.ok, status: res.status, body: JSON.parse(text) };
// //     } catch {
// //       return { ok: res.ok, status: res.status, body: text };
// //     }
// //   }

// //   const handleSubmit = async () => {
// //     try {
// //       if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
// //         throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
// //       }

// //       // choose branch id: prefer first available branch; if none, show a clear error
// //       const branchId = branches.length > 0 ? branches[0]["B_id"] : null;
// //       if (!branchId) {
// //         throw new Error("No branch available — please create a branch or login with an account that has branches.");
// //       }

// //       // 1) create or reuse supplier
// //       let finalSupId;
// //       const existing = existingSuppliers.find(
// //         (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
// //       );

// //       if (existing) finalSupId = existing.sup_id;
// //       else {
// //         const supRes = await fetchWithAuth("/api/suppliers", {
// //           method: "POST",
// //           body: JSON.stringify(supplier),
// //         });
// //         const parsed = await parseBody(supRes);
// //         if (!parsed.ok) throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
// //         finalSupId = parsed.body.sup_id;
// //         fetchSuppliers();
// //       }

// //       // 2) create purchase order (pending)
// //       const poRes = await fetchWithAuth("/api/purchase-orders", {
// //         method: "POST",
// //         body: JSON.stringify({ sup_id: finalSupId, B_id: branchId, status: "pending" }),
// //       });
// //       const poParsed = await parseBody(poRes);
// //       if (!poParsed.ok) {
// //         // surface server message (e.g., Branch not found)
// //         throw new Error(poParsed.body?.message || `Failed to create Purchase Order (${poParsed.status})`);
// //       }
// //       const po_id = poParsed.body.po_id;

// //       // 3) sequentially create materials and purchase-items
// //       for (const item of materials) {
// //         if (!item.rm_name || !item.unit) continue;

// //         const normalizedName = item.rm_name.trim();
// //         if (!VALID_UNITS.includes(item.unit)) {
// //           throw new Error(`Unit "${item.unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
// //         }

// //         // make sure qty is a positive number before creating purchase-item
// //         const qty = Number(item.stock_qty);
// //         if (isNaN(qty) || qty <= 0) {
// //           throw new Error(`Quantity for "${normalizedName}" must be a positive number`);
// //         }

// //         // try to create raw material (recover on duplicate 409)
// //         let rmData = null;
// //         const createRmRes = await fetchWithAuth("/api/raw-materials", {
// //           method: "POST",
// //           body: JSON.stringify({
// //             rm_name: normalizedName,
// //             unit: item.unit,
// //             stock_qty: qty,
// //             record_level: Number(item.record_level) || 0,
// //           }),
// //         });
// //         const createRmParsed = await parseBody(createRmRes);

// //         if (createRmParsed.ok) {
// //           rmData = createRmParsed.body;
// //         } else if (createRmParsed.status === 409) {
// //           // duplicate: lookup existing by name
// //           const listRes = await fetchWithAuth("/api/raw-materials", { method: "GET" });
// //           const listParsed = await parseBody(listRes);
// //           if (!listParsed.ok) throw new Error("Failed to recover existing raw material after duplicate error");
// //           const found = listParsed.body.find(
// //             (r) => r.rm_name && r.rm_name.trim().toLowerCase() === normalizedName.toLowerCase()
// //           );
// //           if (!found) throw new Error(`Duplicate error but existing material "${normalizedName}" not found`);
// //           rmData = found;
// //         } else {
// //           throw new Error(createRmParsed.body?.message || `Failed to create ${normalizedName} (${createRmParsed.status})`);
// //         }

// //         // create purchase item (link)
// //         const unitPrice = Number(item.unit_price) || 0;
// //         const piRes = await fetchWithAuth("/api/purchase-items", {
// //           method: "POST",
// //           body: JSON.stringify({
// //             po_id,
// //             rm_id: rmData.rm_id,
// //             qty,
// //             unit_price: unitPrice,
// //             price: qty * unitPrice,
// //           }),
// //         });
// //         const piParsed = await parseBody(piRes);
// //         if (!piParsed.ok) {
// //           throw new Error(piParsed.body?.message || `Failed to link ${normalizedName} to order (${piParsed.status})`);
// //         }
// //       }

// //       // 4) finalize: mark PO received (best-effort)
// //       const updatePoRes = await fetchWithAuth(`/api/purchase-orders/${po_id}`, {
// //         method: "PUT",
// //         body: JSON.stringify({ status: "received" }),
// //       });
// //       const updatePoParsed = await parseBody(updatePoRes);
// //       if (!updatePoParsed.ok) console.warn("Failed to mark PO received:", updatePoParsed);

// //       showToast("Inventory and Purchase Order created successfully!", "success");

// //       // Reset
// //       setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
// //       setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
// //       fetchSuppliers();
// //     } catch (err) {
// //       console.error("Workflow Error:", err);
// //       showToast(err.message || "System error during sync", "error");
// //     }
// //   };

// //   // --- STYLING ---
// //   const containerStyle = { padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
// //   const sectionStyle = { marginBottom: "30px", padding: "28px", background: "#fff", border: "1px solid #E4E7EC", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
// //   const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" };
// //   const inputStyle = { width: "100%", padding: "12px 16px", marginTop: "8px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px", boxSizing: "border-box", transition: "border-color 0.2s ease" };
// //   const labelStyle = { display: "block", fontSize: "14px", fontWeight: "500", color: "#344054" };

// //   const secondaryBtnStyle = { background: "#fff", color: "#344054", padding: "12px 20px", border: "1px solid #D0D5DD", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease" };
// //   const primaryBtnStyle = { background: primaryTeal, color: "white", padding: "12px 28px", border: `1px solid ${primaryTeal}`, borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px", float: "right" };

// //   return (
// //     <div style={{ display: "flex", background: bgGrey, minHeight: "100vh" }}>
// //       <Sidebar />
// //       {toast.show && (
// //         <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
// //       )}
// //       <div style={{ flex: 1, marginLeft: "240px" }}>
// //         <Header title="Raw Ingredients" role="Branch Admin" email="branchadmin@gmail.com" />
// //         <div style={{ padding: "10px 20px", minHeight: "calc(100vh - 70px)" }}>
// //           <div style={containerStyle}>
// //             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "30px" }}>
// //               <div>
// //                 <h2 style={{ color: "#101828", margin: 0, fontWeight: '700', fontSize: '24px' }}>Add Raw Materials</h2>
// //                 <p style={{ color: "#667085", margin: '5px 0 0 0', fontSize: '16px' }}>Onboard new suppliers and log incoming ingredients</p>
// //               </div>
// //             </div>

// //             <div style={sectionStyle}>
// //               <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
// //                 <span style={{ fontSize: "20px", color: primaryTeal }}>👤</span>
// //                 <h3 style={{ marginTop: 0, marginBottom: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>1. Supplier Details</h3>
// //               </div>
// //               <div style={gridStyle}>
// //                 <div>
// //                   <label style={labelStyle}>Supplier Name *</label>
// //                   <input style={inputStyle} placeholder="Enter supplier/business name" value={supplier.sup_name} onChange={(e) => handleSupplierChange("sup_name", e.target.value)} />
// //                 </div>
// //                 <div>
// //                   <label style={labelStyle}>Contact Number *</label>
// //                   <input style={inputStyle} placeholder="+94 7X XXX XXXX" value={supplier.sup_contact} onChange={(e) => handleSupplierChange("sup_contact", e.target.value)} />
// //                 </div>
// //                 <div>
// //                   <label style={labelStyle}>Email Address *</label>
// //                   <input style={inputStyle} placeholder="supplier@example.com" value={supplier.sup_email} onChange={(e) => handleSupplierChange("sup_email", e.target.value)} />
// //                 </div>
// //                 <div>
// //                   <label style={labelStyle}>Address</label>
// //                   <input style={inputStyle} placeholder="Enter physical address (optional)" value={supplier.sup_address} onChange={(e) => handleSupplierChange("sup_address", e.target.value)} />
// //                 </div>
// //               </div>
// //             </div>

// //             <div style={{ ...sectionStyle, background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 0 30px 0' }}>
// //               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //                   <span style={{ fontSize: "20px", color: primaryTeal }}>📦</span>
// //                   <h3 style={{ margin: 0, color: primaryBlue, fontSize: '18px', fontWeight: '600' }}>2. Incoming Raw Ingredients</h3>
// //                 </div>
// //                 <button onClick={addMaterialRow} style={{ ...secondaryBtnStyle, display: 'flex', alignItems: 'center', gap: '6px', color: primaryTeal, borderColor: primaryTeal }}>
// //                   <span style={{ fontSize: '16px' }}>+</span> Add Another Ingredient
// //                 </button>
// //               </div>
// //               {materials.map((m, idx) => (
// //                 <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
// //               ))}
// //             </div>

// //             <div style={{ textAlign: "right", borderTop: '1px solid #E4E7EC', paddingTop: '20px' }}>
// //               <button style={{ ...secondaryBtnStyle, marginRight: '12px' }} onClick={() => { setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" }); setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]); }}>
// //                 Cancel
// //               </button>
// //               <button style={primaryBtnStyle} onClick={handleSubmit} onMouseOver={(e) => e.target.style.background = "#2e3da3"} onMouseOut={(e) => e.target.style.background = primaryTeal}>
// //                 Save All Records <span style={{ fontSize: '16px' }}>→</span>
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default AddRawMaterials;































