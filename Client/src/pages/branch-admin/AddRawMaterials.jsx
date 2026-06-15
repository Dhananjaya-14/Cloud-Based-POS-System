import React, { useState, useEffect } from "react";
import RawIngredient from "../../components/branch-admin/RawIngredient";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { useAuth } from "../../context/AuthContext";
import { getSocket, joinBranchInventoryRoom, SOCKET_EVENTS } from '../../services/socket';

const AddRawMaterials = () => {
  const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];
  const primaryTeal = "#3A4DBF";
  const primaryBlue = "#001F3F";
  const bgGrey = "#F9FAFB";

  const { user } = useAuth();

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

  useEffect(() => {
    fetchSuppliers();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add WebSocket connection effect for inventory room
  useEffect(() => {
    // Join branch inventory room when component mounts to receive updates
    const branchId = user?.b_id || user?.B_id;
    if (branchId) {
      const socket = getSocket();
      if (socket && socket.connected) {
        joinBranchInventoryRoom(branchId);
        console.log(`Joined inventory room for branch ${branchId} from AddRawMaterials`);
      } else if (socket) {
        // If socket is not connected yet, wait for connection
        const handleConnect = () => {
          joinBranchInventoryRoom(branchId);
          console.log(`Joined inventory room for branch ${branchId} after connection`);
          socket.off('connect', handleConnect);
        };
        socket.on('connect', handleConnect);
        
        return () => {
          socket.off('connect', handleConnect);
        };
      }
    }
  }, [user]);

  // Listen for supplier updates to keep the dropdown fresh
  useEffect(() => {
    const companyId = user?.com_id;
    if (!companyId) return;

    const socket = getSocket();
    
    const handleSupplierCreated = (newSupplier) => {
      console.log('New supplier detected via WebSocket, refreshing list:', newSupplier);
      fetchSuppliers(); // Refresh the suppliers list
      showToast(`New supplier "${newSupplier.sup_name}" added to directory`, "info");
    };

    const handleSupplierUpdated = (updatedSupplier) => {
      console.log('Supplier updated via WebSocket, refreshing list:', updatedSupplier);
      fetchSuppliers(); // Refresh the suppliers list
      // If the current selected supplier is being updated, also update the form
      if (supplier.sup_id === updatedSupplier.sup_id) {
        setSupplier(updatedSupplier);
        showToast(`Supplier "${updatedSupplier.sup_name}" has been updated`, "info");
      }
    };

    const handleSupplierDeleted = (data) => {
      console.log('Supplier deleted via WebSocket, refreshing list:', data);
      fetchSuppliers(); // Refresh the suppliers list
      // If the current selected supplier is being deleted, reset the form
      if (supplier.sup_id === data.sup_id) {
        setSupplier({
          sup_name: "",
          sup_email: "",
          sup_contact: "",
          sup_address: "",
        });
        setIsNewSupplier(true);
        showToast(`Supplier has been deleted from the directory`, "info");
      }
    };

    if (socket && socket.connected) {
      socket.on('supplier:created', handleSupplierCreated);
      socket.on('supplier:updated', handleSupplierUpdated);
      socket.on('supplier:deleted', handleSupplierDeleted);
      console.log('Supplier WebSocket listeners attached');
    } else if (socket) {
      const handleConnect = () => {
        socket.on('supplier:created', handleSupplierCreated);
        socket.on('supplier:updated', handleSupplierUpdated);
        socket.on('supplier:deleted', handleSupplierDeleted);
        console.log('Supplier WebSocket listeners attached after connection');
        socket.off('connect', handleConnect);
      };
      socket.on('connect', handleConnect);
      
      return () => {
        socket.off('connect', handleConnect);
      };
    }

    return () => {
      if (socket) {
        socket.off('supplier:created', handleSupplierCreated);
        socket.off('supplier:updated', handleSupplierUpdated);
        socket.off('supplier:deleted', handleSupplierDeleted);
        console.log('Supplier WebSocket listeners removed');
      }
    };
  }, [user?.com_id, supplier.sup_id]);

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
      const suppliersList = extractArray(data);
      setExistingSuppliers(suppliersList);
      // Also cache suppliers in localStorage
      localStorage.setItem('cached_suppliers', JSON.stringify(suppliersList));
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
        showToast("Branches listing is not permitted for this account.", "error");
        setBranches([]);
      } else if (!res.ok) {
        showToast(`Failed to load branches (${res.status})`, "error");
        setBranches([]);
      } else {
        const data = await res.json().catch(() => ([]));
        const list = extractArray(data);
        setBranches(list.length > 0 ? list : []);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setBranches([]);
    }
  };

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

  const handleSubmit = async () => {
    try {
      if (!supplier.sup_name || !supplier.sup_email || !supplier.sup_contact) {
        throw new Error("Please fill in required Supplier Details (Name, Email, Contact)");
      }

      // pick branch id: prefer logged-in user's branch, then any branch returned by the API
      const branchCandidate = Array.isArray(branches) && branches.length > 0 ? branches[0] : null;
      const branchId =
        user?.b_id ??
        user?.B_id ??
        branchCandidate?.B_id ??
        branchCandidate?.b_id ??
        branchCandidate?.id ??
        null;

      if (!branchId) {
        showToast("No branch available — ensure your account is assigned to a branch.", "error");
        return;
      }

      // 1) create or reuse supplier
      let finalSupId;
      const existing = (Array.isArray(existingSuppliers) ? existingSuppliers : []).find(
        (s) => s.sup_email && s.sup_email.toLowerCase() === supplier.sup_email.toLowerCase()
      );

      if (existing) {
        finalSupId = existing.sup_id;
        showToast(`Using existing supplier: ${supplier.sup_name}`, "info");
      } else {
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
        showToast(`New supplier "${supplier.sup_name}" created`, "success");
        fetchSuppliers(); // Refresh the supplier list
      }

      // 2) create purchase order (pending) — do NOT include payment details here
      const poPayload = {
        sup_id: finalSupId,
        B_id: Number(branchId),
        status: "pending",
      };

      const poRes = await fetchWithAuth("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(poPayload),
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
            B_id: Number(branchId),
            com_id: user?.com_id ?? undefined,
          }),
        });
        const createRmParsed = await parseBody(createRmRes);

        if (createRmParsed.ok) {
          rmData = createRmParsed.body;
          // Show success message for each material created
          console.log(`Material "${normalizedName}" created successfully with ID: ${rmData.rm_id}`);
        } else if (createRmParsed.status === 409) {
          const listRes = await fetchWithAuth("/api/raw-materials", { method: "GET" });
          const listParsed = await parseBody(listRes);
          if (!listParsed.ok) throw new Error("Failed to recover existing raw material after duplicate error");
          const listArray = Array.isArray(listParsed.body) ? listParsed.body : extractArray(listParsed.body);
          const found = listArray.find(
            (r) =>
              r.rm_name &&
              r.rm_name.trim().toLowerCase() === normalizedName.toLowerCase() &&
              (r.B_id == null || String(r.B_id) === String(branchId))
          );
          if (!found) throw new Error(`Duplicate error but existing material "${normalizedName}" not found`);
          rmData = found;
          console.log(`Using existing material "${normalizedName}" with ID: ${rmData.rm_id}`);
        } else {
          throw new Error(createRmParsed.body?.message || `Failed to create ${normalizedName} (${createRmParsed.status})`);
        }

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

      // NOTE: do NOT mark PO as received here. Let user mark it received later (with payment) via Supplier UI.
      showToast("Purchase order created (pending). Mark as received in Purchase History.", "success");

      // Reset form
      setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" });
      setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
      setIsNewSupplier(false);
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
        <Header title="Inventory Items" role="Branch Admin" email={user?.email || "branchadmin@gmail.com"} />
        <div style={containerStyle}>
          <h2 style={{ color: "#101828", fontWeight: '700', fontSize: '24px', marginBottom: '20px' }}>Add Inventory Items</h2>

          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, color: primaryTeal }}>📦</span>
                <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>1. Incoming Inventory Items</h3>
              </div>
              <button onClick={addMaterialRow} style={{ background: 'none', border: `1px solid ${primaryTeal}`, padding: '8px 16px', borderRadius: '8px', color: primaryTeal, cursor: 'pointer', fontWeight: '600' }}>
                + Add Another Item
              </button>
            </div>
            {materials.map((m, idx) => (
              <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
            ))}
          </div>

          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, color: primaryTeal }}>👤</span>
                <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>2. Supplier</h3>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {!isNewSupplier && (
                  <button
                    onClick={() => { setIsNewSupplier(true); setSupplier({ sup_name: "", sup_email: "", sup_contact: "", sup_address: "" }); }}
                    style={{ background: primaryTeal, color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: 14 }}
                  >
                    + Add New Supplier
                  </button>
                )}
              </div>
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
                  value={supplier.sup_id || ""}
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