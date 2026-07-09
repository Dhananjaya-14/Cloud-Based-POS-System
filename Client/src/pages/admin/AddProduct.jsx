// Client/src/pages/admin/AddProduct.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaChevronDown, FaTimes, FaUpload } from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { createProduct, getCategories } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getSocket, connectSocket, SOCKET_EVENTS } from "../../services/socket";

const cardStyle = {
  border: "1px solid #C9DDF3",
  borderRadius: "12px",
  padding: "10px",
  background: "#F7FAFD",
};

const inputStyle = {
  width: "100%",
  height: "34px",
  borderRadius: "12px",
  border: "1px solid #C9DDF3",
  background: "#EFF4F8",
  outline: "none",
  padding: "0 10px",
  fontSize: "16px",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#0F172A",
  marginBottom: "4px",
  display: "block",
};

const sectionTitleStyle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#0F172A",
  margin: "0 0 10px",
};

const AddProduct = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    pro_name: "",
    pro_price: "",
    pro_image: "",
    com_id: "",
    cat_id: "",
    add_ons: {
    },
    stations: {
      Kitchen: true,
      Bar: true,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newAddOn, setNewAddOn] = useState("");
  const [newStation, setNewStation] = useState("");

  const toggleCheckbox = (group, key) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !prev[group][key],
      },
    }));
  };

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

  useEffect(() => {
    let isMounted = true;

    const loadCompany = async () => {
      if (user?.com_id != null) {
        if (!isMounted) return;
        setForm((prev) => ({ ...prev, com_id: String(user.com_id) }));
        return;
      }
      if (!isMounted) return;
      setForm((prev) => ({ ...prev, com_id: "1" }));
    };

    loadCompany();

    getCategories()
      .then((cats) => {
        if (!Array.isArray(cats) || cats.length === 0) return;
        setCategories(cats);
        setForm((prev) => ({ ...prev, cat_id: String(cats[0].cat_id) }));
      })
      .catch(() => {});

    // Initialize socket connection for admin
    const socket = getSocket();
    if (!socket.connected) {
      connectSocket();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.com_id]);

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

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProduct = async () => {
    try {
      setSubmitting(true);
      setError("");

      if (!form.pro_name.trim() || form.pro_price === "") {
        setError("Product Name and Sales Price are required");
        showToastMessage("Product Name and Sales Price are required", "error");
        return;
      }

      const payload = {
        pro_name: form.pro_name.trim(),
        pro_price: Number(form.pro_price),
        pro_image: form.pro_image.trim() || "N/A",
        com_id: Number(form.com_id || user?.com_id || 1),
        cat_id: Number(form.cat_id) || undefined,
        add_ons: form.add_ons,
        stations: form.stations,
      };

      const response = await createProduct(payload);
      
      // Socket event will be emitted from server, so we just show success
      setShowSuccessToast(true);
      showToastMessage("Product added successfully.", "success");
      setForm((prev) => ({
        ...prev,
        pro_name: "",
        pro_price: "",
        pro_image: "",
        add_ons: {
        },
        stations: {
          Kitchen: true,
          Bar: true,
        },
      }));
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to save product";
      setError(message);
      showToastMessage(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Product Management" />

        <div style={{ padding: "20px 22px 28px" }}>
          <h1 style={{ margin: "0 0 14px", fontSize: "35px", fontWeight: "700", color: "#0B1220" }}>
            Add New Product
          </h1>

          {error && (
            <div style={{ 
              background: "#FEE2E2", 
              color: "#991B1B", 
              padding: "12px", 
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.06fr 1fr", gap: "22px", alignItems: "start" }}>
            <div>
              <div style={cardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "12px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Product Name</label>
                    <input 
                      style={inputStyle} 
                      value={form.pro_name} 
                      onChange={handleChange("pro_name")} 
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Short Name</label>
                    <input style={inputStyle} placeholder="Short name" />
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={labelStyle}>Category</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={form.cat_id}
                      onChange={handleChange("cat_id")}
                      style={{
                        ...inputStyle,
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        paddingRight: "30px",
                      }}
                    >
                      {categories.length === 0 ? (
                        <option value="">Loading...</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.cat_id} value={cat.cat_id}>
                            {cat.cat_name}
                          </option>
                        ))
                      )}
                    </select>
                    <FaChevronDown
                      size={10}
                      color="#475569"
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={labelStyle}>Product Image</label>
                  <button
                    type="button"
                    style={{
                      width: "102px",
                      height: "48px",
                      borderRadius: "12px",
                      border: "1px solid #C9DDF3",
                      background: "#EFF4F8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <FaUpload color="#273142" />
                  </button>
                  <input
                    placeholder="Image URL"
                    style={{ ...inputStyle, marginTop: "8px" }}
                    value={form.pro_image}
                    onChange={handleChange("pro_image")}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={{
                      ...inputStyle,
                      height: "64px",
                      resize: "none",
                      paddingTop: "8px",
                    }}
                    placeholder="Product description"
                  />
                </div>
              </div>

              <h2 style={{ ...sectionTitleStyle, marginTop: "12px" }}>Pricing</h2>

              <div style={cardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Sales Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      style={inputStyle}
                      value={form.pro_price}
                      onChange={handleChange("pro_price")}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Tax Group</label>
                    <div style={{ position: "relative" }}>
                      <select
                        style={{
                          ...inputStyle,
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          paddingRight: "30px",
                        }}
                      >
                        <option>None</option>
                      </select>
                      <FaChevronDown
                        size={10}
                        color="#475569"
                        style={{
                          position: "absolute",
                          right: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Cost Price</label>
                    <input style={inputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Product Code</label>
                    <input style={inputStyle} placeholder="Auto-generated" />
                  </div>
                </div>

                <div style={{ width: "calc(50% - 6px)" }}>
                  <label style={labelStyle}>Discount</label>
                  <input style={inputStyle} placeholder="0%" />
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ ...sectionTitleStyle, fontSize: "30px", marginBottom: "10px" }}>Modifiers</h2>

              <div style={{ ...cardStyle, minHeight: "100px", display: "flex", flexDirection: "column", padding: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #D5E2EE",
                      borderRadius: "12px",
                      padding: "10px 12px 8px",
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Add-Ons</div>
                    {Object.entries(form.add_ons).map(([key, value]) => (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          fontSize: "16px",
                          lineHeight: 1,
                        }}
                      >
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleCheckbox("add_ons", key)}
                          style={{ accentColor: "#83CAE8", width: "14px", height: "14px", transform: "translateY(1px)" }}
                        />
                      </label>
                    ))}
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <input
                        placeholder="New Add-on"
                        value={newAddOn}
                        onChange={(e) => setNewAddOn(e.target.value)}
                        style={{
                          flex: 1,
                          height: "22px",
                          borderRadius: "6px",
                          border: "1px solid #C9DDF3",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          background: "#fff",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddAddOn}
                        style={{
                          height: "22px",
                          padding: "0 8px",
                          background: "#0E6DCF",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #D5E2EE",
                      borderRadius: "12px",
                      padding: "10px 12px 8px",
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Stations</div>
                    {Object.entries(form.stations).map(([key, value]) => (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          fontSize: "16px",
                          lineHeight: 1,
                        }}
                      >
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleCheckbox("stations", key)}
                          style={{ accentColor: "#83CAE8", width: "14px", height: "14px", transform: "translateY(1px)" }}
                        />
                      </label>
                    ))}
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                      <input
                        placeholder="New Station"
                        value={newStation}
                        onChange={(e) => setNewStation(e.target.value)}
                        style={{
                          flex: 1,
                          height: "22px",
                          borderRadius: "6px",
                          border: "1px solid #C9DDF3",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          background: "#fff",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddStation}
                        style={{
                          height: "22px",
                          padding: "0 8px",
                          background: "#0E6DCF",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Track Inventory Section - Added from the HEAD version */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", lineHeight: 1 }}>Track Inventory</div>
                  <div
                    style={{
                      width: "36px",
                      height: "18px",
                      borderRadius: "20px",
                      background: "#0E6DCF",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        right: "3px",
                        top: "3px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "6px" }}>Current stock</label>
                    <input style={inputStyle} placeholder="0" />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "6px" }}>Low stock</label>
                    <input style={inputStyle} placeholder="10" />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "24px", paddingRight: "2px", marginRight: "20px" }}>
                <button
                  type="button"
                  onClick={() => navigate("/admin/products")}
                  style={{
                    minWidth: "142px",
                    height: "42px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#fff",
                    color: "#111827",
                    fontSize: "16px",
                    fontWeight: "600",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.18)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={submitting}
                  style={{
                    minWidth: "170px",
                    height: "42px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#1E2FFF",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.8 : 1,
                  }}
                >
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      
    
    </div>
  );
};

export default AddProduct;