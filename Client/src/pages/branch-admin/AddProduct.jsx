import React from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronDown, FaUpload } from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";

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

  return (
    <div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header
          title="Product Management"
          role="Branch Admin"
          email="branchadmin@gmail.com"
          showAddUserIcon
        />

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
                    <input style={inputStyle} />
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
                    <input style={inputStyle} />
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
                    <input style={inputStyle} />
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
                  onClick={() => navigate("/branch-admin/products")}
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
                  style={{
                    minWidth: "170px",
                    height: "42px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#1E2FFF",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
