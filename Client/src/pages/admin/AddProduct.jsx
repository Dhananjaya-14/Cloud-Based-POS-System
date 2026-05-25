import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaChevronDown, FaUpload } from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { createProduct, getCompanies } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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
    pro_qty: "",
    pro_price: "",
    pro_image: "",
    com_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCompany = async () => {
      try {
        if (user?.com_id != null) {
          if (!isMounted) return;
          setForm((prev) => ({ ...prev, com_id: String(user.com_id) }));
          return;
        }

        const companies = await getCompanies();
        const firstCompanyId = companies?.[0]?.com_id ?? 1;
        if (!isMounted) return;
        setForm((prev) => ({ ...prev, com_id: String(firstCompanyId) }));
      } catch {
        if (!isMounted) return;
        setForm((prev) => ({ ...prev, com_id: "1" }));
      }
    };

    loadCompany();

    return () => {
      isMounted = false;
    };
  }, [user?.com_id]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProduct = async () => {
    try {
      setSubmitting(true);
      setError("");

      if (!form.pro_name.trim() || form.pro_qty === "" || form.pro_price === "") {
        setError("Product Name, Quantity, and Sales Price are required");
        return;
      }

      const payload = {
        pro_name: form.pro_name.trim(),
        pro_qty: Number(form.pro_qty),
        pro_price: Number(form.pro_price),
        pro_image: form.pro_image.trim() || "N/A",
        com_id: Number(form.com_id || user?.com_id || 1),
      };

      await createProduct(payload);
      setShowSuccessToast(true);
      setForm((prev) => ({
        ...prev,
        pro_name: "",
        pro_qty: "",
        pro_price: "",
        pro_image: "",
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save product");
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

          <div style={{ display: "grid", gridTemplateColumns: "1.06fr 1fr", gap: "22px", alignItems: "start" }}>
            <div>
              <div style={cardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "12px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Product Name</label>
                    <input style={inputStyle} value={form.pro_name} onChange={handleChange("pro_name")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Short Name</label>
                    <input style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "12px", marginBottom: "10px" }}>
                  <div>
                    <label style={labelStyle}>Category</label>
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
                        <option></option>
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
                  <div>
                    <label style={labelStyle}>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      style={inputStyle}
                      value={form.pro_qty}
                      onChange={handleChange("pro_qty")}
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
                        <option></option>
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
                    <input style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Product Code</label>
                    <input style={inputStyle} />
                  </div>
                </div>

                <div style={{ width: "calc(50% - 6px)" }}>
                  <label style={labelStyle}>Discount</label>
                  <input style={inputStyle} />
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ ...sectionTitleStyle, fontSize: "30px", marginBottom: "10px" }}>Modifiers</h2>

              <div style={{ ...cardStyle, minHeight: "386px", display: "flex", flexDirection: "column", padding: "12px" }}>
                <div
                  style={{
                    width: "146px",
                    border: "1px solid #D5E2EE",
                    borderRadius: "12px",
                    padding: "10px 12px 8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Add-Ons</div>
                  {[
                    ["Cheese", true],
                    ["Bacon", true],
                  ].map(([name, checked]) => (
                    <label
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        fontSize: "16px",
                        lineHeight: 1,
                      }}
                    >
                      <span>{name}</span>
                      <input
                        type="checkbox"
                        defaultChecked={checked}
                        style={{ accentColor: "#83CAE8", width: "14px", height: "14px", transform: "translateY(1px)" }}
                      />
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    width: "146px",
                    border: "1px solid #D5E2EE",
                    borderRadius: "12px",
                    padding: "10px 12px 8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>Stations</div>
                  {[
                    ["Kitchen", true],
                    ["Bar", true],
                  ].map(([name, checked]) => (
                    <label
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        fontSize: "16px",
                        lineHeight: 1,
                      }}
                    >
                      <span>{name}</span>
                      <input
                        type="checkbox"
                        defaultChecked={checked}
                        style={{ accentColor: "#83CAE8", width: "14px", height: "14px", transform: "translateY(1px)" }}
                      />
                    </label>
                  ))}
                </div>

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
                    <input style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "6px" }}>Low stock</label>
                    <input style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "100px", paddingRight: "2px", marginRight: "20px" }}>
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
              {error && <div style={{ marginTop: "12px", color: "#B91C1C", fontSize: "14px" }}>{error}</div>}
            </div>
          </div>
        </div>
      </div>

      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "min(92vw, 430px)",
              height: "min(70vw, 350px)",
              background: "#EBEBEB",
              borderRadius: "22px",
              padding: "14px 20px 14px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "50%",
                background: "#0E5BA8",
                margin: "0 auto 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaCheck size={30} color="#fff" />
            </div>

            <h2
              style={{
                margin: "0",
                fontSize: "18px",
                lineHeight: 1.2,
                fontWeight: "600",
                color: "#0E5BA8",
              }}
            >
              New Product has been
              <br />
              Added
              <br />
              Successfully
            </h2>

            <button
              onClick={() => {
                setShowSuccessToast(false);
                navigate("/admin/products");
              }}
              style={{
                marginTop: "16px",
                width: "100%",
                height: "52px",
                border: "none",
                borderRadius: "12px",
                background: "#0E5BA8",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Countinue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;
