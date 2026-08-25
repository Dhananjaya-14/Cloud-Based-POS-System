import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { useAuth } from "../../context/AuthContext";
const CreatePurchaseOrder = () => {
  const { t } = useTranslation();
const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]); // [{ key, rm_id?, pro_id?, name, unit, qty, sup_id }]

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success"
  });
  const showToast = (message, type = "success") => {
setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => setToast(t => ({
      ...t,
      show: false
    })), 4000);
  };
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const supRes = await fetch("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (supRes.ok) {
        const data = await supRes.json();
        setSuppliers(Array.isArray(data) ? data : data.data || []);
      }
      const rmRes = await fetch("/api/raw-materials", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (rmRes.ok) {
        const data = await rmRes.json();
        setRawMaterials(Array.isArray(data) ? data : data.data || []);
      }
      const b_id = user?.b_id ?? user?.B_id;
      const bpRes = await fetch(`/api/branch_products${b_id ? `?B_id=${b_id}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (bpRes.ok) {
        const data = await bpRes.json();
        const items = Array.isArray(data) ? data : data.data || [];
        setBranchProducts(items.filter(p => p.product_type === "finished"));
      }
    } catch (err) {
      setError("Failed to load items or suppliers.");
    }
  };
  const availableItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rm = rawMaterials.filter(m => !term || m.rm_name.toLowerCase().includes(term)).map(m => ({
      key: `rm_${m.rm_id}`,
      rm_id: m.rm_id,
      name: m.rm_name,
      unit: m.unit
    }));
    const pro = branchProducts.filter(p => !term || p.pro_name.toLowerCase().includes(term)).map(p => ({
      key: `pro_${p.pro_id}`,
      pro_id: p.pro_id,
      name: p.pro_name,
      unit: "pcs"
    }));
    return [...rm, ...pro];
  }, [rawMaterials, branchProducts, searchTerm]);
  const addToCart = item => {
    if (cart.some(c => c.key === item.key)) return;
    setCart(prev => [...prev, {
      ...item,
      qty: "",
      sup_id: defaultSupplier || ""
    }]);
  };
  const removeFromCart = key => {
    setCart(prev => prev.filter(c => c.key !== key));
  };
  const updateCartItem = (key, field, value) => {
setCart(prev => prev.map(c => c.key === key ? {
      ...c,
      [field]: value
    } : c));
  };
  const applyDefaultSupplierToAll = sup_id => {
    setDefaultSupplier(sup_id);
    setCart(prev => prev.map(c => ({
      ...c,
      sup_id
    })));
  };

  // Group cart items by supplier -> [{ sup_id, items: [...] }]
  const groupedBySupplier = useMemo(() => {
    const groups = {};
    for (const item of cart) {
      const key = item.sup_id || "unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [cart]);
  const handlePlaceOrder = async () => {
    setError("");
    if (cart.length === 0) {
      setError("Add at least one item to the order.");
      return;
    }
    const missingSupplier = cart.find(c => !c.sup_id);
    if (missingSupplier) {
      setError(`Please select a supplier for "${missingSupplier.name}".`);
      return;
    }
    const invalidQty = cart.find(c => !c.qty || parseFloat(c.qty) <= 0);
    if (invalidQty) {
      setError(`Please enter a valid quantity for "${invalidQty.name}".`);
      return;
    }
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const branchId = user?.b_id ?? user?.B_id ?? null;
    if (!branchId) {
      console.log("DEBUG — full user object:", user);
      setError("No branch found for this user.");
      setIsSubmitting(false);
      return;
    }
    try {
      const supplierIds = Object.keys(groupedBySupplier);
      let ordersCreated = 0;
      for (const supId of supplierIds) {
        const items = groupedBySupplier[supId];
        const orderRes = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            sup_id: parseInt(supId, 10),
            B_id: Number(branchId),
            status: "pending"
          })
        });
        if (!orderRes.ok) {
          const errData = await orderRes.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to create purchase order");
        }
        const order = await orderRes.json();
        for (const item of items) {
          const itemRes = await fetch("/api/purchase-items", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              po_id: order.po_id,
              ...(item.rm_id ? {
                rm_id: item.rm_id
              } : {
                pro_id: item.pro_id
              }),
              qty: parseFloat(item.qty)
            })
          });
          if (!itemRes.ok) {
            const errData = await itemRes.json().catch(() => ({}));
            throw new Error(errData.message || `Failed to add "${item.name}" to order`);
          }
        }
        ordersCreated += 1;
      }
      showToast(`${ordersCreated} purchase order${ordersCreated > 1 ? "s" : ""} placed successfully`);
      setTimeout(() => navigate("/branch-admin/suppliers"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const getSupplierName = id => suppliers.find(s => String(s.sup_id) === String(id))?.sup_name;
  return <div className="font-sans bg-gray-50">
      <Sidebar />
      {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({
      ...toast,
      show: false
    })} />}
      <div className="flex flex-col h-screen overflow-hidden" style={{
      marginLeft: 240
    }}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("branch_admin.bulk_order", "Bulk Order")}</h1>
              <p className="text-sm text-gray-500 mt-1">{t("branch_admin.add_multiple_items_to_order_in_one_go", "Add multiple items to order in one go")}</p>
            </div>

            {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t("branch_admin.default_supplier_applies_to_items_you_ad", "Default Supplier (applies to items you add below)")}</label>
              <select className="w-full max-w-sm border-gray-200 border rounded-xl p-3 text-sm outline-none bg-white" value={defaultSupplier} onChange={e => applyDefaultSupplierToAll(e.target.value)}>
                <option value="">{t("branch_admin.choose_a_default_supplier", "Choose a default supplier")}</option>
                {suppliers.map(s => <option key={s.sup_id} value={s.sup_id}>{s.sup_name}</option>)}
              </select>
              <p className="mt-2 text-xs text-gray-400">{t("branch_admin.you_can_still_override_the_supplier_per_", "You can still override the supplier per item below if some items come from a different supplier.")}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Item picker */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-bold text-gray-800 mb-4">{t("branch_admin.select_items", "Select Items")}</h2>
                <input type="text" placeholder={t("branch_admin.search_ingredients_or_products", "Search ingredients or products...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border-gray-200 border rounded-xl p-3 text-sm outline-none mb-4" />
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {availableItems.map(item => {
                  const inCart = cart.some(c => c.key === item.key);
                  return <button key={item.key} type="button" onClick={() => addToCart(item)} disabled={inCart} className={`w-full text-left px-4 py-2.5 rounded-xl border flex justify-between items-center transition ${inCart ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}>
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-xs">{inCart ? "Added" : "+ Add"}</span>
                      </button>;
                })}
                  {availableItems.length === 0 && <p className="text-sm text-gray-400 text-center py-6">{t("branch_admin.no_items_found", "No items found.")}</p>}
                </div>
              </div>

              {/* Cart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-bold text-gray-800 mb-4">{t("branch_admin.order_list", "Order List (")}{cart.length})</h2>
                {cart.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">{t("branch_admin.no_items_added_yet_select_items_from_the", "No items added yet. Select items from the left.")}</p> : <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map(item => <div key={item.key} className="border border-gray-200 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                          <button onClick={() => removeFromCart(item.key)} className="text-gray-400 hover:text-red-500 text-sm">
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input type="number" step="0.001" min="0.001" placeholder={`Qty (${item.unit})`} value={item.qty} onChange={e => updateCartItem(item.key, "qty", e.target.value)} className="flex-1 border-gray-200 border rounded-lg p-2 text-sm outline-none" />
                          <select value={item.sup_id} onChange={e => updateCartItem(item.key, "sup_id", e.target.value)} className="flex-1 border-gray-200 border rounded-lg p-2 text-sm outline-none bg-white">
                            <option value="">{t("branch_admin.supplier", "Supplier...")}</option>
                            {suppliers.map(s => <option key={s.sup_id} value={s.sup_id}>{s.sup_name}</option>)}
                          </select>
                        </div>
                      </div>)}
                  </div>}
              </div>
            </div>

            {cart.length > 0 && Object.keys(groupedBySupplier).length > 1 && <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">{t("branch_admin.this_will_create", "This will create")}<strong>{Object.keys(groupedBySupplier).length}{t("branch_admin.separate_orders", "separate orders")}</strong>{t("branch_admin.one_per_supplier", ", one per supplier:")}{" "}
                {Object.keys(groupedBySupplier).map(id => getSupplierName(id) || "Unassigned").join(", ")}.
              </div>}

            <div className="flex justify-end gap-3">
              <button onClick={() => navigate('/branch-admin/inventory')} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
              <button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-60">
                {isSubmitting ? "Placing Order..." : `Place Order${cart.length > 0 ? ` (${cart.length})` : ""}`}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>;
};
export default CreatePurchaseOrder;