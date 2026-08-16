import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBed,
  FaDesktop,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaStore,
  FaTrashAlt,
  FaUtensils,
  FaUserCircle,
  FaWineGlassAlt,
  FaClipboardList,
  FaCoffee,
  FaSyncAlt,
} from "react-icons/fa";
import { PiPlayPauseBold } from "react-icons/pi";
import { MdTableBar } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, getSocket, SOCKET_EVENTS, subscribeToTableUpdates, subscribeToOrderUpdates } from "../../services/socket";
import {
  getWaiterProfile,
  getBranchProducts,
  getTablesByBranch,
  createWaiterOrder,
  createOrderItem,
  getCategories,
  getWaiterOrders,
  updateOrderStatus,
  getOrderItemsByOrderId,
} from "../../services/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

const resolveProductImage = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const getCategoryIcon = (name) => {
  const lower = String(name).toLowerCase();
  if (lower.includes("bev") || lower.includes("drink") || lower.includes("bar") || lower.includes("wine")) {
    return FaWineGlassAlt;
  }
  if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake") || lower.includes("coffee")) {
    return FaCoffee;
  }
  if (lower.includes("room")) {
    return FaBed;
  }
  if (lower.includes("desk")) {
    return FaDesktop;
  }
  return FaUtensils;
};

const WaiterPos = () => {
  const navigate = useNavigate();
  const { user, logout, features } = useAuth();
  const kitchenEnabled = features?.has_kitchen === true;
  const inventoryEnabled = features?.has_inventory === true;
  
  const [branchName, setBranchName] = useState("Loading...");
  const [branchId, setBranchId] = useState(null);
  const [roleName, setRoleName] = useState("Waiter");
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState([
    { cat_id: "all", cat_name: "All Items" }
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState("");
  
  // Tax calculations
  const [taxRate, setTaxRate] = useState(10);

  // My Orders state (for no-kitchen confirm delivery flow)
  const [myOrders, setMyOrders] = useState([]);
  const [processingOrderIds, setProcessingOrderIds] = useState([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false);
  const [activeOrdersTab, setActiveOrdersTab] = useState("active");
  
  const [heldOrders, setHeldOrders] = useState([]);

  // Table Layout State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  // Order Details State
  const [orderAllergies, setOrderAllergies] = useState("");
  const [orderAddOns, setOrderAddOns] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const profile = await getWaiterProfile();
      const profileData = profile?.data ?? null;

      if (profileData) {
        const resolvedBranchId =
          profileData.branch_id ?? profileData.b_id ?? profileData.B_id ?? null;

        setBranchId(resolvedBranchId);
        setBranchName(profileData.b_name || "Assigned Branch");

        if (profileData.role_name) {
          setRoleName(profileData.role_name);
        }

        if (!resolvedBranchId) {
          setProducts([]);
          setError("No branch is assigned to your account.");
        } else {
          const branchProductList = await getBranchProducts(resolvedBranchId);
          setProducts(Array.isArray(branchProductList) ? branchProductList : []);
          
          try {
            const tablesRes = await getTablesByBranch(resolvedBranchId);
            setTables(Array.isArray(tablesRes) ? tablesRes : []);
          } catch (e) {
            console.error("Failed to load tables:", e);
          }
        }
      } else {
        setProducts([]);
      }

      const catsRes = await getCategories();
      if (catsRes) {
        setCategories([{ cat_id: "all", cat_name: "All Items" }, ...catsRes]);
      }
    } catch (err) {
      console.error("Error loading POS data:", err);
      setError("Failed to load data. Please refresh or contact admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchMyOrders(false);
  }, [user]);

  useEffect(() => {
    if (!branchId) return;
    
    connectSocket();

    const unsubscribeTables = subscribeToTableUpdates(branchId, {
      onTableUpdated: (data) => {
        setTables((prev) =>
          prev.map((t) =>
            t.table_id === data.table_id
              ? { ...t, table_status: data.table_status }
              : t
          )
        );
      },
    });

    const unsubscribeOrders = subscribeToOrderUpdates(branchId, {
      onOrderReady: (data) => {
        showToast(`Kitchen completed Order #${data.or_id}!`, "success");
        fetchMyOrders(false);
      },
    });

    return () => {
      unsubscribeTables();
      unsubscribeOrders();
    };
  }, [branchId]);


  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.pro_name ?? "").toLowerCase();
      const description = String(product.pro_des ?? "").toLowerCase();
      const shortName = String(product.pro_shortname ?? "").toLowerCase();

      const matchesSearch =
        !term || [name, description, shortName].some((value) => value.includes(term));

      const matchesCategory =
        selectedCategoryId === "all" || Number(product.cat_id) === Number(selectedCategoryId);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategoryId]);

  const taxableBase = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  }, [cart]);

  const taxAmount = (taxableBase * taxRate) / 100;
  const total = taxableBase + taxAmount;

  const addToCart = (product) => {
    const ignoreStock = !inventoryEnabled;
    const stockCount = Number(product.pro_quantity ?? 0);
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.Bpro_id === product.Bpro_id);
      if (existing) {
        if (!ignoreStock && existing.qty >= stockCount) {
          showToast(`Cannot add more. Only ${stockCount} items available in stock.`, "error");
          return currentCart;
        }
        return currentCart.map((item) =>
          item.Bpro_id === product.Bpro_id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      if (!ignoreStock && stockCount <= 0) {
        showToast("This item is out of stock.", "error");
        return currentCart;
      }

      return [
        ...currentCart,
        {
          Bpro_id: product.Bpro_id,
          pro_name: product.pro_name,
          unitPrice: Number(product.pro_price || product[" Pro_Price"] || 0),
          qty: 1,
        },
      ];
    });
  };

  const updateQuantity = (Bpro_id, delta) => {
    const product = products.find((p) => p.Bpro_id === Bpro_id);
    const ignoreStock = !inventoryEnabled;
    const stockCount = Number(product?.pro_quantity ?? 0);

    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.Bpro_id === Bpro_id) {
            const nextQty = item.qty + delta;
            if (delta > 0 && !ignoreStock && nextQty > stockCount) {
              showToast(`Cannot add more. Only ${stockCount} items available in stock.`, "error");
              return item;
            }
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (Bpro_id) => {
    setCart((currentCart) => currentCart.filter((item) => item.Bpro_id !== Bpro_id));
  };

  const fetchMyOrders = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoadingMyOrders(true);
      }
      const res = await getWaiterOrders();
      const orders = Array.isArray(res) ? res : (res?.data ?? []);
      const activeOrders = orders.filter(o => o.or_status !== "cancelled" && o.or_status !== "completed");
      
      const ordersWithItems = await Promise.all(activeOrders.map(async (order) => {
        try {
          const items = await getOrderItemsByOrderId(order.or_id);
          return { ...order, items };
        } catch (e) {
          return { ...order, items: [] };
        }
      }));
      
      setMyOrders(ordersWithItems);
    } catch (err) {
      console.error("Failed to fetch my orders", err);
    } finally {
      if(showSpinner) setLoadingMyOrders(false);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    if (processingOrderIds.includes(orderId)) return;
    setProcessingOrderIds(prev => [...prev, orderId]);
    try {
      await updateOrderStatus(orderId, "completed");
      showToast("Order delivered successfully!", "success");
      await fetchMyOrders(false);
    } catch (err) {
      showToast("Failed to confirm delivery: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setProcessingOrderIds(prev => prev.filter(id => id !== orderId));
      fetchMyOrders(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (processingOrderIds.includes(orderId)) return;
    setProcessingOrderIds(prev => [...prev, orderId]);
    try {
      await updateOrderStatus(orderId, "cancelled");
      showToast(`Order #${orderId} cancelled.`, "success");
      setMyOrders((prev) =>
        prev.filter((order) => order.or_id !== orderId)
      );
    } catch (err) {
      showToast("Failed to cancel order: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setProcessingOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHeldOrder = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      selectedTable,
      orderAllergies,
      orderAddOns,
      orderNotes
    };
    setHeldOrders((prev) => [...prev, newHeldOrder]);

    // Reset form
    setCart([]);
    setSelectedTable(null);
    setOrderAllergies("");
    setOrderAddOns("");
    setOrderNotes("");
    showToast("Order put on hold.", "success");
  };

  const submitOrder = async (orderCart, orderTable, notes, addOns, allergies) => {
    if (!orderCart.length || submittingRef.current) return false;
    try {
      submittingRef.current = true;
      setSubmitting(true);
      setError("");

      const calculatedTaxableBase = orderCart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
      const calculatedTaxAmount = (calculatedTaxableBase * taxRate) / 100;
      const calculatedTotal = calculatedTaxableBase + calculatedTaxAmount;

      const orderPayload = {
        table_id: orderTable.table_id,
        or_tax: taxRate,
        or_totalcost: Number(calculatedTaxableBase.toFixed(2)),
        or_totalCostWtax: Number(calculatedTotal.toFixed(2)),
        or_notes: notes?.trim() || "",
        or_addons: addOns?.trim() || "",
        or_allergies: allergies?.trim() || "",
      };

      const orderRes = await createWaiterOrder(orderPayload);
      if (!orderRes.success) throw new Error(orderRes.error || "Failed to create order");
      
      const orderId = orderRes.data.or_id || orderRes.data.order_id || orderRes.data.id;

      if (!orderId) {
        throw new Error("Created order ID is missing");
      }

      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ORDER_SENT, {
        orderId,
        branchId,
        total: Number(calculatedTotal.toFixed(2)),
      });

      await Promise.all(
        orderCart.map((item) =>
          createOrderItem({
            Bpro_id: item.Bpro_id,
            pro_quantity: item.qty,
            unit_price: item.unitPrice,
            order_id: orderId,
          })
        )
      );

      fetchMyOrders(true);
      return true;
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to place order.");
      showToast(err.response?.data?.error || err.message || "Failed to place order.", "error");
      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRestoreHeldOrder = async (heldOrder) => {
    if (processingOrderIds.includes(heldOrder.id)) return;
    
    if (!heldOrder.selectedTable) {
      showToast("Table required to confirm order. Restored to cart.", "error");
      setCart(heldOrder.cart);
      setSelectedTable(null);
      setOrderAllergies(heldOrder.orderAllergies || "");
      setOrderAddOns(heldOrder.orderAddOns || "");
      setOrderNotes(heldOrder.orderNotes || "");
      setHeldOrders((prev) => prev.filter(ho => ho.id !== heldOrder.id));
      setShowMyOrdersModal(false);
      return;
    }

    setProcessingOrderIds(prev => [...prev, heldOrder.id]);
    
    const success = await submitOrder(
      heldOrder.cart, 
      heldOrder.selectedTable, 
      heldOrder.orderNotes, 
      heldOrder.orderAddOns, 
      heldOrder.orderAllergies
    );

    if (success) {
      setHeldOrders((prev) => prev.filter(ho => ho.id !== heldOrder.id));
      setActiveOrdersTab("active");
      showToast("Order placed and moved to Active!", "success");
    }
    
    setProcessingOrderIds(prev => prev.filter(id => id !== heldOrder.id));
  };

  const handleDeleteHeldOrder = (heldOrderId) => {
    setHeldOrders((prev) => prev.filter(ho => ho.id !== heldOrderId));
    showToast("Held order removed.", "success");
  };

  const handlePlaceOrder = async () => {
    if (!selectedTable) {
      showToast("Please select a table", "error");
      return;
    }
    const success = await submitOrder(cart, selectedTable, orderNotes, orderAddOns, orderAllergies);
    if (success) {
      setCart([]);
      setSelectedTable(null);
      setOrderNotes("");
      setOrderAddOns("");
      setOrderAllergies("");
      showToast("Order placed successfully!", "success");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#55C24A]"></div>
          <p className="font-medium text-slate-600">Loading Waiter System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800">
      {toast.show && (
        <ToastMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((current) => ({ ...current, show: false }))}
        />
      )}
      {/* Top Header */}
      <header className="border-b border-black/5 bg-gradient-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-[0_10px_30px_rgba(2,8,23,0.15)] flex-none z-30">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white text-[#0A5BAE] shadow-sm">
              <FaStore className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-wide">Hotel POS</div>
              <div className="text-[11px] text-white/80">Point of Sale System</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/15 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0A5BAE]">
                <FaUserCircle className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-semibold leading-none text-left">
                  {user?.u_fname || "Waiter"} {user?.u_lname || ""}
                </div>
                <div className="mt-0.5 text-[11px] text-left text-white/80">{roleName} • {branchName}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
            >
              <FaSignOutAlt className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden bg-[#f4f7fb]">
      
      {/* LEFT COLUMN: Table Layout */}
      <aside className="flex flex-col w-[350px] shrink-0 border-r border-slate-200 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Table Layout</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">{tables.filter(t => t.table_status?.toLowerCase() === 'available').length} Tables Available</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {tables.map(t => {
              const isSelected = selectedTable?.table_id === t.table_id;
              const isAvailable = t.table_status?.toLowerCase() === "available";
              
              return (
                <button
                  key={t.table_id}
                  onClick={() => setSelectedTable(t)}
                  disabled={!isAvailable}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    !isAvailable
                      ? "border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed grayscale"
                      : isSelected
                        ? "border-[#0A5BAE] bg-blue-50/50 shadow-md"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className={`absolute top-3 right-3 h-2.5 w-2.5 rounded-full ${!isAvailable ? "bg-red-500" : "bg-[#55C24A]"}`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-2 ${isSelected ? "bg-[#0A5BAE] text-white" : "bg-slate-100 text-slate-500"}`}>
                    <FaUtensils className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-slate-800">T{t.table_number || t.table_id}</span>
                  <span className="text-xs font-semibold text-slate-400 mt-0.5">👥 {t.table_capacity}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: Menu & Products */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 relative z-10">
        <header className="flex h-[80px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
           <div className="no-scrollbar flex w-full max-w-[60%] flex-nowrap items-center gap-2 overflow-x-auto">
            {categories.map((cat) => {
              const IconComponent = cat.cat_id === "all" ? FaStore : getCategoryIcon(cat.cat_name);
              const isActive = String(selectedCategoryId) === String(cat.cat_id);
              return (
                <button
                  key={cat.cat_id}
                  onClick={() => setSelectedCategoryId(cat.cat_id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#0A5BAE] text-white shadow-md"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {cat.cat_name}
                </button>
              );
            })}
          </div>

          <div className="relative flex w-full max-w-[280px] items-center shrink-0">
            <FaSearch className="absolute left-4 z-10 text-slate-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-[#0A5BAE] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-5">
           {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 pb-20">
              {filteredProducts.map((p) => {
                const price = Number(p.pro_price || p[" Pro_Price"] || p.Pro_Price || 0);
                const cartItem = cart.find(item => item.Bpro_id === p.Bpro_id);
                const cartQty = cartItem ? cartItem.qty : 0;
                return (
                  <div
                    key={p.Bpro_id}
                    onClick={() => addToCart(p)}
                    className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white p-2 shadow-sm transition-all hover:-translate-y-1 hover:border-[#0A5BAE]/30 hover:shadow-xl cursor-pointer"
                  >
                    <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-50">
                      {resolveProductImage(p.pro_image) ? (
                        <img
                          src={resolveProductImage(p.pro_image)}
                          alt={p.pro_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100/50">
                          <FaCoffee className="h-10 w-10 text-slate-300 transition-transform group-hover:scale-110 group-hover:text-[#0A5BAE]/40" />
                        </div>
                      )}
                    </div>
                    <div className="mt-auto px-1">
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 mb-1">
                        {p.pro_name}
                      </h3>
                      <div className="text-xs font-semibold text-slate-500 mb-2">
                        Stock: {p.pro_quantity}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-[#55C24A]">
                          ${price.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                          <FaPlus className="h-3 w-2" /> 
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
           ) : (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50">
              <FaStore className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-bold text-slate-500">No products found</p>
            </div>
           )}
        </div>
        

        <div className="absolute bottom-8 right-8 z-20">
          <button 
            onClick={() => { setShowMyOrdersModal(true); fetchMyOrders(false); }}
            className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-full font-bold shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:bg-slate-800 transition-all hover:scale-105 hover:-translate-y-1"
          >
            <div className="relative">
              <FaClipboardList className="h-5 w-5" />
              {(myOrders.length > 0 || heldOrders.length > 0) && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black">
                  {myOrders.length + heldOrders.length}
                </span>
              )}
            </div>
            View My Orders
          </button>
        </div>
      </main>

      {/* RIGHT COLUMN: Cart */}
      <aside className="flex flex-col w-[380px] shrink-0 border-l border-slate-200 bg-white shadow-[-2px_0_10px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Order</h2>
          <div className="flex items-center gap-2 bg-blue-50 text-[#0A5BAE] px-3 py-1.5 rounded-lg font-bold text-sm">
            <FaShoppingCart className="h-4 w-4" />
            <span>{cart.length} Items</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {/* Selected Table Info */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0A5BAE]">
              <MdTableBar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {selectedTable ? `Table ${selectedTable.table_number || selectedTable.table_id}` : "No Table Selected"}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {selectedTable ? `${selectedTable.table_capacity} Seats Available` : "Please select a table to proceed"}
              </p>
            </div>
          </div>

          {/* Cart Items */}
          <div className="p-3 space-y-3">
            {cart.map((item) => (
              <div key={item.Bpro_id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-800">{item.pro_name}</h4>
                    <p className="mt-1 text-sm font-black text-[#55C24A]">${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.Bpro_id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-red-500 hover:text-white">
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                    <button onClick={() => updateQuantity(item.Bpro_id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-red-500 font-bold">
                      <FaMinus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold tabular-nums text-slate-800">{item.qty}</span>
                    <button onClick={() => updateQuantity(item.Bpro_id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm font-bold hover:bg-black">
                      <FaPlus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Meta Fields (Allergies, Addons, Notes) */}
          <div className="px-4 pb-6 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                ⚠️ Allergies / Dietary Restrictions
              </label>
              <input 
                type="text" 
                value={orderAllergies}
                onChange={e => setOrderAllergies(e.target.value)}
                placeholder="e.g., Nuts, Gluten, Dairy..." 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                ➕ Add Ons
              </label>
              <input 
                type="text" 
                value={orderAddOns}
                onChange={e => setOrderAddOns(e.target.value)}
                placeholder="Extra cheese, toppings, sides..." 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0A5BAE] focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                📝 Notes
              </label>
              <input 
                type="text" 
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="Special requests, preferences..." 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#0A5BAE] focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Math & Checkout */}
        <div className="border-t border-slate-200 bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 flex-none">
          <div className="space-y-2 border-b border-slate-100 pb-4 text-sm mb-4">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-800 tabular-nums">${taxableBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-bold text-slate-800 tabular-nums">${taxAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-5 bg-[#E8F3FF] p-4 rounded-2xl">
            <span className="text-lg font-black text-[#0A5BAE]">Total</span>
            <span className="text-2xl font-black tracking-tight text-[#0A5BAE] tabular-nums">${total.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleHoldOrder}
              disabled={cart.length === 0}
              className="flex-1 py-3 rounded-xl bg-yellow-400 text-yellow-900 font-bold text-sm shadow-sm hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PiPlayPauseBold className="h-4 w-4"/> Hold
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || cart.length === 0 || !selectedTable}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#55C24A] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#49b03f] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <FaShoppingCart className="h-4 w-4" />
              {submitting ? "Processing..." : "Confirm"}
            </button>
          </div>
          {!selectedTable && cart.length > 0 && (
             <p className="text-center text-red-500 text-xs font-bold mt-3">Select a table to confirm order.</p>
          )}
        </div>
      </aside>

      {/* My Orders Modal (with Tabs) */}
      {showMyOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[680px]">
            <div className="flex flex-col border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between p-6 md:px-8 pb-4">
                <h2 className="text-2xl font-black tracking-tight text-slate-800">My Orders</h2>
                <div className="flex items-center gap-4">
                  {activeOrdersTab === "active" && (
                    <button onClick={() => fetchMyOrders(false)} disabled={loadingMyOrders} className="text-sm font-bold text-[#0A5BAE] hover:underline disabled:opacity-50">
                      {loadingMyOrders ? "Refreshing..." : "↻ Refresh Data"}
                    </button>
                  )}
                  <button onClick={() => setShowMyOrdersModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 transition-colors text-slate-600 font-bold">
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex px-6 md:px-8 gap-6">
                <button 
                  onClick={() => setActiveOrdersTab("active")}
                  className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeOrdersTab === "active" ? "border-[#0A5BAE] text-[#0A5BAE]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  Active Orders {myOrders.length > 0 && <span className="ml-1 rounded-full bg-[#0A5BAE]/10 px-2 py-0.5 text-[#0A5BAE]">{myOrders.length}</span>}
                </button>
                <button 
                  onClick={() => setActiveOrdersTab("held")}
                  className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeOrdersTab === "held" ? "border-yellow-500 text-yellow-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  <PiPlayPauseBold className={activeOrdersTab === "held" ? "text-yellow-500" : ""} /> Held Orders 
                  {heldOrders.length > 0 && <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">{heldOrders.length}</span>}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
              {activeOrdersTab === "active" ? (
                loadingMyOrders && myOrders.length === 0 ? (
                  <div className="py-20 flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#0A5BAE]"></div>
                  </div>
                ) : myOrders.length === 0 ? (
                  <div className="py-20 flex flex-col items-center opacity-60">
                    <FaClipboardList className="h-20 w-20 text-slate-300 mb-5" />
                    <p className="text-xl font-bold text-slate-600">No active orders</p>
                    <p className="text-sm font-semibold text-slate-400 mt-2">Orders you place will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {myOrders.map((order) => (
                      <div key={order.or_id} className="group relative flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md">
                        {/* Absolute Delete Button */}
                        <button 
                          onClick={() => handleCancelOrder(order.or_id)} 
                          disabled={processingOrderIds.includes(order.or_id)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 opacity-80 transition-all hover:bg-rose-500 hover:text-white hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Cancel Order"
                        >
                          <FaTrashAlt className="h-3.5 w-3.5" />
                        </button>
  
                        {/* Header */}
                        <div className="mb-3 flex items-start justify-between border-b border-dashed border-slate-200 pb-3 pr-10">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold text-slate-400">ORDER</span>
                              <span className="text-lg font-black text-slate-900">#{order.or_id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                order.or_status === "pending"   ? "bg-amber-100 text-amber-700" :
                                order.or_status === "preparing" ? "bg-blue-100 text-blue-700" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                <span className="mr-1 h-1.5 w-1.5 rounded-full fill-current bg-current"></span>
                                {order.or_status?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
  
                          {order.table_id && (
                            <div className="flex flex-col items-end">
                              <div className="flex h-7 min-w-[32px] items-center justify-center rounded-lg bg-blue-50 px-2 text-sm font-black text-[#0A5BAE]">
                                {tables.find(t => t.table_id === order.table_id)?.table_number}
                              </div>
                            </div>
                          )}
                        </div>
  
                        {/* Items */}
                        <div className="flex-1 space-y-3">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-2 max-h-12 overflow-y-auto pr-2 custom-scrollbar">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                                  <div className="flex gap-2">
                                    <span className="font-bold text-slate-400">{Number(item.pro_quantity || item.qty || 1)}x</span>
                                    <span className="font-semibold text-slate-700">{item.pro_name}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">
                                    ${(Number(item.unit_price || item.branch_price || 0) * Number(item.pro_quantity || item.qty || 1)).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs italic text-slate-400">No items</div>
                          )}
                        </div>
  
                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                          <div className="flex items-end justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                            <span className="text-2xl font-black text-[#55C24A] tracking-tighter">
                              ${Number(order.or_totalCostWtax || order.or_totalcost || 0).toFixed(2)}
                            </span>
                          </div>
  
                          {!kitchenEnabled && (
                            <button 
                              onClick={() => handleConfirmDelivery(order.or_id)} 
                              disabled={processingOrderIds.includes(order.or_id)}
                              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0"
                            >
                              {processingOrderIds.includes(order.or_id) ? "Processing..." : "Confirm Delivery"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                heldOrders.length === 0 ? (
                  <div className="py-20 flex flex-col items-center opacity-60">
                    <PiPlayPauseBold className="h-20 w-20 text-slate-300 mb-5" />
                    <p className="text-xl font-bold text-slate-600">No held orders</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {heldOrders.map((ho) => (
                      <div key={ho.id} className="group relative flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md">
                        <button 
                          onClick={() => handleDeleteHeldOrder(ho.id)} 
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 opacity-80 transition-all hover:bg-rose-500 hover:text-white hover:opacity-100"
                          title="Delete Held Order"
                        >
                          <FaTrashAlt className="h-3.5 w-3.5" />
                        </button>
  
                        <div className="mb-3 flex items-start justify-between border-b border-dashed border-slate-200 pb-3 pr-10">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold text-slate-400">HELD</span>
                              <span className="text-lg font-black text-slate-900">{ho.timestamp}</span>
                            </div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700">
                              On Hold
                            </span>
                          </div>
                          {ho.selectedTable && (
                            <div className="flex flex-col items-end"> 
                              <div className="flex h-7 min-w-[32px] items-center justify-center rounded-lg bg-blue-50 px-2 text-sm font-black text-[#0A5BAE]">
                                {ho.selectedTable.table_number}
                              </div>
                            </div>
                          )}
                        </div>
  
                        <div className="flex-1 space-y-3">
                          <div className="space-y-2 max-h-12 overflow-y-auto pr-2 custom-scrollbar">
                            {ho.cart.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                                <div className="flex gap-2">
                                  <span className="font-bold text-slate-400">{item.qty}x</span>
                                  <span className="font-semibold text-slate-700">{item.pro_name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
  
                        <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                          <div className="flex items-end justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                            <span className="text-2xl font-black text-yellow-500 tracking-tighter">
                              ${(ho.cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0) * (1 + taxRate/100)).toFixed(2)}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleRestoreHeldOrder(ho)} 
                            disabled={processingOrderIds.includes(ho.id)}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 text-yellow-900 text-sm font-bold transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-none"
                          >
                            {processingOrderIds.includes(ho.id) ? "Processing..." : "Restore Order"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default WaiterPos;
