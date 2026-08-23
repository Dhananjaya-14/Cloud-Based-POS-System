import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaChevronDown, FaCheck, FaMinus, FaPlus, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { deleteProduct, getCategories, getProductById, updateProduct } from "../../services/api";
const cardStyle = {
  border: "1px solid #D9E4F2",
  borderRadius: "14px",
  background: "#FFFFFF",
  boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
  padding: "14px"
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
  boxSizing: "border-box"
};
const sectionTitleStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 10px"
};
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "#2F3A4C",
  marginBottom: "5px"
};
const toggleTrackStyle = {
  width: "34px",
  height: "16px",
  borderRadius: "999px",
  position: "relative",
  background: "#D1D5DB",
  cursor: "pointer",
  transition: "background 0.2s ease"
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
  transition: "transform 0.2s ease"
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
  color: "#15803D"
};
const toShortName = name => {
  if (!name) return "";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.slice(0, 1).toUpperCase() + part.slice(1, 4).toLowerCase()).join(" ");
};
const isImageUrl = value => typeof value === "string" && /^(https?:)?\/\//i.test(value.trim());
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.62)",
  display: "grid",
  placeItems: "center",
  zIndex: 50
};
const modalCardStyle = {
  width: "380px",
  maxWidth: "calc(100vw - 32px)",
  background: "#FFFFFF",
  borderRadius: "10px",
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.30)"
};
const ProductDetails = () => {
  const { t } = useTranslation();
const {
    productId
  } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditPage = location.pathname.endsWith("/edit");
  const isDeletePage = location.pathname.endsWith("/delete");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newAddOn, setNewAddOn] = useState("");
  const [newStation, setNewStation] = useState("");
  const handleAddAddOn = () => {
if (!newAddOn.trim()) return;
    const key = newAddOn.trim();
    setForm(prev => ({
      ...prev,
      add_ons: {
        ...prev.add_ons,
        [key]: true
      }
    }));
    setNewAddOn("");
  };
  const handleAddStation = () => {
if (!newStation.trim()) return;
    const key = newStation.trim();
    setForm(prev => ({
      ...prev,
      stations: {
        ...prev.stations,
        [key]: true
      }
    }));
    setNewStation("");
  };
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
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
      Bacon: true
    },
    stations: {
      Kitchen: true,
      Bar: true
    }
  });
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [productData, categoryData] = await Promise.all([getProductById(productId), getCategories().catch(() => [])]);
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
            Bacon: true
          },
          stations: productData?.stations || {
            Kitchen: true,
            Bar: true
          }
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
  const imagePreview = useMemo(() => {
    if (isImageUrl(form.pro_image)) {
      return <img src={form.pro_image} alt={form.pro_name || "Product"} style={{
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }} />;
    }
    return <span style={{
      fontSize: "22px"
    }}>🍔</span>;
  }, [form.pro_image, form.pro_name]);
  const handleFieldChange = field => event => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm(prev => ({
      ...prev,
      [field]: value,
      ...(field === "pro_name" ? {
        short_name: toShortName(value)
      } : {})
    }));
  };
  const toggleModifier = (group, key) => {
setForm(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !prev[group][key]
      }
    }));
  };
  const handleSave = async () => {
    if (!productId) {
      setError("Missing product id");
      return;
    }
    if (!form.pro_name.trim() || form.pro_qty === "" || form.pro_price === "") {
      setError("Product name, quantity, and sales price are required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const selectedCategoryObj = categories.find(c => c.cat_name === form.category);
      const cat_id = selectedCategoryObj ? selectedCategoryObj.cat_id : null;
      const updated = await updateProduct(productId, {
        pro_name: form.pro_name.trim(),
        pro_qty: Number(form.pro_qty),
        pro_price: Number(form.pro_price),
        pro_image: form.pro_image.trim() || null,
        cat_id: cat_id,
        add_ons: form.add_ons,
        stations: form.stations
      });
      setProduct(updated);
      setSuccess("Product updated successfully");
      setTimeout(() => setSuccess(""), 2200);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!productId) {
      setError("Missing product id");
      return;
    }
    if (!isDeletePage) {
      navigate(`/branch-admin/products/${productId}/delete`);
      return;
    }
    if (!deleteAcknowledged) {
      setError("Please confirm the deletion acknowledgment first.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await deleteProduct(productId);
      navigate("/branch-admin/products");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete product");
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
if (isDeletePage) {
      navigate(`/branch-admin/products/${productId}/edit`);
      return;
    }
    navigate("/branch-admin/products");
  };
  return <div style={{
    display: "flex",
    background: "#F3F4F6",
    minHeight: "100vh"
  }}>
			<Sidebar />

			<div style={{
      flex: 1,
      marginLeft: "240px"
    }}>
				<Header title={t("branch_admin.product_management", "Product Management")} role="Branch Admin" email="branchadmin@gmail.com" showAddUserIcon />

				<div style={{
        padding: "18px 20px 24px"
      }}>
					<button type="button" onClick={() => navigate("/branch-admin/products")} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          border: "none",
          background: "transparent",
          color: "#6B7280",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          marginBottom: "10px"
        }}>
						<FaArrowLeft />
						<span>{t("branch_admin.view_details", "View details")}</span>
					</button>

					<div style={{
          display: "grid",
          gridTemplateColumns: "1.06fr 0.94fr",
          gap: "24px",
          alignItems: "start"
        }}>
						<div>
							<h1 style={{
              margin: "0 0 14px",
              fontSize: "24px",
              fontWeight: "800",
              color: "#0F172A"
            }}>
								{isEditPage ? "Edit Product" : "Product Details"}
							</h1>

							{loading ? <div style={{
              color: "#475569",
              fontSize: "14px"
            }}>{t("branch_admin.loading_product_details", "Loading product details...")}</div> : error ? <div style={{
              color: "#B91C1C",
              fontSize: "14px",
              marginBottom: "10px"
            }}>{error}</div> : <>
									<div style={{
                ...cardStyle,
                marginBottom: "14px"
              }}>
										<div style={{
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.85fr",
                  gap: "12px",
                  marginBottom: "10px"
                }}>
											<div>
												<label style={labelStyle}>{t("branch_admin.product_name", "Product Name")}</label>
												<input style={inputStyle} value={form.pro_name} onChange={handleFieldChange("pro_name")} />
											</div>
											<div>
												<label style={labelStyle}>{t("branch_admin.short_name", "Short Name")}</label>
												<input style={inputStyle} value={form.short_name} onChange={handleFieldChange("short_name")} />
											</div>
										</div>

										<div style={{
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.85fr",
                  gap: "12px",
                  marginBottom: "10px"
                }}>
											<div>
												<label style={labelStyle}>{t("branch_admin.category", "Category")}</label>
												<div style={{
                      position: "relative"
                    }}>
													<select value={form.category} onChange={handleFieldChange("category")} style={{
                        ...inputStyle,
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        paddingRight: "30px"
                      }}>
														<option value="General">{t("branch_admin.general", "General")}</option>
														{categories.map(category => <option key={category.cat_id} value={category.cat_name}>
																{category.cat_name}
															</option>)}
													</select>
													<FaChevronDown size={10} color="#475569" style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none"
                      }} />
												</div>
											</div>
											<div>
												<label style={labelStyle}>{t("branch_admin.quantity", "Quantity")}</label>
												<input type="number" min="0" style={inputStyle} value={form.pro_qty} onChange={handleFieldChange("pro_qty")} />
											</div>
										</div>

										<div style={{
                  marginBottom: "10px"
                }}>
											<label style={labelStyle}>{t("branch_admin.product_image", "Product Image")}</label>
											<div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
												<button type="button" style={{
                      width: "102px",
                      height: "48px",
                      borderRadius: "12px",
                      border: "1px solid #C9DDF3",
                      background: "#EFF4F8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0
                    }}>
													{imagePreview}
												</button>
												<input placeholder={t("branch_admin.image_url", "Image URL")} style={{
                      ...inputStyle,
                      flex: 1
                    }} value={form.pro_image} onChange={handleFieldChange("pro_image")} />
											</div>
										</div>

										<div>
											<label style={labelStyle}>{t("branch_admin.description", "Description")}</label>
											<textarea style={{
                    ...inputStyle,
                    height: "64px",
                    resize: "none",
                    paddingTop: "8px"
                  }} value={form.description} onChange={handleFieldChange("description")} />
										</div>
									</div>

									<h2 style={{
                ...sectionTitleStyle,
                marginTop: "10px"
              }}>{t("branch_admin.pricing", "Pricing")}</h2>
									<div style={cardStyle}>
										<div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "10px"
                }}>
											<div>
												<label style={labelStyle}>{t("branch_admin.sales_price", "Sales Price")}</label>
												<input type="number" min="0" step="0.01" style={inputStyle} value={form.pro_price} onChange={handleFieldChange("pro_price")} />
											</div>
											<div>
												<label style={labelStyle}>{t("branch_admin.tax_group", "Tax Group")}</label>
												<div style={{
                      position: "relative"
                    }}>
													<select style={{
                        ...inputStyle,
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        paddingRight: "30px"
                      }} value="5%" readOnly>
														<option value="5%">5%</option>
													</select>
													<FaChevronDown size={10} color="#475569" style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none"
                      }} />
												</div>
											</div>
										</div>

										<div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "10px"
                }}>
											<div>
												<label style={labelStyle}>{t("branch_admin.cost_price", "Cost Price")}</label>
												<input type="number" min="0" step="0.01" style={inputStyle} value={form.pro_price} onChange={handleFieldChange("pro_price")} />
											</div>
											<div>
												<label style={labelStyle}>{t("branch_admin.product_code", "Product Code")}</label>
												<input style={inputStyle} value={product?.pro_id ? `SKU: CHB-${String(product.pro_id).padStart(3, "0")}` : ""} readOnly />
											</div>
										</div>

										<div style={{
                  maxWidth: "140px"
                }}>
											<label style={labelStyle}>{t("branch_admin.discount", "Discount")}</label>
											<input style={inputStyle} value="10%" readOnly />
										</div>
									</div>
								</>}
						</div>

						<div style={{
            paddingTop: "34px"
          }}>
							<h2 style={{
              ...sectionTitleStyle,
              fontSize: "20px",
              marginBottom: "8px"
            }}>{t("branch_admin.modifiers", "Modifiers")}</h2>
							<div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "22px"
            }}>
								<div style={cardStyle}>
									<div style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#374151",
                  marginBottom: "8px"
                }}>{t("branch_admin.add_ons", "Add-Ons")}</div>
									<div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
										{Object.entries(form.add_ons).map(([key, value]) => <label key={key} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#374151"
                  }}>
												<span>{key}</span>
												<button type="button" onClick={() => toggleModifier("add_ons", key)} style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer"
                    }}>
													<span style={{
                        ...badgeStyle,
                        background: value ? "#E8F7EC" : "#FCE8E6",
                        color: value ? "#15803D" : "#B91C1C"
                      }}>
														{value ? <FaCheck size={9} /> : <FaTimes size={9} />}
														{value ? "On" : "Off"}
													</span>
												</button>
											</label>)}
									</div>

									{/* Dynamic Add-On Input */}
									<div style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px"
                }}>
										<input placeholder={t("branch_admin.add_new_add_on", "Add new add-on...")} value={newAddOn} onChange={e => setNewAddOn(e.target.value)} style={{
                    flex: 1,
                    height: "26px",
                    borderRadius: "8px",
                    border: "1px solid #D6E2EF",
                    padding: "0 10px",
                    fontSize: "12px",
                    outline: "none",
                    background: "#F8FBFE"
                  }} />
										<button type="button" onClick={handleAddAddOn} style={{
                    height: "26px",
                    padding: "0 12px",
                    background: "#26B44A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}>{t("branch_admin.add", "+ Add")}</button>
									</div>
								</div>

								<div style={cardStyle}>
									<div style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#374151",
                  marginBottom: "8px"
                }}>{t("branch_admin.stations", "Stations")}</div>
									<div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
										{Object.entries(form.stations).map(([key, value]) => <label key={key} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "14px",
                    color: "#374151"
                  }}>
												<span>{key}</span>
												<button type="button" onClick={() => toggleModifier("stations", key)} style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer"
                    }}>
													<span style={{
                        ...badgeStyle,
                        background: value ? "#E8F7EC" : "#FCE8E6",
                        color: value ? "#15803D" : "#B91C1C"
                      }}>
														{value ? <FaCheck size={9} /> : <FaTimes size={9} />}
														{value ? "On" : "Off"}
													</span>
												</button>
											</label>)}
									</div>

									{/* Dynamic Station Input */}
									<div style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px"
                }}>
										<input placeholder={t("branch_admin.add_new_station", "Add new station...")} value={newStation} onChange={e => setNewStation(e.target.value)} style={{
                    flex: 1,
                    height: "26px",
                    borderRadius: "8px",
                    border: "1px solid #D6E2EF",
                    padding: "0 10px",
                    fontSize: "12px",
                    outline: "none",
                    background: "#F8FBFE"
                  }} />
										<button type="button" onClick={handleAddStation} style={{
                    height: "26px",
                    padding: "0 12px",
                    background: "#26B44A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}>{t("branch_admin.add", "+ Add")}</button>
									</div>
								</div>
							</div>

							<h2 style={{
              ...sectionTitleStyle,
              fontSize: "20px",
              marginTop: "22px",
              marginBottom: "8px"
            }}>{t("branch_admin.track_inventory", "Track Inventory")}</h2>
							<div style={cardStyle}>
										<div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px"
              }}>
											<div style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#374151"
                }}>{t("branch_admin.track_inventory", "Track Inventory")}</div>
									<button type="button" onClick={() => setForm(prev => ({
                  ...prev,
                  track_inventory: !prev.track_inventory
                }))} style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer"
                }}>
										<div style={{
                    ...toggleTrackStyle,
                    background: form.track_inventory ? "#1769AA" : "#CBD5E1"
                  }}>
											<div style={{
                      ...toggleKnobStyle,
                      transform: form.track_inventory ? "translateX(18px)" : "translateX(0)"
                    }} />
										</div>
									</button>
								</div>

								<div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px"
              }}>
									<div>
										<label style={labelStyle}>{t("branch_admin.current_stock", "Current stock")}</label>
										<div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
											<button type="button" onClick={() => setForm(prev => ({
                      ...prev,
                      pro_qty: String(Math.max(0, Number(prev.pro_qty || 0) - 1))
                    }))} style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer"
                    }}>
												<FaMinus size={9} color="#475569" />
											</button>
											<input style={inputStyle} value={form.pro_qty} onChange={handleFieldChange("pro_qty")} />
											<button type="button" onClick={() => setForm(prev => ({
                      ...prev,
                      pro_qty: String(Number(prev.pro_qty || 0) + 1)
                    }))} style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer"
                    }}>
												<FaPlus size={9} color="#475569" />
											</button>
										</div>
									</div>
									<div>
										<label style={labelStyle}>{t("branch_admin.low_stock", "Low stock")}</label>
										<input style={inputStyle} value={form.low_stock} onChange={handleFieldChange("low_stock")} />
									</div>
								</div>
							</div>

							<div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "14px",
              marginTop: "24px"
            }}>
								<button type="button" onClick={handleCancel} style={{
                minWidth: "120px",
                height: "40px",
                borderRadius: "10px",
                border: "none",
                background: "#FFFFFF",
                color: "#1F2937",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                cursor: "pointer",
                fontWeight: "700"
              }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
								{isEditPage && <button type="button" onClick={handleDelete} disabled={saving} style={{
                minWidth: "132px",
                height: "40px",
                borderRadius: "10px",
                border: "none",
                background: "#F24C45",
                color: "#FFFFFF",
                cursor: saving ? "wait" : "pointer",
                fontWeight: "700"
              }}>{t("branch_admin.delete_product", "Delete Product")}</button>}
								<button type="button" onClick={handleSave} disabled={saving} style={{
                minWidth: "138px",
                height: "40px",
                borderRadius: "10px",
                border: "none",
                background: saving ? "#22A84A" : "#26B44A",
                color: "#FFFFFF",
                cursor: saving ? "wait" : "pointer",
                fontWeight: "700"
              }}>
									{saving ? t("buttons.saving", "Saving...") : isEditPage ? t("buttons.update_product", "Update Product") : t("buttons.edit_product", "Edit Product")}
								</button>
							</div>

							{success && <div style={{
              marginTop: "10px",
              color: "#15803D",
              fontSize: "14px"
            }}>{success}</div>}
						</div>
					</div>

					{isDeletePage && <div style={modalOverlayStyle}>
							<div style={modalCardStyle}>
								<div style={{
              padding: "18px 20px 10px"
            }}>
									<h3 style={{
                margin: 0,
                fontSize: "18px",
                lineHeight: 1.2,
                color: "#111827",
                fontWeight: "800"
              }}>{t("branch_admin.delete_product", "Delete Product?")}</h3>
									<p style={{
                margin: "8px 0 0",
                fontSize: "12px",
                lineHeight: 1.45,
                color: "#111827"
              }}>{t("branch_admin.are_you_sure_you_want_to_delete", "Are you sure you want to delete '")}{form.pro_name || "this product"}{t("branch_admin.this_action_cannot_be_undone_and_will_re", "'? This action cannot be undone and will remove the product from all ups menus and historical reports.")}</p>
								</div>

								<div style={{
              padding: "0 20px 10px"
            }}>
									<div style={{
                background: "#CC5A5A",
                borderRadius: "10px",
                color: "#FFFFFF",
                padding: "12px 14px",
                fontSize: "11px",
                lineHeight: 1.35
              }}>
										<div style={{
                  fontWeight: "700",
                  marginBottom: "4px"
                }}>{t("branch_admin.associated_items_to_be_removed", "Associated items to be removed:")}</div>
										<div>{t("branch_admin.2_variant_half_fill_print_tmp_req_rare", "• 2 Variant (Half Fill, Print tmp (Req Rare))")}</div>
										<div>{t("branch_admin.1_modifier_link_cooking_temp_me", "• 1 Modifier Link (Cooking Temp) me")}</div>
									</div>
								</div>

								<div style={{
              padding: "0 20px 16px"
            }}>
									<label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#111827"
              }}>
										<input type="checkbox" checked={deleteAcknowledged} onChange={event => setDeleteAcknowledged(event.target.checked)} />
										<span>{t("branch_admin.i_understand_that_this_action_is_permane", "I understand that this action is permanent.")}</span>
									</label>
								</div>

								<div style={{
              display: "flex",
              justifyContent: "center",
              gap: "14px",
              padding: "0 20px 18px"
            }}>
									<button type="button" onClick={handleCancel} style={{
                minWidth: "76px",
                height: "30px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                color: "#111827",
                cursor: "pointer",
                fontWeight: "500"
              }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
									<button type="button" onClick={handleDelete} disabled={saving} style={{
                minWidth: "76px",
                height: "30px",
                borderRadius: "8px",
                border: "none",
                background: "#EF4444",
                color: "#FFFFFF",
                cursor: saving ? "wait" : "pointer",
                fontWeight: "500"
              }}>
										{saving ? t("buttons.deleting", "Deleting...") : t("buttons.delete", "Delete")}
									</button>
								</div>
							</div>
						</div>}
				</div>
			</div>
		</div>;
};
export default ProductDetails;