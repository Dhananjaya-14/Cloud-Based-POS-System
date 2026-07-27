import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaChevronDown, FaCheck, FaMinus, FaPlus, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { deleteProduct, getCategories, getProductById, updateProduct, getBranches } from "../../services/api";

const cardStyle = {
  border: "1px solid #D9E4F2",
  borderRadius: "14px",
  background: "#FFFFFF",
  boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
  padding: "14px",
};

const inputStyle = {
  width: "100%",
  height: "32px",
  borderRadius: "10px",
  border: "1px solid #D6E2EF",
  background: "#F8FBFE",
  outline: "none",
  padding: "0 12px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const sectionTitleStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 10px",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "#2F3A4C",
  marginBottom: "5px",
};

const toggleTrackStyle = {
  width: "34px",
  height: "16px",
  borderRadius: "999px",
  position: "relative",
  background: "#D1D5DB",
  cursor: "pointer",
  transition: "background 0.2s ease",
};

const toggleKnobStyle = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#FFFFFF",
  position: "absolute",
  top: "2px",
  left: "2px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
  transition: "transform 0.2s ease",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "10px",
  padding: "4px 10px",
  fontSize: "12px",
  fontWeight: "700",
  background: "#E8F7EC",
  color: "#15803D",
};

const toShortName = (name) => {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1, 4).toLowerCase())
    .join(" ");
};

const isImageUrl = (value) => typeof value === "string" && /^(https?:)?\/\//i.test(value.trim());

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.62)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};

const modalCardStyle = {
  width: "380px",
  maxWidth: "calc(100vw - 32px)",
  background: "#FFFFFF",
  borderRadius: "10px",
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.30)",
};

const ProductDetails = () => {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditPage = location.pathname.endsWith("/edit");
  const isDeletePage = location.pathname.endsWith("/delete");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toasts, setToasts] = useState([]);
  const [newAddOn, setNewAddOn] = useState("");
  const [newStation, setNewStation] = useState("");

  const handleAddAddOn = () => {
    if (!newAddOn.trim()) return;
    const key = newAddOn.trim();
    setForm((prev) => ({
      ...prev,
      add_ons: {
        ...prev.add_ons,
        [key]: true,
      },
    }));
    setNewAddOn("");
  };

  const handleAddStation = () => {
    if (!newStation.trim()) return;
    const key = newStation.trim();
    setForm((prev) => ({
      ...prev,
      stations: {
        ...prev.stations,
        [key]: true,
      },
    }));
    setNewStation("");
  };
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleteOption, setDeleteOption] = useState("complete");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    pro_name: "",
    short_name: "",
    category: "General",
    pro_qty: "",
    pro_price: "",
    pro_image: "",
    description: "",
    track_inventory: true,
    low_stock: "10",
    add_ons: {
      Cheese: true,
      Bacon: true,
    },
    stations: {
      Kitchen: true,
      Bar: true,
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [productData, categoryData, branchData] = await Promise.all([
          getProductById(productId),
          getCategories().catch(() => []),
          getBranches().catch(() => []),
        ]);
        setBranches(Array.isArray(branchData) ? branchData : []);

        if (!mounted) {
          return;
        }

        setProduct(productData);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
        setForm({
          pro_name: productData?.pro_name || "",
          short_name: toShortName(productData?.pro_name || ""),
          category: productData?.cat_name || categoryData.find(c => c.cat_id === productData?.cat_id)?.cat_name || "General",
          pro_qty: String(productData?.pro_qty ?? ""),
          pro_price: String(productData?.pro_price ?? ""),
          pro_image: productData?.pro_image || "",
          description: "",
          track_inventory: true,
          low_stock: String(Math.max(1, Math.min(Number(productData?.pro_qty ?? 10), 10))),
          add_ons: productData?.add_ons || {
            Cheese: true,
            Bacon: true,
          },
          stations: productData?.stations || {
            Kitchen: true,
            Bar: true,
          },
        });
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || "Failed to load product details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (toasts.length === 0) return undefined;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts]);

  const showToastMessage = (message, type = "success") => {
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        message,
        type,
      },
    ]);
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const imagePreview = useMemo(() => {
    if (isImageUrl(form.pro_image)) {
      return <img src={form.pro_image} alt={form.pro_name || "Product"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
    }

    return <span style={{ fontSize: "22px" }}>🍔</span>;
  }, [form.pro_image, form.pro_name]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "pro_name" ? { short_name: toShortName(value) } : {}),
    }));
  };

  const toggleModifier = (group, key) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !prev[group][key],
      },
    }));
  };

  const handleSave = async () => {
    if (!productId) {
      setError("Missing product id");
      showToastMessage("Missing product id", "error");
      return;
    }

    if (!form.pro_name.trim() || form.pro_price === "") {
      setError("Product name and sales price are required");
      showToastMessage("Product name and sales price are required", "error");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const selectedCategoryObj = categories.find((c) => c.cat_name === form.category);
      const cat_id = selectedCategoryObj ? selectedCategoryObj.cat_id : null;

      const updated = await updateProduct(productId, {
      pro_name: form.pro_name.trim(),
      pro_price: Number(form.pro_price),
      pro_image: form.pro_image.trim() || null,
      cat_id: cat_id,
      add_ons: form.add_ons,
      stations: form.stations,
    });
      setProduct(updated);
      setSuccess("Product updated successfully");
      showToastMessage("Product updated successfully.", "success");
      setTimeout(() => setSuccess(""), 2200);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to update product";
      setError(message);
      showToastMessage(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
  if (!productId) {
    setError("Missing product id");
    showToastMessage("Missing product id", "error");
    return;
  }

  if (!isDeletePage) {
    navigate(`/admin/products/${productId}/delete`);
    return;
  }

  if (!deleteAcknowledged) {
    setError("Please confirm the deletion acknowledgment first.");
    showToastMessage("Please confirm the deletion acknowledgment first.", "error");
    return;
  }

  if (deleteOption === "branch" && !selectedBranchId) {
    setError("Please select a branch first.");
    showToastMessage("Please select a branch first.", "error");
    return;
  }

  try {
    setSaving(true);
    setError("");

    if (deleteOption === "branch") {
      await deleteProduct(productId, selectedBranchId);
    } else {
      await deleteProduct(productId, null);
    }

    showToastMessage("Product deleted successfully.", "success");
    setTimeout(() => {
      navigate("/admin/products");
    }, 700);
  } catch (err) {
    const message = err?.response?.data?.message || "Failed to delete product";
    setError(message);
    showToastMessage(message, "error");
  } finally {
    setSaving(false);
  }
};

  const handleCancel = () => {
    if (isDeletePage) {
      navigate(`/admin/products/${productId}/edit`);
      return;
    }

    navigate("/admin/products");
  };

  return (
    <div style={{ display: "flex", background: "#F3F4F6", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Product Management" />

        <div style={{ padding: "18px 20px 24px" }}>
          {toasts.length > 0 && (
            <div
              style={{
                position: "fixed",
                top: "82px",
                right: "20px",
                zIndex: 10000,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "min(380px, calc(100vw - 32px))",
              }}
            >
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  style={{
                    background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4",
                    borderLeft: `4px solid ${toast.type === "error" ? "#EF4444" : "#22C55E"}`,
                    borderRadius: "8px",
                    padding: "14px 16px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    color: toast.type === "error" ? "#991B1B" : "#065F46",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4 }}>{toast.message}</span>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      opacity: 0.7,
                      padding: "4px",
                      display: "inline-flex",
                    }}
                    aria-label="Dismiss notification"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: "transparent",
              color: "#6B7280",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            <FaArrowLeft />
            <span>View details</span>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1.06fr 0.94fr", gap: "24px", alignItems: "start" }}>
            <div>
              <h1 style={{ margin: "0 0 14px", fontSize: "24px", fontWeight: "800", color: "#0F172A" }}>
                {isEditPage ? "Edit Product" : "Product Details"}
              </h1>

              {loading ? (
                <div style={{ color: "#475569", fontSize: "14px" }}>Loading product details...</div>
              ) : error ? (
                <div style={{ color: "#B91C1C", fontSize: "14px", marginBottom: "10px" }}>{error}</div>
              ) : (
                <>
                  <div style={{ ...cardStyle, marginBottom: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <label style={labelStyle}>Product Name</label>
                        <input style={inputStyle} value={form.pro_name} onChange={handleFieldChange("pro_name")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Short Name</label>
                        <input style={inputStyle} value={form.short_name} onChange={handleFieldChange("short_name")} />
                      </div>
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                        <label style={labelStyle}>Category</label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={form.category}
                            onChange={handleFieldChange("category")}
                            style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: "30px" }}
                          >
                            <option value="General">General</option>
                            {categories.map((category) => (
                              <option key={category.cat_id} value={category.cat_name}>
                                {category.cat_name}
                              </option>
                            ))}
                          </select>
                          <FaChevronDown size={10} color="#475569" style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <label style={labelStyle}>Product Image</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button type="button" style={{ width: "102px", height: "48px", borderRadius: "12px", border: "1px solid #C9DDF3", background: "#EFF4F8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          {imagePreview}
                        </button>
                        <input placeholder="Image URL" style={{ ...inputStyle, flex: 1 }} value={form.pro_image} onChange={handleFieldChange("pro_image")} />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Description</label>
                      <textarea style={{ ...inputStyle, height: "64px", resize: "none", paddingTop: "8px" }} value={form.description} onChange={handleFieldChange("description")} />
                    </div>
                  </div>

                  <h2 style={{ ...sectionTitleStyle, marginTop: "10px" }}>Pricing</h2>
                  <div style={cardStyle}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <label style={labelStyle}>Sales Price</label>
                        <input type="number" min="0" step="0.01" style={inputStyle} value={form.pro_price} onChange={handleFieldChange("pro_price")} />
                      </div>
                      <div>
                      <label style={labelStyle}>Tax Group</label>
                      <select style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: "30px" }} disabled>
                        <option value="">N/A</option>
                      </select>
                    </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <label style={labelStyle}>Cost Price</label>
                        <input type="number" min="0" step="0.01" style={inputStyle} value={form.pro_price} onChange={handleFieldChange("pro_price")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Product Code</label>
                        <input style={inputStyle} value={product?.pro_id ? `SKU: CHB-${String(product.pro_id).padStart(3, "0")}` : ""} readOnly />
                      </div>
                    </div>

                    <div style={{ maxWidth: "140px" }}>
                      <label style={labelStyle}>Discount</label>
                      <input style={inputStyle} value="N/A" readOnly />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ paddingTop: "34px" }}>
              <h2 style={{ ...sectionTitleStyle, fontSize: "20px", marginBottom: "8px" }}>Modifiers</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "22px" }}>
                <div style={cardStyle}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>Add-Ons</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Object.entries(form.add_ons).map(([key, value]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "14px", color: "#374151" }}>
                        <span>{key}</span>
                        <button type="button" onClick={() => toggleModifier("add_ons", key)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                          <span style={{ ...badgeStyle, background: value ? "#E8F7EC" : "#FCE8E6", color: value ? "#15803D" : "#B91C1C" }}>
                            {value ? <FaCheck size={9} /> : <FaTimes size={9} />}
                            {value ? "On" : "Off"}
                          </span>
                        </button>
                      </label>
                    ))}
                  </div>

                  {/* Dynamic Add-On Input */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <input
                      placeholder="Add new add-on..."
                      value={newAddOn}
                      onChange={(e) => setNewAddOn(e.target.value)}
                      style={{
                        flex: 1,
                        height: "26px",
                        borderRadius: "8px",
                        border: "1px solid #D6E2EF",
                        padding: "0 10px",
                        fontSize: "12px",
                        outline: "none",
                        background: "#F8FBFE",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddAddOn}
                      style={{
                        height: "26px",
                        padding: "0 12px",
                        background: "#26B44A",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>Stations</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Object.entries(form.stations).map(([key, value]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "14px", color: "#374151" }}>
                        <span>{key}</span>
                        <button type="button" onClick={() => toggleModifier("stations", key)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                          <span style={{ ...badgeStyle, background: value ? "#E8F7EC" : "#FCE8E6", color: value ? "#15803D" : "#B91C1C" }}>
                            {value ? <FaCheck size={9} /> : <FaTimes size={9} />}
                            {value ? "On" : "Off"}
                          </span>
                        </button>
                      </label>
                    ))}
                  </div>

                  {/* Dynamic Station Input */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <input
                      placeholder="Add new station..."
                      value={newStation}
                      onChange={(e) => setNewStation(e.target.value)}
                      style={{
                        flex: 1,
                        height: "26px",
                        borderRadius: "8px",
                        border: "1px solid #D6E2EF",
                        padding: "0 10px",
                        fontSize: "12px",
                        outline: "none",
                        background: "#F8FBFE",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddStation}
                      style={{
                        height: "26px",
                        padding: "0 12px",
                        background: "#26B44A",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Track Inventory section removed - not needed at admin level */}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "14px", marginTop: "24px" }}>
                <button type="button" onClick={handleCancel} style={{ minWidth: "120px", height: "40px", borderRadius: "10px", border: "none", background: "#FFFFFF", color: "#1F2937", boxShadow: "0 3px 10px rgba(0,0,0,0.12)", cursor: "pointer", fontWeight: "700" }}>
                  Cancel
                </button>
                {isEditPage && (
                  <button type="button" onClick={handleDelete} disabled={saving} style={{ minWidth: "132px", height: "40px", borderRadius: "10px", border: "none", background: "#F24C45", color: "#FFFFFF", cursor: saving ? "wait" : "pointer", fontWeight: "700" }}>
                    Delete Product
                  </button>
                )}
                <button type="button" onClick={handleSave} disabled={saving} style={{ minWidth: "138px", height: "40px", borderRadius: "10px", border: "none", background: saving ? "#22A84A" : "#26B44A", color: "#FFFFFF", cursor: saving ? "wait" : "pointer", fontWeight: "700" }}>
                  {saving ? "Saving..." : isEditPage ? "Update Product" : "Edit Product"}
                </button>
              </div>

              {success && <div style={{ marginTop: "10px", color: "#15803D", fontSize: "14px" }}>{success}</div>}
            </div>
          </div>

          {isDeletePage && (
            <div style={modalOverlayStyle}>
              <div style={modalCardStyle}>
                <div style={{ padding: "18px 20px 10px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", lineHeight: 1.2, color: "#111827", fontWeight: "800" }}>Delete Product?</h3>
                  <p style={{ margin: "8px 0 0", fontSize: "12px", lineHeight: 1.45, color: "#111827" }}>
                    Are you sure you want to delete '{form.pro_name || "this product"}'? This action cannot be undone and will remove the product from all ups menus and historical reports.
                  </p>
                </div>

               <div style={{ padding: "0 20px 12px" }}>
  <div
    onClick={() => setDeleteOption("branch")}
    style={{
      border: deleteOption === "branch" ? "2px solid #1769AA" : "1px solid #E5E7EB",
      borderRadius: "10px",
      padding: "10px 12px",
      marginBottom: "8px",
      cursor: "pointer",
      background: deleteOption === "branch" ? "#EFF6FF" : "#fff",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: deleteOption === "branch" ? "8px" : 0 }}>
      <input type="radio" checked={deleteOption === "branch"} onChange={() => setDeleteOption("branch")} />
      <div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#111827" }}>Delete from specific branch</div>
        <div style={{ fontSize: "10px", color: "#6B7280" }}>Stays in admin panel and other branches</div>
      </div>
    </div>

    {deleteOption === "branch" && (
      <select
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        style={{ width: "100%", height: "30px", borderRadius: "6px", border: "1px solid #D1D5DB", padding: "0 8px", fontSize: "12px", outline: "none" }}
      >
        <option value="">Select a branch...</option>
        {branches.map((b) => (
          <option key={b.B_id} value={b.B_id}>{b.B_name}</option>
        ))}
      </select>
    )}
  </div>

  <div
    onClick={() => setDeleteOption("complete")}
    style={{
      border: deleteOption === "complete" ? "2px solid #EF4444" : "1px solid #E5E7EB",
      borderRadius: "10px",
      padding: "10px 12px",
      cursor: "pointer",
      background: deleteOption === "complete" ? "#FEF2F2" : "#fff",
    }}
  >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="radio" checked={deleteOption === "complete"} onChange={() => setDeleteOption("complete")} />
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#EF4444" }}>Delete completely from system</div>
                      <div style={{ fontSize: "10px", color: "#6B7280" }}>⚠️ Removes from ALL branches permanently</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 20px 16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "700", color: "#111827" }}>
                  <input type="checkbox" checked={deleteAcknowledged} onChange={(event) => setDeleteAcknowledged(event.target.checked)} />
                  <span>I understand that this action is permanent.</span>
                </label>
              </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "14px", padding: "0 20px 18px" }}>
                  <button type="button" onClick={handleCancel} style={{ minWidth: "76px", height: "30px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#111827", cursor: "pointer", fontWeight: "500" }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} disabled={saving} style={{ minWidth: "76px", height: "30px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFFFFF", cursor: saving ? "wait" : "pointer", fontWeight: "500" }}>
                    {saving ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
