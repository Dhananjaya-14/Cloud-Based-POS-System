import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheck,
  FaChevronDown,
  FaMinus,
  FaPlus,
  FaSearch,
  FaShoppingCart,
  FaTrashAlt,
} from "react-icons/fa";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import {
  createBranchProduct,
  getBranchProducts,
  getCategories,
  getProducts,
} from "../../services/api";

const pageStyle = {
  display: "flex",
  background: "#F2F4F7",
  minHeight: "100vh",
};

const contentStyle = {
  flex: 1,
  marginLeft: "240px",
};

const shellStyle = {
  padding: "20px 22px 28px",
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "18px",
};

const titleStyle = {
  margin: 0,
  fontSize: "34px",
  fontWeight: "800",
  color: "#0B1220",
  lineHeight: 1.05,
};

const subtitleStyle = {
  margin: "8px 0 0",
  fontSize: "14px",
  color: "#64748B",
  maxWidth: "760px",
  lineHeight: 1.6,
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "18px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const searchShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #D8E1EA",
  padding: "10px 14px",
  minWidth: "320px",
};

const inputStyle = {
  border: "none",
  outline: "none",
  background: "transparent",
  width: "100%",
  fontSize: "14px",
  color: "#0F172A",
};

const selectStyle = {
  width: "100%",
  height: "42px",
  borderRadius: "12px",
  border: "1px solid #D8E1EA",
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: "14px",
  color: "#0F172A",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const actionButtonStyle = {
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontWeight: "700",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "700",
};

const cardButtonStyle = {
  width: "100%",
  border: "1px solid #D8E1EA",
  borderRadius: "16px",
  padding: "14px",
  background: "#FFFFFF",
  textAlign: "left",
  cursor: "pointer",
  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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

const ProductChip = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 12px",
      borderRadius: "12px",
      background: "#F8FAFC",
      border: "1px solid #E2E8F0",
      marginBottom: "10px",
    }}
  >
    <span style={{ fontSize: "13px", color: "#475569", fontWeight: "600" }}>{label}</span>
    <span style={{ fontSize: "13px", color: "#0F172A", fontWeight: "700" }}>{value}</span>
  </div>
);

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [branchProducts, setBranchProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [allProducts, currentBranchProducts, categoryList] = await Promise.all([
          getProducts(),
          getBranchProducts(),
          getCategories().catch(() => []),
        ]);

        if (!mounted) return;

        setProducts(Array.isArray(allProducts) ? allProducts : []);
        setBranchProducts(Array.isArray(currentBranchProducts) ? currentBranchProducts : []);
        setCategories(Array.isArray(categoryList) ? categoryList : []);

        const firstCategory = Array.isArray(categoryList) && categoryList.length > 0 ? categoryList[0] : null;
        setSelectedCategoryId(String(firstCategory?.cat_id ?? 1));
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const branchProductIds = useMemo(() => {
    return new Set(branchProducts.map((item) => Number(item.pro_id)));
  }, [branchProducts]);

  const availableProducts = useMemo(() => {
    return products.filter((product) => !branchProductIds.has(Number(product.pro_id)));
  }, [products, branchProductIds]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return availableProducts;

    return availableProducts.filter((product) => {
      const name = String(product.pro_name ?? "").toLowerCase();
      const image = String(product.pro_image ?? "").toLowerCase();
      return name.includes(term) || image.includes(term) || String(product.pro_id ?? "").includes(term);
    });
  }, [availableProducts, searchTerm]);

  const selectedList = useMemo(() => {
    return Object.entries(selectedItems)
      .map(([productId, value]) => {
        const product = products.find((item) => String(item.pro_id) === String(productId));
        if (!product) return null;
        return {
          ...product,
          quantity: value.quantity,
        };
      })
      .filter(Boolean);
  }, [selectedItems, products]);

  const selectedCount = selectedList.length;
  const totalUnits = selectedList.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const estimatedValue = selectedList.reduce(
    (sum, item) => sum + Number(item.pro_price ?? 0) * Number(item.quantity || 0),
    0,
  );

  const addToSelection = (product) => {
    setSelectedItems((prev) => {
      const key = String(product.pro_id);
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          quantity: 1,
        },
      };
    });
  };

  const updateSelectedQuantity = (productId, nextQuantity) => {
    setSelectedItems((prev) => {
      const key = String(productId);
      if (nextQuantity <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }

      return {
        ...prev,
        [key]: {
          ...prev[key],
          quantity: nextQuantity,
        },
      };
    });
  };

  const removeFromSelection = (productId) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      delete next[String(productId)];
      return next;
    });
  };

  const handleSaveSelection = async () => {
    if (!selectedList.length) {
      setError("Select at least one product to add to the branch.");
      return;
    }

    const resolvedCategoryId = Number(selectedCategoryId || categories?.[0]?.cat_id || 1);
    if (!Number.isFinite(resolvedCategoryId) || resolvedCategoryId <= 0) {
      setError("Please choose a valid category before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      for (const item of selectedList) {
        await createBranchProduct({
          pro_name: item.pro_name,
          pro_shortname: toShortName(item.pro_name),
          pro_image: item.pro_image || "N/A",
          pro_des: `${item.pro_name} imported from Product`,
          pro_quantity: Number(item.quantity || 0),
          pro_price: Number(item.pro_price ?? 0),
          cat_id: resolvedCategoryId,
          pro_id: Number(item.pro_id),
        });
      }

      setBranchProducts((prev) => [
        ...prev,
        ...selectedList.map((item) => ({ pro_id: item.pro_id })),
      ]);
      setSelectedItems({});
      setSuccess(`${selectedCount} product${selectedCount === 1 ? "" : "s"} added to the branch successfully.`);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add selected products to branch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageStyle}>
      <Sidebar />

      <div style={contentStyle}>
        <Header
          title="Branch Product Management"
          role="Branch Admin"
          email="branchadmin@gmail.com"
          showAddUserIcon
        />

        <div style={shellStyle}>
          <div style={heroStyle}>
            <div>
              {/* <h1 style={titleStyle}>Add products from the catalog</h1> */}
              {/* <p style={subtitleStyle}>
                Pick items from the Product table, keep anything already in Branch_Product out of the list,
                and build a batch order on the right before saving it into the branch catalog.
              </p> */}
            </div>

            <button
              type="button"
              onClick={() => navigate("/branch-admin/products")}
              style={{
                ...actionButtonStyle,
                background: "#FFFFFF",
                border: "1px solid #D8E1EA",
                color: "#0F172A",
                padding: "12px 16px",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              Back to products
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.45fr 0.85fr", gap: "18px" }}>
            <div style={{ ...panelStyle, padding: "18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={searchShellStyle}>
                  <FaSearch color="#94A3B8" />
                  <input
                    type="text"
                    placeholder="Search remaining products"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ position: "relative", minWidth: "250px" }}>
                  <select
                    value={selectedCategoryId}
                    onChange={(event) => setSelectedCategoryId(event.target.value)}
                    style={selectStyle}
                  >
                    {categories.length === 0 ? (
                      <option value="1">General</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.cat_id} value={category.cat_id}>
                          {category.cat_name}
                        </option>
                      ))
                    )}
                  </select>
                  <FaChevronDown
                    size={11}
                    color="#334155"
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

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", color: "#64748B", fontWeight: "600" }}>
                  {filteredProducts.length} available item{filteredProducts.length === 1 ? "" : "s"}
                </div>
                <div style={{ fontSize: "14px", color: "#64748B", fontWeight: "600" }}>
                  {branchProducts.length} already in Branch_Product
                </div>
              </div>

              {loading ? (
                <div style={{ color: "#475569", fontSize: "14px", padding: "10px 0" }}>Loading catalog...</div>
              ) : error ? (
                <div style={{ color: "#B91C1C", fontSize: "14px", padding: "10px 0" }}>{error}</div>
              ) : filteredProducts.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #CBD5E1",
                    borderRadius: "16px",
                    padding: "24px",
                    color: "#64748B",
                    background: "#F8FAFC",
                    fontSize: "14px",
                  }}
                >
                  No remaining products found. Everything currently in the Product table is already added to the branch,
                  or your search filtered the list to nothing.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "14px",
                    maxHeight: "calc(100vh - 300px)",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {filteredProducts.map((product) => {
                    const selected = Boolean(selectedItems[String(product.pro_id)]);
                    const price = Number(product.pro_price ?? 0);
                    const stock = Number(product.pro_qty ?? 0);

                    return (
                      <button
                        key={product.pro_id}
                        type="button"
                        onClick={() => addToSelection(product)}
                        style={{
                          ...cardButtonStyle,
                          borderColor: selected ? "#0E6DCF" : "#D8E1EA",
                          boxShadow: selected ? "0 10px 26px rgba(14, 109, 207, 0.14)" : cardButtonStyle.boxShadow,
                          transform: selected ? "translateY(-1px)" : "translateY(0)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                          <div>
                            <div
                              style={{
                                width: "46px",
                                height: "46px",
                                borderRadius: "14px",
                                display: "grid",
                                placeItems: "center",
                                background: "#F1F5F9",
                                fontSize: "22px",
                                marginBottom: "10px",
                              }}
                            >
                              {product.pro_image ? "📦" : "🧾"}
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: "600", color: "#0F172A", lineHeight: 1.2 }}>
                              {product.pro_name}
                            </div>
                            <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748B" }}>
                              Product ID #{product.pro_id}
                            </div>
                          </div>

                          <div
                            style={{
                              ...badgeStyle,
                              background: selected ? "#E0F2FE" : "#F8FAFC",
                              color: selected ? "#0369A1" : "#475569",
                            }}
                          >
                            {selected ? <FaCheck size={10} /> : <FaPlus size={10} />}
                            {selected ? "Selected" : "Add"}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginTop: "14px" }}>
                          <ProductChip label="Catalog price" value={`$${price.toFixed(2)}`} />
                          <ProductChip label="Qty on hand" value={stock} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...panelStyle, padding: "18px", position: "sticky", top: "88px", alignSelf: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "#0E6DCF",
                    display: "grid",
                    placeItems: "center",
                    color: "#FFFFFF",
                  }}
                >
                  <FaShoppingCart />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#0F172A" }}>Order summary</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{selectedCount} item{selectedCount === 1 ? "" : "s"} selected</div>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Category for branch entry
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={selectedCategoryId}
                    onChange={(event) => setSelectedCategoryId(event.target.value)}
                    style={selectStyle}
                  >
                    {categories.length === 0 ? (
                      <option value="1">General</option>
                    ) : (
                      categories.map((category) => (
                        <option key={category.cat_id} value={category.cat_id}>
                          {category.cat_name}
                        </option>
                      ))
                    )}
                  </select>
                  <FaChevronDown
                    size={11}
                    color="#334155"
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

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "10px" }}>
                  Selected items
                </div>

                {selectedList.length === 0 ? (
                  <div
                    style={{
                      border: "1px dashed #CBD5E1",
                      borderRadius: "14px",
                      padding: "18px",
                      background: "#F8FAFC",
                      color: "#64748B",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    Click any remaining product on the left to add it to the order. You can adjust the quantity here before saving.
                  </div>
                ) : (
                  <div style={{ maxHeight: "310px", overflowY: "auto", paddingRight: "2px" }}>
                    {selectedList.map((item) => {
                      const itemState = selectedItems[String(item.pro_id)] || { quantity: 1 };
                      const quantity = Number(itemState.quantity || 1);
                      const itemTotal = Number(item.pro_price ?? 0) * quantity;

                      return (
                        <div
                          key={item.pro_id}
                          style={{
                            border: "1px solid #E2E8F0",
                            borderRadius: "14px",
                            padding: "12px",
                            marginBottom: "10px",
                            background: "#FFFFFF",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A" }}>{item.pro_name}</div>
                              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                                $ {Number(item.pro_price ?? 0).toFixed(2)} each
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromSelection(item.pro_id)}
                              style={{
                                ...actionButtonStyle,
                                width: "30px",
                                height: "30px",
                                background: "#FEF2F2",
                                color: "#DC2626",
                              }}
                            >
                              <FaTrashAlt size={11} />
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => updateSelectedQuantity(item.pro_id, quantity - 1)}
                                style={{
                                  ...actionButtonStyle,
                                  width: "32px",
                                  height: "32px",
                                  background: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  color: "#334155",
                                }}
                              >
                                <FaMinus size={10} />
                              </button>

                              <div
                                style={{
                                  width: "50px",
                                  textAlign: "center",
                                  fontSize: "14px",
                                  fontWeight: "800",
                                  color: "#0F172A",
                                }}
                              >
                                {quantity}
                              </div>

                              <button
                                type="button"
                                onClick={() => updateSelectedQuantity(item.pro_id, quantity + 1)}
                                style={{
                                  ...actionButtonStyle,
                                  width: "32px",
                                  height: "32px",
                                  background: "#F8FAFC",
                                  border: "1px solid #E2E8F0",
                                  color: "#334155",
                                }}
                              >
                                <FaPlus size={10} />
                              </button>
                            </div>

                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A" }}>
                              $ {itemTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                style={{
                  borderTop: "1px solid #E2E8F0",
                  paddingTop: "14px",
                  marginTop: "12px",
                }}
              >
                <ProductChip label="Total selected" value={selectedCount} />
                <ProductChip label="Total units" value={totalUnits} />
                <ProductChip label="Estimated value" value={`$${estimatedValue.toFixed(2)}`} />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => navigate("/branch-admin/products")}
                  style={{
                    ...actionButtonStyle,
                    flex: 1,
                    height: "44px",
                    background: "#FFFFFF",
                    border: "1px solid #D8E1EA",
                    color: "#0F172A",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveSelection}
                  style={{
                    ...actionButtonStyle,
                    flex: 1,
                    height: "44px",
                    background: saving ? "#93C5FD" : "#0E6DCF",
                    color: "#FFFFFF",
                    boxShadow: "0 10px 22px rgba(14, 109, 207, 0.22)",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Add to branch"}
                </button>
              </div>

              {success && (
                <div
                  style={{
                    marginTop: "14px",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    background: "#ECFDF3",
                    color: "#166534",
                    fontSize: "13px",
                    fontWeight: "600",
                    lineHeight: 1.5,
                  }}
                >
                  {success}
                </div>
              )}

              {error && !loading && (
                <div
                  style={{
                    marginTop: "14px",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    fontSize: "13px",
                    fontWeight: "600",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
