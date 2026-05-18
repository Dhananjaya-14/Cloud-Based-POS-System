import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSignOutAlt,
  FaStore,
  FaRegBell,
  FaPlus,
  FaMinus,
  FaRegTimesCircle,
  FaCog,
  FaMapMarkerAlt,
  FaClock
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import {
  createOrder,
  createOrderItem,
  getBranches,
  getBranchProducts,
} from "../../services/api";

const categories = ["All", "Main Course", "Appetizer", "Beverage", "Dessert", "Bar"];

// Simple mapping for demo purposes to assign a placeholder image to products
const getProductImage = (name) => {
  const n = name.toLowerCase();
  if (n.includes("burger")) return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80";
  if (n.includes("pasta") || n.includes("creamy")) return "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=300&q=80";
  if (n.includes("pizza")) return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80";
  if (n.includes("salad")) return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80";
  if (n.includes("coffee") || n.includes("latte")) return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80";
  if (n.includes("beer") || n.includes("wine")) return "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=300&q=80";
  if (n.includes("steak")) return "https://images.unsplash.com/photo-1544025162-831fb2d02c52?auto=format&fit=crop&w=300&q=80";
  // Default food image
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80";
};

// Generate a random wait time for realism
const getWaitTime = (id) => {
  return [10, 15, 12, 18, 5, 20][(id || 0) % 6];
};

const WaiterPos = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [branchName, setBranchName] = useState("Loading...");
  const [branchId, setBranchId] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Table Selection State (Instead of the left-panel Table Layout grid)
  const [selectedTable, setSelectedTable] = useState("Table 3");
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  
  // Form fields
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

        const branchList = await getBranches();
        const matchedBranch = branchList.find((b) => String(b.U_id) === String(user?.u_id)) ?? branchList[0];
        
        const matchedBranchId = matchedBranch?.B_id ?? null;
        setBranchId(matchedBranchId);
        setBranchName(matchedBranch?.B_name ?? "Selected branch");

        const branchProductList = matchedBranchId ? await getBranchProducts(matchedBranchId) : [];
        setProducts(branchProductList);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadPosData();
  }, [user?.u_id]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const name = String(p.pro_name ?? "").toLowerCase();
      const desc = String(p.pro_des ?? "").toLowerCase();
      const matchesSearch = !term || name.includes(term) || desc.includes(term);

      const categoryName = (() => {
        const s = `${name} ${desc}`;
        if (s.includes("beer") || s.includes("wine") || s.includes("whiskey") || s.includes("cocktail")) return "Bar";
        if (s.includes("salad") || s.includes("soup") || s.includes("fries") || s.includes("wings")) return "Appetizer";
        if (s.includes("cake") || s.includes("ice cream") || s.includes("brownie") || s.includes("pudding")) return "Dessert";
        if (s.includes("coffee") || s.includes("tea") || s.includes("juice") || s.includes("water") || s.includes("cola")) return "Beverage";
        return "Main Course"; // Fallback
      })();

      const matchesCat = selectedCategory === "All" || categoryName === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.unitPrice) * item.qty, 0), [cart]);
  const taxRate = 10;
  const discountAmount = subtotal * (Number(discountPct || 0) / 100);
  const taxableBase = subtotal - discountAmount + Number(serviceFee || 0);
  const tax = taxableBase * (taxRate / 100);
  const total = taxableBase + tax;

  const addToCart = (product) => {
    const unitPrice = Number(product.pro_price ?? 0);
    setCart((curr) => {
      const existing = curr.find((i) => i.Bpro_id === product.Bpro_id);
      if (existing) {
        return curr.map((i) => (i.Bpro_id === product.Bpro_id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...curr, { Bpro_id: product.Bpro_id, pro_name: product.pro_name, unitPrice, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((curr) =>
      curr.map((i) => (i.Bpro_id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart((curr) => curr.filter((i) => i.Bpro_id !== id));

  const handleCheckout = async (status = "pending") => {
    if (!cart.length || !user?.u_id) return;
    if (!branchId) { setError("No branch assigned."); return; }

    try {
      setSubmitting(true);
      setError("");

      const res = await createOrder({
        or_tax: taxRate,
        or_totalcost: Number(taxableBase.toFixed(2)),
        or_totalCostWtax: Number(total.toFixed(2)),
        or_status: status, // pending, sent_to_kitchen, sent_to_bar
        or_type: "dine-in",
        cust_id: null,
        u_id: user.u_id,
        b_id: branchId,
        table_id: selectedTable.replace("Table ", ""), // simplistic parsing
        or_discount_pct: Number(discountPct || 0),
        or_service_fee: Number(serviceFee || 0),
        or_notes: `Allergies: ${allergies} | Addons: ${addons} | Notes: ${notes}`,
      });

      const orderId = res?.data?.or_id;
      if (!orderId) throw new Error("Order created but no ID returned");

      await Promise.all(
        cart.map((i) => createOrderItem({ Bpro_id: i.Bpro_id, pro_quantity: i.qty, unit_price: i.unitPrice, order_id: orderId }))
      );

      // Reset
      setCart([]);
      setAllergies("");
      setAddons("");
      setNotes("");
      setDiscountPct(0);
      setServiceFee(0);
      alert(`Order successfully created and marked as ${status}!`);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProductCount = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      {/* HEADER */}
      <header className="bg-linear-to-r from-[#0E85CD] via-[#109AAB] to-[#25B48B] text-white px-6 py-3 flex items-center justify-between shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl w-10 h-10 flex items-center justify-center text-[#0E85CD] shadow-sm">
            <FaStore className="text-xl" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide">Hotel POS</h1>
            <p className="text-xs text-white/80 font-medium">Point of Sale System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/20 rounded-full px-4 py-1.5 border border-white/20 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#109AAB] font-bold text-sm">
              {user?.u_fname?.[0] || "W"}
            </div>
            <div className="hidden sm:block">
              <div className="font-semibold text-sm leading-tight">{user?.u_fname || "Waiter"} {user?.u_lname || ""}</div>
              <div className="text-[11px] text-white/80">Waiter • {branchName}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT (2 COLUMNS) */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* LEFT: MENU COLUMN */}
        <section className="flex-1 flex flex-col bg-transparent overflow-hidden rounded-2xl">
          {/* Menu Header Area */}
          <div className="flex justify-between items-center mb-4 shrink-0 px-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Menu</h2>
              <p className="text-sm text-slate-500 font-medium">{selectedTable} • 6 Seats</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-[#FFB703] hover:bg-[#F2A900] text-black font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition">
                {/* ⚡ Quick Add
              </button>
              <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition"> */}
                Repeat
              </button>
              <div className="relative cursor-pointer bg-red-500 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition">
                <FaRegBell className="text-lg" />
                <span className="absolute -top-1 -right-1 bg-[#FFB703] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">3</span>
              </div>
            </div>
          </div>

          {/* Search & Categories */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-slate-100 shrink-0">
            <div className="relative mb-4">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search menu (Ctrl+F)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#109AAB] focus:bg-white transition"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2 rounded-xl text-sm font-semibold border transition ${
                    selectedCategory === cat
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-4 border border-red-100">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
              {loading ? (
                <div className="col-span-full py-10 text-center text-slate-500">Loading menu...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-500">No products found.</div>
              ) : (
                filteredProducts.map((p) => {
                  const waitTime = getWaitTime(p.Bpro_id);
                  const price = Number(p.pro_price || 0).toFixed(2);
                  const inCart = cart.find(i => i.Bpro_id === p.Bpro_id);

                  return (
                    <div key={p.Bpro_id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition flex flex-col group relative">
                      {/* Image Area */}
                      <div className="h-40 relative w-full bg-slate-100 overflow-hidden">
                        <img 
                          src={getProductImage(p.pro_name)} 
                          alt={p.pro_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[#0A5BAE] font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                          {selectedCategory === "All" ? "Menu Item" : selectedCategory}
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white font-medium text-[11px] px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                          <FaClock className="text-[10px]" /> {waitTime}m
                        </div>
                      </div>
                      
                      {/* Content Area */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-slate-900 text-[15px] mb-1 line-clamp-1">{p.pro_name}</h3>
                        <div className="flex items-center justify-between mt-auto pt-3">
                          <span className="font-bold text-[#00A651] text-lg">${price}</span>
                          
                          {inCart ? (
                            <div className="flex items-center bg-sky-50 border border-sky-200 rounded-lg p-0.5 shadow-sm">
                              <button onClick={() => updateQty(p.Bpro_id, -1)} className="w-8 h-8 flex items-center justify-center text-sky-600 hover:bg-sky-100 rounded-md transition"><FaMinus className="text-[10px]"/></button>
                              <span className="w-6 text-center font-bold text-sky-800 text-sm">{inCart.qty}</span>
                              <button onClick={() => addToCart(p)} className="w-8 h-8 flex items-center justify-center bg-sky-500 text-white hover:bg-sky-600 rounded-md transition shadow-[0_2px_8px_rgba(14,165,233,0.3)]"><FaPlus className="text-[10px]"/></button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(p)} className="bg-black hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1 transition shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                              <FaPlus className="text-xs" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: ORDER COLUMN */}
        <aside className="w-[380px] shrink-0 flex flex-col gap-4 bg-transparent h-full">
          {/* Order Header */}
          <div className="flex justify-between items-center px-2 shrink-0">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Order</h2>
            <div className="bg-[#E8F0FE] text-[#1A73E8] text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-blue-100">
              📋 {selectedProductCount} Items
            </div>
          </div>

          {/* Cart Container */}
          <div className="flex-1 bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col overflow-hidden">
            
            {/* Table Selector (Replacing Left Menu Grid) */}
            <div className="p-4 border-b border-slate-100 shrink-0 relative">
              <button 
                onClick={() => setShowTableDropdown(!showTableDropdown)}
                className="w-full bg-[#F0F7FD] hover:bg-[#E3F1FC] border border-[#BCE0FD] text-[#0A5BAE] rounded-xl py-3 px-4 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <FaMapMarkerAlt className="text-red-500" /> {selectedTable} • 6 Seats
                </div>
                <span className="text-xs font-bold">Change ▼</span>
              </button>
              
              {showTableDropdown && (
                <div className="absolute top-[70px] left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 grid grid-cols-3 gap-2">
                  {["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"].map(t => (
                    <button 
                      key={t}
                      onClick={() => { setSelectedTable(t); setShowTableDropdown(false); }}
                      className={`py-2 text-sm font-semibold rounded-lg border ${selectedTable === t ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-dashed border-slate-200">
                    <FaPlus className="text-xl opacity-20" />
                  </div>
                  <p className="text-sm">No items in order</p>
                </div>
              ) : (
                cart.map(i => (
                  <div key={i.Bpro_id} className="flex gap-3">
                    <img src={getProductImage(i.pro_name)} className="w-14 h-14 rounded-xl object-cover shadow-sm border border-slate-100 shrink-0" alt="" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-slate-800 leading-tight">{i.pro_name}</h4>
                        <button onClick={() => removeFromCart(i.Bpro_id)} className="text-red-400 hover:text-red-600 p-1"><FaRegTimesCircle /></button>
                      </div>
                      <div className="text-[12px] font-bold text-[#00A651] mt-0.5">${i.unitPrice.toFixed(2)}</div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                          <button onClick={() => updateQty(i.Bpro_id, -1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white rounded-md"><FaMinus className="text-[10px]"/></button>
                          <span className="w-6 text-center font-bold text-slate-700 text-xs">{i.qty}</span>
                          <button onClick={() => updateQty(i.Bpro_id, 1)} className="w-6 h-6 flex items-center justify-center bg-black text-white hover:bg-gray-800 rounded-md"><FaPlus className="text-[10px]"/></button>
                        </div>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50">
                          <FaCog className="text-[10px]" />
                        </button>
                        <div className="font-bold text-[15px] text-slate-900">${(i.unitPrice * i.qty).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes & Extra Inputs */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                   ⚠ ALLERGIES / DIETARY RESTRICTIONS
                </label>
                <input type="text" placeholder="e.g., Nuts, Gluten, Dairy..." value={allergies} onChange={e=>setAllergies(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Add Ons</label>
                  <input type="text" placeholder="Extra cheese..." value={addons} onChange={e=>setAddons(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-300" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Notes</label>
                  <input type="text" placeholder="Special requests..." value={notes} onChange={e=>setNotes(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Discount %</label>
                  <input type="number" min="0" max="100" value={discountPct} onChange={e=>setDiscountPct(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-300" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Service Fee</label>
                  <input type="number" min="0" value={serviceFee} onChange={e=>setServiceFee(e.target.value)} className="w-full text-sm py-2 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-300" />
                </div>
              </div>
            </div>

            {/* Calculations */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <div className="flex justify-between items-center text-[13px] text-slate-500 font-semibold mb-2">
                <span>Subtotal</span>
                <span className="text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px] text-slate-500 font-semibold mb-3">
                <span>Tax (10%)</span>
                <span className="text-slate-900">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center bg-[#E8F4FB] p-3 rounded-xl border border-[#D0E9FA]">
                <span className="font-bold text-[#0A5BAE]">Total</span>
                <span className="text-2xl font-black text-[#0A5BAE] tracking-tight">${total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-2 shrink-0">
              <button 
                onClick={() => handleCheckout("held")}
                disabled={submitting || cart.length===0}
                className="bg-[#FFB703] hover:bg-[#F2A900] text-black font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                ⏸ Hold
              </button>
              <button 
                onClick={() => handleCheckout("paid")}
                disabled={submitting || cart.length===0}
                className="bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                💳 Pay
              </button>
              <button 
                onClick={() => handleCheckout("sent_to_kitchen")}
                disabled={submitting || cart.length===0}
                className="bg-[#00A651] hover:bg-[#008A43] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                🍳 Send to Kitchen
              </button>
              <button 
                onClick={() => handleCheckout("sent_to_bar")}
                disabled={submitting || cart.length===0}
                className="bg-[#00A651] hover:bg-[#008A43] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                🍸 Send to Cashier
              </button>
            </div>

          </div>
        </aside>
      </main>
    </div>
  );
};

export default WaiterPos;
