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

  const { user, features } = useAuth();

  const suppliersEnabled = features?.has_inventory === true;

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


  useEffect(() => {
    if (suppliersEnabled) fetchSuppliers();
    fetchBranches();
  }, [suppliersEnabled]);

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

  // ─── SUBMIT ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
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

      // ── PATH A: Suppliers DISABLED — save raw materials only (no PO) ──────
      if (!suppliersEnabled) {
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

          const materialPayload = {
            rm_name: normalizedName,
            unit: item.unit,
            stock_qty: qty,
            record_level: Number(item.record_level) || 0,
            B_id: Number(branchId),
            com_id: user?.com_id ?? undefined,
          };

          let createRmRes = await fetchWithAuth("/api/raw-materials", {
            method: "POST",
            body: JSON.stringify(materialPayload),
          });
          let createRmParsed = await parseBody(createRmRes);

          if (!createRmParsed.ok) {
            if (createRmParsed.status === 409 && createRmParsed.body?.isInactive) {
              // Restore inactive item
              const restoreRes = await fetchWithAuth("/api/raw-materials", {
                method: "POST",
                body: JSON.stringify({ ...materialPayload, restore: true }),
              });
              const restoreParsed = await parseBody(restoreRes);
              if (!restoreParsed.ok) {
                throw new Error(restoreParsed.body?.message || `Failed to restore ${normalizedName}`);
              }
            } else if (createRmParsed.status === 409) {
              throw new Error(`"${normalizedName}" already exists in the inventory list.`);
            } else {
              throw new Error(createRmParsed.body?.message || `Failed to save ${normalizedName}`);
            }
          }
        }

        showToast("Inventory Items Added Successfully", "success");
        setMaterials([{ rm_name: "", unit: "", stock_qty: "", record_level: "", unit_price: "" }]);
        return;
      }

      // ── PATH B: Suppliers ENABLED — full flow (supplier → PO → items) ──────
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
          throw new Error(parsed.body?.message || `Supplier creation failed (${parsed.status})`);
        }
        finalSupId = parsed.body.sup_id;
        showToast(`New supplier "${supplier.sup_name}" created`, "success");
        fetchSuppliers(); // Refresh the supplier list
      }

      // Create purchase order (pending)
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

      // Create materials and link to purchase order
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

        let rmData = null;
        const materialPayload = {
          rm_name: normalizedName,
          unit: item.unit,
          // This quantity is an incoming order, not stock in hand yet —
          // stock only increases once the purchase order is marked as
          // received (see receiveWithWastage). Setting it here would
          // double-count the stock.
          stock_qty: 0,
          record_level: Number(item.record_level) || 0,
          B_id: Number(branchId),
          com_id: user?.com_id ?? undefined,
        };

        let createRmRes = await fetchWithAuth("/api/raw-materials", {
          method: "POST",
          body: JSON.stringify(materialPayload),
        });
        let createRmParsed = await parseBody(createRmRes);

        if (createRmParsed.ok) {
          rmData = createRmParsed.body;
          // Show success message for each material created
          console.log(`Material "${normalizedName}" created successfully with ID: ${rmData.rm_id}`);
        } else if (createRmParsed.status === 409) {
          // Check if the material is inactive and needs to be restored
          if (createRmParsed.body?.isInactive) {
            const restoreRes = await fetchWithAuth("/api/raw-materials", {
              method: "POST",
              body: JSON.stringify({ ...materialPayload, restore: true }),
            });
            const restoreParsed = await parseBody(restoreRes);
            if (restoreParsed.ok) {
              rmData = restoreParsed.body;
            } else {
              throw new Error(restoreParsed.body?.message || `Failed to restore ${normalizedName}`);
            }
          } else {
            // Active duplication handler - find existing material
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
          }
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

      showToast("Inventory Items Added Successfully", "success");
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
        <Header title="Inventory Items" role="Branch Admin" email={user?.email || "branchadmin@gmail.com"} />
        <div style={containerStyle}>
          <h2 style={{ color: "#101828", fontWeight: '700', fontSize: '24px', marginBottom: '20px' }}>Add Inventory Items</h2>

          {/* Section 1: Inventory Items */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, color: primaryTeal }}>📦</span>
                <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>
                  {suppliersEnabled ? "1. " : ""}Incoming Inventory Items
                </h3>
              </div>
              <button onClick={addMaterialRow} style={{ background: 'none', border: `1px solid ${primaryTeal}`, padding: '8px 16px', borderRadius: '8px', color: primaryTeal, cursor: 'pointer', fontWeight: '600' }}>
                + Add Another Item
              </button>
            </div>
            {materials.map((m, idx) => (
              <RawIngredient key={idx} index={idx} data={m} validUnits={VALID_UNITS} onChange={handleMaterialChange} onRemove={removeMaterialRow} />
            ))}
          </div>

          {/* Section 2: Supplier — only shown when has_inventory is enabled */}
          {suppliersEnabled && (
            <div style={sectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20, color: primaryTeal }}>👤</span>
                  <h3 style={{ margin: 0, color: primaryBlue, fontSize: 18, fontWeight: 600 }}>2. Supplier</h3>
                </div>
              </div>

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
            </div>
          )}

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