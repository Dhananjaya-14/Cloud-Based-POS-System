import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBed,
  FaCalculator,
  FaCoffee,
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
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import {
  createOrder,
  createOrderItem,
  getBranches,
  getBranchProducts,
} from "../../services/api";

const categories = [
  { label: "All Items", icon: FaStore, active: true },
  { label: "Bar", icon: FaWineGlassAlt },
  { label: "Restaurant", icon: FaUtensils },
  { label: "Room Service", icon: FaBed },
  { label: "Front Desk", icon: FaDesktop },
];

const CashierPos = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [branchName, setBranchName] = useState("Loading branch...");
  const [branchId, setBranchId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [orderType, setOrderType] = useState("takeaway");
  const [allergies, setAllergies] = useState("");
  const [addons, setAddons] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);

  useEffect(() => {
    const loadPosData = async () => {
      try {
        setLoading(true);
        setError("");

        const [branchList, branchProductList] = await Promise.all([
          getBranches(),
          getBranchProducts(),
        ]);

        const matchedBranch =
          branchList.find((branch) => String(branch.U_id) === String(user?.u_id)) ??
          branchList[0];

        setBranchId(matchedBranch?.B_id ?? null);
        setBranchName(matchedBranch?.B_name ?? "Selected branch");
        setProducts(branchProductList);
      } catch (loadError) {
        setError(
          loadError?.response?.data?.message ||
            loadError.message ||
            "Failed to load POS data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadPosData();
  }, [user?.u_id]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.pro_name ?? "").toLowerCase();
      const description = String(product.pro_des ?? "").toLowerCase();
      const shortName = String(product.pro_shortname ?? "").toLowerCase();

      const matchesSearch =
        !term || [name, description, shortName].some((value) => value.includes(term));

      const categoryName = (() => {
        const source = `${name} ${description}`;
        if (
          source.includes("bar") ||
          source.includes("beer") ||
          source.includes("wine") ||
          source.includes("whiskey") ||
          source.includes("cocktail")
        ) {
          return "Bar";
        }
        if (
          source.includes("room") ||
          source.includes("suite") ||
          source.includes("laundry") ||
          source.includes("checkout") ||
          source.includes("parking")
        ) {
          return "Room Service";
        }
        if (
          source.includes("coffee") ||
          source.includes("steak") ||
          source.includes("salad") ||
          source.includes("pasta") ||
          source.includes("sandwich") ||
          source.includes("breakfast") ||
          source.includes("seafood")
        ) {
          return "Restaurant";
        }
        return "Front Desk";
      })();

      const matchesCategory =
        selectedCategory === "All Items" || categoryName === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0),
    [cart],
  );
  const taxRate = 10;
  const discountAmount = subtotal * (Number(discountPct || 0) / 100);
  const taxableBase = subtotal - discountAmount + Number(serviceFee || 0);
  const tax = taxableBase * (taxRate / 100);
  const total = taxableBase + tax;

  const addToCart = (product) => {
    const unitPrice = Number(product.pro_price ?? 0);

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.Bpro_id === product.Bpro_id);
      if (existing) {
        return currentCart.map((item) =>
          item.Bpro_id === product.Bpro_id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          Bpro_id: product.Bpro_id,
          pro_name: product.pro_name,
          unitPrice,
          qty: 1,
        },
      ];
    });
  };

  const updateQuantity = (Bpro_id, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.Bpro_id === Bpro_id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (Bpro_id) => {
    setCart((currentCart) => currentCart.filter((item) => item.Bpro_id !== Bpro_id));
  };

  const handleCheckout = async () => {
    if (!cart.length || !user?.u_id) {
      return;
    }

    if (!branchId) {
      setError("No branch is assigned to this user.");
      return;
    }
    if (orderType === "dine-in") {
      setError("Dine-in orders require table selection. Please use takeaway for now.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const orderResponse = await createOrder({
        or_tax: taxRate,
        or_totalcost: Number(taxableBase.toFixed(2)),
        or_totalCostWtax: Number(total.toFixed(2)),
        or_status: "pending",
        or_type: orderType,
        cust_id: null,
        u_id: user.u_id,
        b_id: branchId,
        table_id: null,
        or_discount_pct: Number(discountPct || 0),
        or_service_fee: Number(serviceFee || 0),
        or_notes: notes || undefined,
      });

      const orderId = orderResponse?.data?.or_id;
      if (!orderId) {
        throw new Error("Order was created but no order id was returned");
      }

      await Promise.all(
        cart.map((item) =>
          createOrderItem({
            Bpro_id: item.Bpro_id,
            pro_quantity: item.qty,
            unit_price: item.unitPrice,
            order_id: orderId,
          }),
        ),
      );

      const invoiceItems = cart.map((item) => ({
        Bpro_id: item.Bpro_id,
        pro_name: item.pro_name,
        unitPrice: item.unitPrice,
        qty: item.qty,
        total: Number((item.unitPrice * item.qty).toFixed(2)),
      }));

      setCart([]);
      navigate("/cashier/invoice-preview", {
        state: {
          orderId,
          cashierName: `${user?.u_fname || "Cashier"} ${user?.u_lname || ""}`.trim(),
          branchName,
          branchLabel: `${branchName.split(" ")[0] || branchName}\nBranch`,
          paymentMethod,
          items: invoiceItems,
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discountPct || 0),
          serviceFee: Number(serviceFee || 0),
          allergies,
          addons,
          notes,
          tax: Number(tax.toFixed(2)),
          total: Number(total.toFixed(2)),
        },
      });
    } catch (checkoutError) {
      setError(
        checkoutError?.response?.data?.error ||
          checkoutError?.response?.data?.message ||
          checkoutError.message ||
          "Checkout failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const logoutAndNavigate = () => {
    logout();
  };

  const selectedProductCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen bg-[#F3F7FB] text-slate-900">
      <header className="border-b border-black/5 bg-linear-to-r from-[#094f96] via-[#0c87b1] to-[#50c164] text-white shadow-[0_10px_30px_rgba(2,8,23,0.15)]">
        <div className="mx-auto flex max-w-350 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white text-[#0A5BAE] shadow-sm">
              <FaStore className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-wide">Hotel POS</div>
              <div className="text-[11px] text-white/80">Point of Sale System</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => navigate("/cashier/pos")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0A5BAE] shadow-sm transition hover:-translate-y-px"
            >
              <FaShoppingCart className="h-3.5 w-3.5" />
              POS
            </button>
            <button
              onClick={() => navigate("/cashier/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              <span className="text-base">▦</span>
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* <div className="hidden rounded-xl bg-white/15 px-3 py-2 text-left sm:block">
              <div className="text-[11px] font-semibold leading-none">Samantha</div>
              <div className="mt-0.5 text-[11px] text-white/80">Cashier · Kandy</div>
            </div> */}

            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/15 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0A5BAE]">
                <FaUserCircle className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-semibold leading-none">
                  {user?.u_fname || "Cashier"} {user?.u_lname || ""}
                </div>
                <div className="mt-0.5 text-[11px] text-white/80">{branchName}</div>
              </div>
            </div>

            <button
              onClick={logoutAndNavigate}
              className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
            >
              <FaSignOutAlt className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-350 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">Point of Sale</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span className="text-slate-400">⌖</span>
            <span>{branchName}</span>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="space-y-5">
            <div className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 sm:p-5">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or description..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map(({ label, icon: Icon, active }) => (
                  <button
                    key={label}
                    onClick={() => setSelectedCategory(label)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      active && selectedCategory === label
                        ? "border-sky-500 bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] text-white shadow-md shadow-sky-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {loading ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Loading products from the backend...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No products match your search.
                </div>
              ) : (
                filteredProducts.map((product, index) => {
                  const Icon = (() => {
                    const source = `${product.pro_name ?? ""} ${product.pro_des ?? ""}`.toLowerCase();
                    if (source.includes("coffee")) return FaCoffee;
                    if (
                      source.includes("beer") ||
                      source.includes("wine") ||
                      source.includes("whiskey") ||
                      source.includes("cocktail")
                    ) {
                      return FaWineGlassAlt;
                    }
                    if (
                      source.includes("suite") ||
                      source.includes("laundry") ||
                      source.includes("parking") ||
                      source.includes("checkout") ||
                      source.includes("desk")
                    ) {
                      return FaDesktop;
                    }
                    if (
                      source.includes("breakfast") ||
                      source.includes("steak") ||
                      source.includes("salad") ||
                      source.includes("pasta") ||
                      source.includes("sandwich") ||
                      source.includes("seafood")
                    ) {
                      return FaUtensils;
                    }
                    return FaCalculator;
                  })();
                  const stockCount = Number(product.pro_quantity ?? 0);
                  const priceLabel = Number(product.pro_price ?? 0).toFixed(2);

                  return (
                    <article
                      key={product.Bpro_id ?? index}
                      onClick={() => addToCart(product)}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-14 w-full items-center justify-center rounded-xl bg-sky-50 text-[#0A5BAE]">
                          <Icon className="h-7 w-7" />
                        </div>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 text-[11px] font-semibold text-white shadow-sm">
                          {stockCount}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-slate-900">{product.pro_name}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {product.pro_des || product.pro_shortname || "Available now"}
                      </p>
                      <div className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                        ${priceLabel}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
            <div className="rounded-t-3xl bg-linear-to-r from-[#0A5BAE] to-[#19A4E5] px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <FaShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Shopping Cart</h2>
                    <p className="text-xs text-white/80">
                      {selectedProductCount} item{selectedProductCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCart([])}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                >
                  <FaTrashAlt className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Add products from the left panel to build the order.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.Bpro_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{item.pro_name}</h3>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.Bpro_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.Bpro_id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        >
                          <FaMinus className="h-3 w-3" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQuantity(item.Bpro_id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        >
                          <FaPlus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-lg font-semibold tracking-tight text-slate-900">
                        ${(item.unitPrice * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="grid gap-2">
                  <input
                    aria-label="allergies"
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Allergies / Dietary (e.g., Nuts, Gluten)"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                  />

                  <input
                    aria-label="addons"
                    type="text"
                    value={addons}
                    onChange={(e) => setAddons(e.target.value)}
                    placeholder="Add Ons (e.g., Extra cheese)"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                  />

                  <input
                    aria-label="notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (special requests)"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                  />

                  <div className="flex gap-2">
                    <input
                      aria-label="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(Number(e.target.value))}
                      placeholder="Discount %"
                      className="h-9 w-1/2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                    />
                    <input
                      aria-label="service-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(Number(e.target.value))}
                      placeholder="Service Fee"
                      className="h-9 w-1/2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Tax (10%)</span>
                  <span className="font-semibold text-slate-900">${tax.toFixed(2)}</span>
                </div>
                <div className="my-4 h-px bg-slate-200" />
                <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span className="text-2xl tracking-tight">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Order Type</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("takeaway")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
                      orderType === "takeaway"
                        ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                        : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    Takeaway
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("dine-in")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
                      orderType === "dine-in"
                        ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                        : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    Dine-in
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Payment Method</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
                      paymentMethod === "Cash"
                        ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                        : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${paymentMethod === "Cash" ? "bg-[#00B67A]" : "bg-slate-300"}`}
                    />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Card")}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
                      paymentMethod === "Card"
                        ? "border-[#55C24A] bg-white text-slate-900 ring-2 ring-emerald-100"
                        : "border-emerald-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${paymentMethod === "Card" ? "bg-[#00B67A]" : "bg-slate-300"}`}
                    />
                    Card
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0 || !branchId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#55C24A] px-5 py-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(85,194,74,0.28)] transition hover:bg-[#49b03f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <FaShoppingCart className="h-4 w-4" />
                {submitting ? "Processing..." : "Proceed to Checkout"}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default CashierPos;
