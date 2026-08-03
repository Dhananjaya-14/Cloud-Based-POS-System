import React, { useEffect, useMemo, useState } from "react";
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
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import {
  getWaiterProfile,
  getBranchProducts,
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
  const [error, setError] = useState("");
  
  // Tax calculations
  const [taxRate, setTaxRate] = useState(10);

  // My Orders state (for no-kitchen confirm delivery flow)
  const [myOrders, setMyOrders] = useState([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // "new" | "myorders"

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
  }, [user]);

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
    const isMadeToOrder = product.product_type === "made_to_order";
    const ignoreStock = isMadeToOrder;
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
    const isMadeToOrder = product?.product_type === "made_to_order";
    const ignoreStock = isMadeToOrder;
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

  const fetchMyOrders = async () => {
    try {
      setLoadingMyOrders(true);
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
      setLoadingMyOrders(false);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      setLoadingMyOrders(true);
      await updateOrderStatus(orderId, "completed");
      showToast("Order delivered successfully!", "success");
      await fetchMyOrders();
    } catch (err) {
      showToast("Failed to confirm delivery: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoadingMyOrders(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoadingMyOrders(true);
      await updateOrderStatus(orderId, "cancelled");
      showToast(`Order #${orderId} cancelled.`, "success");
      setMyOrders((prev) =>
        prev.filter((order) => order.or_id !== orderId)
      );
    } catch (err) {
      showToast("Failed to cancel order: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoadingMyOrders(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart.length) return;
    try {
      setSubmitting(true);
      setError("");

      // Create main waiter order
      const orderPayload = {
        or_tax: taxRate,
        or_totalcost: Number(taxableBase.toFixed(2)),
        or_totalCostWtax: Number(total.toFixed(2)),
      };

      const orderRes = await createWaiterOrder(orderPayload);
      if (!orderRes.success) throw new Error(orderRes.error || "Failed to create order");
      
      const orderId = orderRes.data.or_id || orderRes.data.order_id || orderRes.data.id; 

      if (!orderId) {
        throw new Error("Created order ID is missing");
      }

      // Add order items
      await Promise.all(
        cart.map((item) =>
          createOrderItem({
            Bpro_id: item.Bpro_id,
            pro_quantity: item.qty,
            unit_price: item.unitPrice,
            order_id: orderId,
          })
        )
      );

      setCart([]);
      showToast("Order placed successfully!", "success");
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
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
        <header className="border-b border-black/5 bg-gradient-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-[0_10px_30px_rgba(2,8,23,0.15)] flex-none">
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
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <main className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex h-[80px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
          {/* Categories */}
          <div className="no-scrollbar flex w-full max-w-[60%] flex-nowrap items-center gap-2 overflow-x-auto lg:max-w-[70%]">
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

          {/* Search */}
          <div className="relative flex w-full max-w-[280px] items-center shrink-0">
            <FaSearch className="absolute left-4 z-10 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-[#0A5BAE] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </header>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              {categories.find(c => String(c.cat_id) === String(selectedCategoryId))?.cat_name || "All Products"}
              <span className="ml-3 rounded-full bg-[#0A5BAE]/10 px-3 py-1 text-sm font-bold text-[#0A5BAE]">
                {filteredProducts.length} Items
              </span>
            </h1>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 pb-20 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredProducts.map((p) => {
                const price = Number(p.pro_price || p[" Pro_Price"] || p.Pro_Price || 0);
                return (
                  <div
                    key={p.Bpro_id}
                    onClick={() => addToCart(p)}
                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:border-[#0A5BAE]/30 hover:shadow-xl md:p-4"
                  >
                    <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-50">
                      {resolveProductImage(p.pro_image) ? (
                        <img
                          src={resolveProductImage(p.pro_image)}
                          alt={p.pro_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100/50">
                          <FaCoffee className="h-10 w-10 text-slate-300 transition-transform group-hover:scale-110 group-hover:text-[#0A5BAE]/40" />
                        </div>
                      )}
                    </div>
                    <div className="mt-auto">
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-slate-700">
                        {p.pro_name}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-base font-black text-[#55C24A]">
                          ${price.toFixed(2)}
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#0A5BAE] group-hover:text-white">
                          <FaPlus className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50">
              <div className="mb-4 rounded-full bg-slate-100 p-6 text-slate-300">
                <FaStore className="h-12 w-12" />
              </div>
              <p className="text-lg font-bold text-slate-500">No products found</p>
              <p className="mt-1 text-sm text-slate-400">
                Try adjusting your search or category filter.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Cart Sidebar */}
      <aside className="flex flex-col border-l border-slate-200 bg-white shrink-0 w-full sm:w-[320px] md:w-[350px] lg:w-[380px]">

        {/* Tab Header — only when kitchen is disabled */}
        {!kitchenEnabled ? (
          <div className="flex border-b border-slate-200 flex-none">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                activeTab === "new"
                  ? "border-b-2 border-[#0A5BAE] text-[#0A5BAE]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🛒 New Order
            </button>
            <button
              onClick={() => { setActiveTab("myorders"); fetchMyOrders(); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                activeTab === "myorders"
                  ? "border-b-2 border-[#55C24A] text-[#55C24A]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              📋 My Orders
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 flex-none">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">Order Summary</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FaClipboardList className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* New Order Tab */}
        {(kitchenEnabled || activeTab === "new") && (
          <>
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                    <FaShoppingCart className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Order is empty</p>
                  <p className="mt-1 text-xs text-slate-400">Add products from the menu to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.Bpro_id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-800">{item.pro_name}</h4>
                          <p className="mt-1 text-sm font-black text-[#0A5BAE]">${item.unitPrice.toFixed(2)}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.Bpro_id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white">
                          <FaTrashAlt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                        <p className="text-sm font-bold text-slate-700">${(item.unitPrice * item.qty).toFixed(2)}</p>
                        <div className="flex items-center gap-3 rounded-full bg-slate-100 p-1">
                          <button onClick={() => updateQuantity(item.Bpro_id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-200">
                            <FaMinus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-bold tabular-nums text-slate-800">{item.qty}</span>
                          <button onClick={() => updateQuantity(item.Bpro_id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A5BAE] text-white shadow-sm hover:bg-[#094f96]">
                            <FaPlus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Math & Checkout */}
            <div className="border-t border-slate-200 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 flex-none">
              <div className="space-y-3 border-b border-slate-100 pb-5 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800 tabular-nums">${taxableBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#0A5BAE]">
                  <span className="font-semibold">Tax ({taxRate}%)</span>
                  <span className="font-bold tabular-nums">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Items/Qty</span>
                  <span className="font-bold text-slate-800 tabular-nums">{cart.length} / {cart.reduce((s, i) => s + i.qty, 0)}</span>
                </div>
              </div>
              <div className="flex items-end justify-between py-5">
                <span className="text-sm font-black uppercase tracking-wider text-slate-400">Total</span>
                <span className="text-3xl font-black tracking-tight text-slate-800 tabular-nums">${total.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={submitting || cart.length === 0}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#55C24A] px-6 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(85,194,74,0.25)] transition-all hover:bg-[#49b03f] hover:shadow-[0_12px_32px_rgba(85,194,74,0.35)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              >
                <FaShoppingCart className="h-5 w-5" />
                {submitting ? "Placing Order..." : kitchenEnabled ? "Send to Kitchen" : "Place Order"}
              </button>
            </div>
          </>
        )}

        {/* My Orders Tab — only when kitchen disabled */}
        {!kitchenEnabled && activeTab === "myorders" && (
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-600">Active Orders</span>
              <button onClick={fetchMyOrders} disabled={loadingMyOrders} className="text-xs text-[#0A5BAE] font-semibold hover:underline disabled:opacity-50">
                {loadingMyOrders ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
            {loadingMyOrders ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">Loading...</div>
            ) : myOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center opacity-60 py-10">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <FaClipboardList className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600">No active orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <div key={order.or_id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-slate-800">Order #{order.or_id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                          order.or_status === "pending"   ? "bg-yellow-100 text-yellow-700" :
                          order.or_status === "preparing" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {order.or_status?.replace(/_/g, " ")}
                        </span>
                        <button
                          onClick={() => handleCancelOrder(order.or_id)}
                          disabled={loadingMyOrders}
                          title="Cancel Order"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-40"
                        >
                          <span className="text-xs font-bold">✕</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5 mb-3">
                      {order.table_id && <p><strong>Table:</strong> {order.table_id}</p>}
                      {order.items && order.items.length > 0 && (
                        <div className="py-1">
                          <p className="font-bold text-slate-600 mb-1">Items:</p>
                          <ul className="space-y-1">
                            {order.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between text-slate-500 font-semibold">
                                <span>{Number(item.pro_quantity || item.qty || 1)}x {item.pro_name}</span>
                                <span>${(Number(item.unit_price || item.branch_price || 0) * Number(item.pro_quantity || item.qty || 1)).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    <div
                      style={{marginTop: "12px",padding: "12px 16px",borderTop: "2px dashed #999",borderBottom: "2px dashed #999",display: "flex",justifyContent: "space-between",alignItems: "center",fontSize: "18px",fontWeight: "bold",color: "#0f172a",backgroundColor: "#f8fafc",}}
                    >
                      <span>TOTAL</span>
                      <span>Rs. {Number(order.or_totalCostWtax || order.or_totalcost || 0).toFixed(2)}</span>
                    </div>
                    </div>
                    {!kitchenEnabled && (
                      <button
                        onClick={() => handleConfirmDelivery(order.or_id)}
                        disabled={loadingMyOrders}
                        className="w-full rounded-xl bg-[#55C24A] text-white py-2.5 text-sm font-bold hover:bg-[#49b03f] transition disabled:opacity-50"
                      >
                        ✅ Confirm Delivery
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </aside>
        </div>
      </div>
    );
};

export default WaiterPos;
