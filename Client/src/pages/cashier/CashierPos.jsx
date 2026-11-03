import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBed,
  FaBell,
  FaDesktop,
  FaSearch,
  FaShoppingCart,
  FaSignOutAlt,
  FaSpinner,
  FaStore,
  FaTrashAlt,
  FaUserCircle,
  FaUtensils,
  FaWineGlassAlt,
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";
import posIcon from "../../assets/images/PosIcon.png";
import {
  createOrder,
  createOrderItem,
  getBranchById,
  getBranchProducts,
  getOrders,
  getOrderItemsByOrderId,
  updateOrderStatus,
  updateOrder,
  deleteOrderItem,
  initiatePayHerePayment,
  checkOrderStock,
} from "../../services/api";
import {
  connectSocket,
  getSocket,
  SOCKET_EVENTS,
  joinBranchInventoryRoom,
  leaveBranchInventoryRoom,
  subscribeToBranchProductUpdates,
} from "../../services/socket";
import PayHereQRModal from "../../components/cashier/PayHereQRModal";
import OrderReadyAlerts from "../../components/cashier/OrderReadyAlerts";
import {
  addOrderReadyAlert,
  addOrderRejectedAlert,
  dismissOrderReadyAlert,
  loadOrderReadyAlerts,
  saveOrderReadyAlerts,
} from "../../utils/orderReadyAlerts";

// ── Reusable POS sub-components ───────────────────────────────────────────────
import ProductCard    from "../../components/cashier/pos/ProductCard";
import CategoryTab    from "../../components/cashier/pos/CategoryTab";
import CartItem       from "../../components/cashier/pos/CartItem";
import SelectionGroup from "../../components/cashier/pos/SelectionGroup";

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All Items",     icon: FaStore       },
  { label: "Bar",           icon: FaWineGlassAlt },
  { label: "Restaurant",    icon: FaUtensils    },
  { label: "Room Service",  icon: FaBed         },
  { label: "Front Desk",    icon: FaDesktop     },
];

// ── Order type options (for SelectionGroup) ───────────────────────────────────
const ORDER_TYPE_OPTIONS = [
  { value: "takeaway", label: "Takeaway" },
  { value: "dine-in",  label: "Dine-in"  },
];

// ── Payment method options (for SelectionGroup) ───────────────────────────────
const PAYMENT_OPTIONS = [
  { value: "Cash",    label: "Cash"    },
  { value: "Card",    label: "Card"    },
  {
    value: "PayHere",
    label: (
      <span>
        pay<span className="text-slate-400">here</span>
      </span>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const CashierPos = () => {
  const { t }                 = useTranslation();
  const navigate              = useNavigate();
  const { user, logout, features } = useAuth();

  const inventoryEnabled = features?.has_inventory === true;
  const waiterEnabled    = features?.has_waiter    === true;

  // ── State ──────────────────────────────────────────────────────────────────
  const [branchName,          setBranchName]          = useState("Loading branch...");
  const [branchId,            setBranchId]            = useState(null);
  const [products,            setProducts]            = useState([]);
  const [cart,                setCart]                = useState([]);
  const [searchTerm,          setSearchTerm]          = useState("");
  const [selectedCategory,    setSelectedCategory]    = useState("All Items");
  const [loading,             setLoading]             = useState(true);
  const [submitting,          setSubmitting]          = useState(false);
  const [error,               setError]               = useState("");
  const [stockErrorModal,     setStockErrorModal]     = useState(null);
  const [paymentMethod,       setPaymentMethod]       = useState("Cash");
  const [orderType,           setOrderType]           = useState("takeaway");
  const [allergies,           setAllergies]           = useState("");
  const [addons,              setAddons]              = useState("");
  const [addonsPrice,         setAddonsPrice]         = useState("");
  const [notes,               setNotes]               = useState("");
  const [discountPct,         setDiscountPct]         = useState(0);
  const [serviceFee,          setServiceFee]          = useState(0);
  const [showNewProductToast, setShowNewProductToast] = useState(false);
  const [newProductName,      setNewProductName]      = useState("");

  const [heldOrders,           setHeldOrders]           = useState([]);
  const [showHeldOrdersModal,  setShowHeldOrdersModal]  = useState(false);
  const [editingOrderId,       setEditingOrderId]       = useState(null);
  const [editingOrderStatus,   setEditingOrderStatus]   = useState(null);
  const [editingOrderTableId,  setEditingOrderTableId]  = useState(null);

  const [waiterOrders,          setWaiterOrders]          = useState([]);
  const [showWaiterOrdersModal, setShowWaiterOrdersModal] = useState(false);
  const [loadingWaiterOrders,   setLoadingWaiterOrders]   = useState(false);
  const [orderReadyAlerts,      setOrderReadyAlerts]      = useState([]);
  const [payhereModal,          setPayhereModal]          = useState(null);

  // Persistent product notifications
  const [productNotifications, setProductNotifications] = useState(() => {
    const userId = user?.u_id;
    if (!userId) return [];
    const saved = sessionStorage.getItem(`productNotifications_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now    = new Date();
        const valid  = parsed.filter(n => (now - new Date(n.timestamp)) / 60000 < 60);
        if (valid.length) return valid;
        sessionStorage.removeItem(`productNotifications_${userId}`);
      } catch { sessionStorage.removeItem(`productNotifications_${userId}`); }
    }
    return [];
  });

  // ── Persist product notifications ──────────────────────────────────────────
  useEffect(() => {
    const userId = user?.u_id;
    if (!userId) return;
    if (productNotifications.length > 0) {
      sessionStorage.setItem(`productNotifications_${userId}`, JSON.stringify(productNotifications));
    } else {
      sessionStorage.removeItem(`productNotifications_${userId}`);
    }
  }, [productNotifications, user?.u_id]);

  const dismissProductNotification = (id) =>
    setProductNotifications(prev => prev.filter(n => n.id !== id));

  // ── Waiter orders ──────────────────────────────────────────────────────────
  const fetchWaiterOrders = async () => {
    try {
      setLoadingWaiterOrders(true);
      const all = await getOrders(branchId ? { b_id: branchId } : {});
      setWaiterOrders(
        all.filter(
          o => o.or_type === "dine-in" &&
               o.or_status !== "cancelled" &&
               (!branchId || String(o.b_id) === String(branchId))
        )
      );
    } catch (err) {
      console.error("Failed to fetch waiter orders", err);
    } finally {
      setLoadingWaiterOrders(false);
    }
  };

  const handleOpenWaiterOrders = () => {
    fetchWaiterOrders();
    setShowWaiterOrdersModal(true);
  };

  // ── Load POS data ──────────────────────────────────────────────────────────
  const loadPosData = async () => {
    try {
      setLoading(true);
      setError("");
      const branchIdValue = user?.b_id ?? user?.B_id ?? null;
      if (!branchIdValue) {
        setError("No branch is assigned to your account.");
        return;
      }
      const branch = await getBranchById(branchIdValue);
      setBranchId(branchIdValue);
      setBranchName(branch?.B_name ?? branch?.data?.B_name ?? "Selected branch");
      setProducts(await getBranchProducts(branchIdValue));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load POS data");
    } finally {
      setLoading(false);
    }
  };

  // ── Socket: real-time product updates ─────────────────────────────────────
  useEffect(() => {
    if (!branchId) return;
    const socket = getSocket();
    if (!socket.connected) connectSocket();
    joinBranchInventoryRoom(branchId);

    const pushNotif = (productName, message) => {
      setNewProductName(productName);
      setShowNewProductToast(true);
      setTimeout(() => setShowNewProductToast(false), 5000);
      setProductNotifications(prev => {
        const dup = prev.find(n => n.productName === productName && (new Date() - new Date(n.timestamp)) < 5000);
        if (dup) return prev;
        return [...prev, { id: Date.now() + Math.random(), type: "product_added", message, timestamp: new Date().toISOString(), productName }];
      });
    };

    const unsubscribe = subscribeToBranchProductUpdates(branchId, {
      onBranchProductAdded: (data) => {
        if (data.branch_id && String(data.branch_id) !== String(branchId)) return;
        const p = data.branch_product || data.product || data;
        setProducts(prev => {
          if (prev.some(x => x.pro_id === p.pro_id)) return prev.map(x => x.pro_id === p.pro_id ? { ...x, ...p } : x);
          pushNotif(p.pro_name || "New Product", `📦 New product added: "${p.pro_name || "New Product"}"`);
          return [p, ...prev];
        });
      },
      onBranchProductUpdated: (data) => {
        const p = data.branch_product || data.product || data;
        setProducts(prev => prev.map(x => x.Bpro_id === p.Bpro_id ? { ...x, ...p } : x));
      },
      onBranchProductDeleted: (data) => {
        const deletedId = data.Bpro_id || data.branch_product?.Bpro_id;
        setProducts(prev => prev.filter(x => x.Bpro_id !== deletedId));
        setCart(prev => prev.filter(x => x.Bpro_id !== deletedId));
      },
    });

    const handleCompanyProduct = (data) => {
      if (data.product && !data.branch_id) {
        setProducts(prev => {
          if (prev.some(x => x.pro_id === data.product.pro_id)) return prev;
          const bp = { ...data.product, Bpro_id: data.product.pro_id, branch_id: branchId, pro_quantity: data.product.pro_qty || 0 };
          pushNotif(data.product.pro_name || "New Product", `📦 New product available: "${data.product.pro_name || "New Product"}"`);
          return [bp, ...prev];
        });
      }
    };

    const socketInstance = getSocket();
    socketInstance.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleCompanyProduct);
    return () => {
      unsubscribe();
      socketInstance?.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleCompanyProduct);
      leaveBranchInventoryRoom(branchId);
    };
  }, [branchId]);

  useEffect(() => { loadPosData(); }, [user?.b_id, user?.B_id]);

  // ── Socket: order ready / rejected ────────────────────────────────────────
  useEffect(() => {
    if (!user?.u_id) { setOrderReadyAlerts([]); return; }
    setOrderReadyAlerts(loadOrderReadyAlerts(user.u_id));
  }, [user?.u_id]);

  useEffect(() => {
    const socket = connectSocket();
    const guard  = o => o && !(user?.u_id && o.u_id && Number(o.u_id) !== Number(user.u_id));
    const handleReady = o => {
      if (!guard(o)) return;
      setOrderReadyAlerts(cur => { const n = addOrderReadyAlert(cur, o); saveOrderReadyAlerts(user?.u_id, n); return n; });
    };
    const handleRejected = o => {
      if (!guard(o)) return;
      setOrderReadyAlerts(cur => { const n = addOrderRejectedAlert(cur, o); saveOrderReadyAlerts(user?.u_id, n); return n; });
    };
    socket.on("order:ready",    handleReady);
    socket.on("order:rejected", handleRejected);
    return () => { socket.off("order:ready", handleReady); socket.off("order:rejected", handleRejected); };
  }, [user?.u_id]);

  const handleDismissOrderReady = useCallback(orderId => {
    setOrderReadyAlerts(cur => { const n = dismissOrderReadyAlert(cur, orderId); saveOrderReadyAlerts(user?.u_id, n); return n; });
  }, [user?.u_id]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(p => {
      const name  = String(p.pro_name ?? "").toLowerCase();
      const desc  = String(p.pro_des  ?? "").toLowerCase();
      const short = String(p.pro_shortname ?? "").toLowerCase();
      if (term && ![name, desc, short].some(v => v.includes(term))) return false;
      if (selectedCategory === "All Items") return true;
      const src = `${name} ${desc}`;
      const cat = src.includes("bar") || src.includes("beer") || src.includes("wine") || src.includes("whiskey") || src.includes("cocktail") ? "Bar"
        : src.includes("room") || src.includes("suite") || src.includes("laundry") || src.includes("checkout") || src.includes("parking") ? "Room Service"
        : src.includes("coffee") || src.includes("steak") || src.includes("salad") || src.includes("pasta") || src.includes("sandwich") || src.includes("breakfast") || src.includes("seafood") ? "Restaurant"
        : "Front Desk";
      return cat === selectedCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // ── Cart calculations ──────────────────────────────────────────────────────
  const subtotal      = useMemo(() => cart.reduce((s, i) => s + Number(i.unitPrice) * i.qty, 0), [cart]);
  const taxRate       = 10;
  const discountAmt   = subtotal * (Number(discountPct || 0) / 100);
  const taxableBase   = subtotal - discountAmt + Number(serviceFee || 0) + Number(addonsPrice || 0);
  const tax           = taxableBase * (taxRate / 100);
  const total         = taxableBase + tax;
  const totalQty      = cart.reduce((s, i) => s + i.qty, 0);

  // ── Cart actions ───────────────────────────────────────────────────────────
  const addToCart = product => {
    const unitPrice = Number(product.pro_price ?? 0);
    setCart(cur => {
      const existing = cur.find(i => i.Bpro_id === product.Bpro_id);
      return existing
        ? cur.map(i => i.Bpro_id === product.Bpro_id ? { ...i, qty: i.qty + 1 } : i)
        : [...cur, { Bpro_id: product.Bpro_id, pro_name: product.pro_name, unitPrice, qty: 1 }];
    });
  };

  const updateQuantity = (Bpro_id, delta) =>
    setCart(cur => cur.map(i => i.Bpro_id === Bpro_id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));

  const removeFromCart = Bpro_id =>
    setCart(cur => cur.filter(i => i.Bpro_id !== Bpro_id));

  // ── Invoice state builder ──────────────────────────────────────────────────
  const buildInvoiceState = (orderId, invoiceItems) => ({
    orderId,
    cashierName: `${user?.u_fname || "Cashier"} ${user?.u_lname || ""}`.trim(),
    branchName,
    branchLabel: `${branchName.split(" ")[0] || branchName}\nBranch`,
    paymentMethod,
    items: invoiceItems,
    subtotal:     Number(subtotal.toFixed(2)),
    discount:     Number(discountPct || 0),
    serviceFee:   Number(serviceFee  || 0),
    allergies,
    addons,
    addonsPrice:  Number(addonsPrice || 0),
    notes,
    tax:   Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  });

  const handlePayHereSuccess = invoiceState => {
    setPayhereModal(null);
    setCart([]);
    setEditingOrderId(null);
    navigate("/cashier/invoice-preview", { state: invoiceState });
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!cart.length || !user?.u_id) return;
    if (!branchId) { setError("No branch is assigned to this user."); return; }
    if (orderType === "dine-in" && features?.has_waiter) {
      setError("Dine-in orders require table selection. Please use takeaway for now.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");

      const stockResult = await checkOrderStock(cart.map(i => ({ Bpro_id: i.Bpro_id, pro_quantity: i.qty })));
      if (!stockResult.success) { setStockErrorModal({ shortages: stockResult.shortages }); return; }

      let orderId = editingOrderId;
      const socket = getSocket();

      if (editingOrderId) {
        await updateOrder(editingOrderId, {
          or_tax: taxRate, or_totalcost: Number(taxableBase.toFixed(2)),
          or_totalCostWtax: Number(total.toFixed(2)),
          or_status: paymentMethod === "PayHere" ? "pending" : "completed",
          or_type: orderType, cust_id: null, u_id: user.u_id, b_id: branchId,
          table_id: null, or_notes: notes, or_addons: addons,
          or_addons_price: Number(addonsPrice || 0), or_allergies: allergies,
        });
        const existing = await getOrderItemsByOrderId(editingOrderId);
        if (existing?.length) await Promise.all(existing.map(i => deleteOrderItem(i.orderItem_id)));
        socket?.connected && socket.emit("order:updated", { or_id: editingOrderId, b_id: branchId, status: "completed" });
      } else {
        const res = await createOrder({
          or_tax: taxRate, or_totalcost: Number(taxableBase.toFixed(2)),
          or_totalCostWtax: Number(total.toFixed(2)), or_status: "pending",
          or_type: orderType, cust_id: null, u_id: user.u_id, b_id: branchId,
          table_id: null, or_notes: notes, or_addons: addons,
          or_addons_price: Number(addonsPrice || 0), or_allergies: allergies,
        });
        orderId = res?.data?.or_id;
        if (!orderId) throw new Error("Order was created but no order id was returned");
        socket?.connected && socket.emit("order:created", { or_id: orderId, b_id: branchId, or_type: orderType, or_status: "pending", u_id: user.u_id });
      }

      await Promise.all(cart.map(i => createOrderItem({ Bpro_id: i.Bpro_id, pro_quantity: i.qty, unit_price: i.unitPrice, order_id: orderId })));

      const invoiceItems = cart.map(i => ({ Bpro_id: i.Bpro_id, pro_name: i.pro_name, unitPrice: i.unitPrice, qty: i.qty, total: Number((i.unitPrice * i.qty).toFixed(2)) }));

      if (paymentMethod === "PayHere") {
        const res = await initiatePayHerePayment({ order_id: orderId, amount: total.toFixed(2), order_description: `Order #${orderId} — ${branchName}`, cashier_uid: user.u_id });
        if (!res?.payment_url) throw new Error("Failed to generate PayHere payment URL");
        setPayhereModal({ paymentUrl: res.payment_url, orderId, invoiceState: buildInvoiceState(orderId, invoiceItems) });
        return;
      }

      setCart([]);
      setEditingOrderId(null);
      setEditingOrderTableId(null);
      navigate("/cashier/invoice-preview", { state: buildInvoiceState(orderId, invoiceItems) });
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit waiter order ──────────────────────────────────────────────────────
  const handleEditWaiterOrder = async ao => {
    try {
      setLoadingWaiterOrders(true);
      const items = await getOrderItemsByOrderId(ao.or_id);
      setCart(items.map(i => ({ Bpro_id: i.Bpro_id, pro_name: i.pro_name, unitPrice: Number(i.unit_price || i.branch_price || 0), qty: Number(i.pro_quantity || 1) })));
      setOrderType(ao.or_type || "takeaway");
      setNotes(ao.or_notes || "");
      setAddons(ao.or_addons || "");
      setAddonsPrice(ao.or_addons_price || "");
      setAllergies(ao.or_allergies || "");
      setEditingOrderId(ao.or_id);
      setEditingOrderStatus(ao.or_status);
      setEditingOrderTableId(ao.table_id || null);
      setShowWaiterOrdersModal(false);
    } catch (e) {
      alert("Failed to load order for editing: " + e.message);
    } finally {
      setLoadingWaiterOrders(false);
    }
  };

  // ── Update order ───────────────────────────────────────────────────────────
  const handleUpdateOrder = async () => {
    if (!cart.length || !editingOrderId) return;
    try {
      setSubmitting(true);
      setError("");
      const stockResult = await checkOrderStock(cart.map(i => ({ Bpro_id: i.Bpro_id, pro_quantity: i.qty })));
      if (!stockResult.success) { setStockErrorModal({ shortages: stockResult.shortages }); return; }
      await updateOrder(editingOrderId, {
        table_id: editingOrderTableId, or_tax: taxRate,
        or_totalcost: Number(taxableBase.toFixed(2)), or_totalCostWtax: Number(total.toFixed(2)),
        or_notes: notes?.trim() || "", or_addons: addons?.trim() || "", or_allergies: allergies?.trim() || "",
        items: cart.map(i => ({ Bpro_id: i.Bpro_id, qty: i.qty, unit_price: i.unitPrice })),
      });
      setCart([]); setNotes(""); setAddons(""); setAllergies("");
      setEditingOrderId(null); setEditingOrderTableId(null); setSearchTerm("");
      fetchWaiterOrders();
    } catch (e) {
      setError("Failed to update order: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Hold / resume ──────────────────────────────────────────────────────────
  const handleHoldOrder = () => {
    if (!cart.length) return;
    setHeldOrders(prev => [...prev, { id: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), cart: [...cart], paymentMethod, orderType, allergies, addons, addonsPrice, notes, discountPct, serviceFee }]);
    setCart([]); setPaymentMethod("Cash"); setOrderType("takeaway");
    setAllergies(""); setAddons(""); setAddonsPrice(""); setNotes(""); setDiscountPct(0); setServiceFee(0);
  };

  const handleResumeOrder = holdId => {
    const ho = heldOrders.find(o => o.id === holdId);
    if (!ho) return;
    if (cart.length) handleHoldOrder();
    setCart(ho.cart); setPaymentMethod(ho.paymentMethod); setOrderType(ho.orderType);
    setAllergies(ho.allergies || ""); setAddons(ho.addons || "");
    setAddonsPrice(ho.addonsPrice || ""); setNotes(ho.notes || "");
    setDiscountPct(ho.discountPct || 0); setServiceFee(ho.serviceFee || 0);
    setHeldOrders(prev => prev.filter(o => o.id !== holdId));
    setShowHeldOrdersModal(false);
  };

  const handleRemoveHeldOrder = holdId => setHeldOrders(prev => prev.filter(o => o.id !== holdId));

  const logoutAndNavigate = () => logout();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F3F7FB] text-slate-900">
      <OrderReadyAlerts alerts={orderReadyAlerts} onDismiss={handleDismissOrderReady} />

      {/* ── Product notifications ───────────────────────────────────────── */}
      {productNotifications.length > 0 && (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 max-w-sm">
          {productNotifications.map(n => (
            <div key={n.id} className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 shadow-lg">
              <p className="font-space text-sm font-semibold text-slate-800 mb-1">📢 New Product Available</p>
              <p className="font-inter text-xs text-slate-600">{n.message}</p>
              <p className="font-inter text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
              <button onClick={() => dismissProductNotification(n.id)} className="mt-2 rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 transition">OK</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-white/20">
              <img src={posIcon} alt="Hotel POS" className="w-7 h-7 object-contain" />
            </div>
            <div className="leading-tight">
              <div className="font-space text-[17px] font-semibold">Hotel POS</div>
              <div className="font-inter text-[12px] text-white/80">Point of Sale System</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <button onClick={() => setShowHeldOrdersModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25">
              Held Orders ({heldOrders.length})
            </button>
            {waiterEnabled && (
              <button onClick={handleOpenWaiterOrders}
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25">
                Waiter Orders ({waiterOrders.length})
              </button>
            )}
            <button onClick={() => navigate("/cashier/pos")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0A5BAE] shadow-sm">
              <FaShoppingCart className="h-3.5 w-3.5" /> POS
            </button>
            <button onClick={() => navigate("/cashier/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25">
              <span className="text-base">▦</span> Dashboard
            </button>
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/15 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0A5BAE]">
                <FaUserCircle className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="font-space text-[12px] font-semibold leading-none">
                  {user?.u_fname || "Cashier"} {user?.u_lname || ""}
                </div>
                <div className="font-inter mt-0.5 text-[11px] text-white/80">{branchName}</div>
              </div>
            </div>
            <button onClick={logoutAndNavigate}
              className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80 transition">
              <FaSignOutAlt className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">

        {/* Page title */}
        <div className="mb-5">
          <h1 className="font-space text-2xl font-bold text-slate-900 sm:text-[28px]">Point of Sale</h1>
          <div className="font-inter mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <span className="text-red-400 text-base">📍</span>
            <span>{branchName}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-inter text-sm text-rose-700">{error}</div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* ── LEFT: Products ─────────────────────────────────────────────── */}
          <section className="space-y-4">

            {/* Search + categories */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
              {/* Search bar */}
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="font-inter h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {/* Category tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.map(({ label, icon }) => (
                  <CategoryTab
                    key={label}
                    label={label}
                    icon={icon}
                    active={selectedCategory === label}
                    onClick={() => setSelectedCategory(label)}
                  />
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
              {loading ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center font-inter text-sm text-slate-500">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center font-inter text-sm text-slate-500">
                  No products match your search.
                </div>
              ) : (
                filteredProducts.map((product, idx) => (
                  <ProductCard
                    key={product.Bpro_id ?? idx}
                    product={product}
                    onAdd={addToCart}
                  />
                ))
              )}
            </div>
          </section>

          {/* ── RIGHT: Shopping cart ────────────────────────────────────────── */}
          <aside className="h-fit rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200/60">

            {/* Cart header */}
            <div className="flex items-center justify-between gap-3 bg-[#0D2236] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <FaShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-space text-base font-semibold">Shopping Cart</h2>
                  <p className="font-inter text-xs text-white/70">
                    {totalQty} {totalQty === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <button onClick={() => setCart([])}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition">
                <FaTrashAlt className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white p-4 space-y-4">

              {/* Cart items */}
              {cart.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center font-inter text-sm text-slate-500">
                  Add products from the left panel to build the order.
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <CartItem
                      key={item.Bpro_id}
                      item={item}
                      onRemove={removeFromCart}
                      onChangeQty={updateQuantity}
                    />
                  ))}
                </div>
              )}

              {/* Extra inputs */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <input
                  type="text" value={allergies} onChange={e => setAllergies(e.target.value)}
                  placeholder="Allergies / Dietary (e.g., Nuts, Gluten)"
                  className="font-inter h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text" value={addons} onChange={e => setAddons(e.target.value)}
                    placeholder="Add Ons (e.g., Extra cheese)"
                    className="font-inter h-9 w-2/3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                  />
                  <input
                    type="number" value={addonsPrice} onChange={e => setAddonsPrice(e.target.value)}
                    placeholder="Price"
                    className="font-inter h-9 w-1/3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                  />
                </div>
                <input
                  type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (special requests)"
                  className="font-inter h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                />
              </div>

              {/* Subtotal / Tax / Total */}
              <div className="space-y-2">
                <div className="flex justify-between font-inter text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-700">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-inter text-sm text-slate-500">
                  <span>Tax (10%)</span>
                  <span className="font-semibold text-slate-700">${tax.toFixed(2)}</span>
                </div>
                <div className="my-1 h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <span className="font-space text-base font-bold text-slate-900">Total</span>
                  <span className="font-space text-xl font-bold text-slate-900">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Order Type — reusable SelectionGroup */}
              <SelectionGroup
                label="Order Type"
                options={ORDER_TYPE_OPTIONS}
                value={orderType}
                onChange={setOrderType}
                cols={2}
              />

              {/* Payment Method — reusable SelectionGroup */}
              <SelectionGroup
                label="Payment Method"
                options={PAYMENT_OPTIONS}
                value={paymentMethod}
                onChange={setPaymentMethod}
                cols={3}
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleHoldOrder}
                  disabled={submitting || cart.length === 0}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hold Order
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0 || !branchId}
                  className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2BB5A0] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24a08c] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <FaShoppingCart className="h-4 w-4" />
                  {submitting ? "Processing..." : "Checkout"}
                </button>
              </div>

              {/* Update / Cancel Edit (waiter orders) */}
              {editingOrderId && editingOrderStatus !== "completed" && (
                <div className="flex gap-2">
                  <button onClick={handleUpdateOrder} disabled={submitting || !cart.length}
                    className="flex-1 rounded-xl bg-[#0A5BAE] py-3 text-sm font-bold text-white hover:bg-[#08498d] disabled:opacity-50 transition">
                    Update Order
                  </button>
                  <button
                    onClick={() => { setEditingOrderId(null); setEditingOrderStatus(null); setEditingOrderTableId(null); setCart([]); setNotes(""); setAddons(""); setAllergies(""); }}
                    className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-300 transition">
                    Cancel Edit
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ── Held Orders Modal ────────────────────────────────────────────────── */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 border-b pb-4">
              <h2 className="font-space text-xl font-bold text-slate-800">Held Orders ({heldOrders.length})</h2>
              <button onClick={() => setShowHeldOrdersModal(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              {heldOrders.length === 0 ? (
                <p className="font-inter py-6 text-center text-slate-500">No held orders available.</p>
              ) : heldOrders.map(ho => (
                <div key={ho.id} className="flex justify-between items-center rounded-xl border p-4 hover:shadow-md transition">
                  <div>
                    <p className="font-space font-semibold text-slate-800">Order at {ho.timestamp}</p>
                    <p className="font-inter text-sm text-slate-500">{ho.cart.length} items • {ho.orderType} • {ho.paymentMethod}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRemoveHeldOrder(ho.id)} className="rounded-lg bg-red-50 text-red-500 px-3 py-2 text-sm font-medium hover:bg-red-100">Remove</button>
                    <button onClick={() => handleResumeOrder(ho.id)} className="rounded-lg bg-[#0A5BAE] text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">Resume</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Waiter Orders Modal ──────────────────────────────────────────────── */}
      {waiterEnabled && showWaiterOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 border-b pb-4">
              <h2 className="font-space text-xl font-bold text-slate-800">Waiter Orders ({waiterOrders.length})</h2>
              <div className="flex gap-2">
                <button onClick={fetchWaiterOrders} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">Refresh</button>
                <button onClick={() => setShowWaiterOrdersModal(false)} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">✕</button>
              </div>
            </div>
            {loadingWaiterOrders ? (
              <div className="flex flex-col items-center py-10 gap-3 opacity-60">
                <FaSpinner className="h-8 w-8 animate-spin text-[#0A5BAE]" />
                <p className="font-inter text-sm text-slate-500">Loading orders...</p>
              </div>
            ) : waiterOrders.length === 0 ? (
              <p className="font-inter py-6 text-center text-slate-500">No waiter orders available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiterOrders.map(ao => (
                  <div key={ao.or_id} className="flex flex-col justify-between rounded-xl border p-4 shadow-sm hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-space font-semibold text-slate-800 text-lg">Order #{ao.or_id}</p>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${ao.or_status === "pending" ? "bg-yellow-100 text-yellow-700" : ao.or_status === "sent_to_kitchen" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"}`}>
                          {ao.or_status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="font-inter text-sm text-slate-500 space-y-1">
                        <p><strong>Table:</strong> {ao.table_id || "Takeaway"}</p>
                        <p><strong>Type:</strong> {ao.or_type}</p>
                        <p><strong>Total:</strong> ${Number(ao.or_totalCostWtax || ao.or_totalcost || 0).toFixed(2)}</p>
                        {ao.or_notes && <p className="text-xs italic text-red-500 line-clamp-2">{ao.or_notes}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleEditWaiterOrder(ao)} disabled={loadingWaiterOrders}
                      className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${ao.or_status === "completed" ? "bg-[#2BB5A0] text-white hover:bg-[#24a08c]" : "border border-[#0A5BAE] text-[#0A5BAE] hover:bg-[#0A5BAE] hover:text-white"}`}>
                      {ao.or_status === "completed" ? "Bill Order" : "Edit Order"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Insufficient Stock Modal ─────────────────────────────────────────── */}
      {stockErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">!</div>
              <h2 className="font-space text-lg font-bold text-slate-800">Insufficient Stock</h2>
            </div>
            <p className="font-inter text-sm text-slate-600 mb-3">This order cannot be placed. The following ingredients don't have enough stock:</p>
            <ul className="space-y-2 mb-5">
              {stockErrorModal.shortages.map((s, idx) => (
                <li key={idx} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-inter text-sm text-rose-700">
                  <span className="font-semibold">{s.ingredient}</span> — needs {s.required}{s.unit}, only {s.available}{s.unit} available
                </li>
              ))}
            </ul>
            <button onClick={() => setStockErrorModal(null)} className="w-full rounded-xl bg-[#0A5BAE] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">OK</button>
          </div>
        </div>
      )}

      {/* ── New product toast ────────────────────────────────────────────────── */}
      {showNewProductToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 rounded-xl bg-[#0A5BAE] px-6 py-4 text-white shadow-2xl animate-bounce-in">
          <FaBell className="h-5 w-5 shrink-0" />
          <span className="font-inter text-sm font-medium">New product "{newProductName}" is now available!</span>
        </div>
      )}

      {/* ── PayHere QR modal ─────────────────────────────────────────────────── */}
      {payhereModal && (
        <PayHereQRModal
          paymentUrl={payhereModal.paymentUrl}
          orderId={payhereModal.orderId}
          onSuccess={() => handlePayHereSuccess(payhereModal.invoiceState)}
          onCancel={() => { setPayhereModal(null); setSubmitting(false); }}
        />
      )}
    </div>
  );
};

export default CashierPos;