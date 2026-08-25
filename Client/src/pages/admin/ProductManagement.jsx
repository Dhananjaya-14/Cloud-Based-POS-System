import { useTranslation } from "react-i18next";
// Client/src/pages/admin/ProductManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBoxOpen, FaChevronDown, FaExclamationTriangle, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getProducts, updateProduct, deleteProduct, deleteBranchProduct, getBranches } from "../../services/api";
import { connectSocket, getSocket, SOCKET_EVENTS, joinCompanyRoom } from "../../services/socket";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");
const cardBaseStyle = {
  flex: "0 1 calc((100% - 60px) / 3)",
  borderRadius: "18px",
  padding: "25px 18px",
  display: "flex",
  alignItems: "center",
  gap: "2px",
  minHeight: "98px",
};

const statIconWrapStyle = {
  width: "30px",
  height: "30px",
  borderRadius: "8px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  transform: "translateX(2px)",
};

const statTextWrapStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: "-6px",
};

const statRightSpacerStyle = {
  width: "18px",
  flexShrink: 0,
};
const statTitleStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#101828",
  lineHeight: 1,
  textAlign: "center",
};
const statValueStyle = {
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: 1.1,
  textAlign: "center",
};

const getStockStatus = quantity => {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= 10) return "Low stock";
  return "In stock";
};

const resolveProductImage = value => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const mapApiProductToTableItem = product => {
  const quantity = Number(product.pro_qty ?? 0);
  const price = Number(product.pro_price ?? 0);
  const imageUrl = resolveProductImage(product.pro_image);
  return {
    id: product.pro_id,
    product_type: product.product_type || "made_to_order",
    imageUrl,
    imageAlt: product.pro_name || "Product",
    name: product.pro_name,
    sku: `SKU: PRD-${String(product.pro_id).padStart(3, "0")}`,
    category: product.cat_name || "General",
    price: `$${price.toFixed(2)}`,
    discount: "0%",
    stock: quantity,
    status: getStockStatus(quantity),
    _original: product
  };
};

const ProductManagement = () => {
const { t } = useTranslation();
const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [userCompanyId, setUserCompanyId] = useState(null);
  const isSubscribedRef = useRef(false);

  // Delete modal states
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteOption, setDeleteOption] = useState("complete");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);

  // State for real-time notifications - stored as an array in sessionStorage
  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = sessionStorage.getItem('adminProductNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        const now = new Date();
        const validNotifications = parsed.filter(notif => {
          const timestamp = new Date(notif.timestamp);
          const diffMinutes = (now - timestamp) / (1000 * 60);
          return diffMinutes < 60;
        });
        if (validNotifications.length > 0) {
          return validNotifications;
        } else {
          sessionStorage.removeItem('adminProductNotifications');
          return [];
        }
      } catch (e) {
        sessionStorage.removeItem('adminProductNotifications');
        return [];
      }
    }
    return [];
  });

  // Save notifications to sessionStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('adminProductNotifications', JSON.stringify(notifications));
    } else {
      sessionStorage.removeItem('adminProductNotifications');
    }
  }, [notifications]);

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [toasts]);
  const showToastMessage = (message, type = "success") => {
setToasts(prev => [...prev, {
      id: Date.now() + Math.random(),
      message,
      type
    }]);
  };
  const removeToast = toastId => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  // Connect to socket and join company room
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData.com_id) {
        setUserCompanyId(userData.com_id);
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
    const socket = connectSocket();
    socket.auth = {
      token
    };
    const handleConnect = () => {
     console.log("Socket connected for admin product management");
      if (userCompanyId) {
        joinCompanyRoom(userCompanyId);
        console.log(`Joined company room: ${userCompanyId}`);
      }
    };
    socket.on("connect", handleConnect);
    if (socket.connected && userCompanyId) {
      joinCompanyRoom(userCompanyId);
    }
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [userCompanyId]);

  // Subscribe to product updates
  useEffect(() => {
    if (!userCompanyId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;
    const socket = getSocket();
    if (!socket) return;

    // Handler for new product added
    const handleNewProduct = data => {
      console.log("New product added via socket (admin):", data);
      if (data.product && data.company_id === userCompanyId) {
        setProducts(prev => {
          const exists = prev.some(p => p.pro_id === data.product.pro_id);
          if (exists) return prev;
          return [...prev, data.product];
        });
        setNotifications(prev => {
          const productName = data.product.pro_name || 'Product';
          const existingNotif = prev.find(n => n.type === 'add' && n.productName === productName && new Date() - new Date(n.timestamp) < 5000);
          if (existingNotif) return prev;
          return [...prev, {
            id: Date.now() + Math.random(),
            type: 'add',
            message: `📦 New product added: "${productName}"`,
            timestamp: new Date().toISOString(),
            productName: productName
          }];
        });
      }
    };

    // Handler for product updated
    const handleProductUpdated = data => {
      console.log("Product updated via socket (admin):", data);
      if (data.product && data.company_id === userCompanyId) {
        setProducts(prev => prev.map(p => p.pro_id === data.product.pro_id ? {
          ...p,
          ...data.product
        } : p));
        setNotifications(prev => {
          const productName = data.product.pro_name || 'Product';
          const existingNotif = prev.find(n => n.type === 'update' && n.productName === productName && new Date() - new Date(n.timestamp) < 5000);
          if (existingNotif) return prev;
          return [...prev, {
            id: Date.now() + Math.random(),
            type: 'update',
            message: `✏️ Product updated: "${productName}"`,
            timestamp: new Date().toISOString(),
            productName: productName
          }];
        });
      }
    };

    // Handler for product deleted
    const handleProductDeleted = data => {
      console.log("Product deleted via socket (admin):", data);
      if (data.pro_id && data.company_id === userCompanyId) {
        const deletedProduct = products.find(p => p.pro_id === data.pro_id);
        const productName = deletedProduct?.pro_name || data.pro_name || 'Product';
        setProducts(prev => prev.filter(p => p.pro_id !== data.pro_id));
      }
    };
    socket.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleNewProduct);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    return () => {
      isSubscribedRef.current = false;
      socket.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleNewProduct);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    };
  }, [userCompanyId, products]);

  // Load initial products
  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const [response, branchList] = await Promise.all([getProducts(), getBranches()]);
        if (!isMounted) return;
        setProducts(Array.isArray(response) ? response : []);
        setBranches(Array.isArray(branchList) ? branchList : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.message || "Failed to load products");
        setProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);
  const tableProducts = useMemo(() => {
    const mapped = products.map(mapApiProductToTableItem);
    const query = searchTerm.trim().toLowerCase();
    if (!query) return mapped;
    return mapped.filter(item => {
      return item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    });
  }, [products, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(tableProducts.length / itemsPerPage));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [tableProducts, currentPage]);
  const pageStart = tableProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, tableProducts.length);
  const totalItems = products.length;
  const lowStockCount = products.filter(item => {
    const quantity = Number(item.pro_qty ?? 0);
    return quantity > 0 && quantity <= 10;
  }).length;
  const outOfStockCount = products.filter(item => Number(item.pro_qty ?? 0) <= 0).length;
  const handleAdjustStock = async (productId, delta) => {
    if (updatingStockId !== null) return;
    const existing = products.find(item => item.pro_id === productId);
    if (!existing) return;
    const currentQty = Number(existing.pro_qty ?? 0);
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty === currentQty) return;
    try {
      setUpdatingStockId(productId);
      setError("");
      const updated = await updateProduct(productId, {
        pro_qty: nextQty
      });
      setProducts(prev => prev.map(item => item.pro_id === productId ? {
        ...item,
        ...updated,
        pro_qty: Number(updated?.pro_qty ?? nextQty)
      } : item));
      showToastMessage(`Stock updated for "${existing.pro_name || "Product"}".`, "success");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to update stock quantity";
      setError(message);
      showToastMessage(message, "error");
    } finally {
      setUpdatingStockId(null);
    }
  };
  const handleViewProduct = productId => {
    navigate(`/admin/products/${productId}`);
  };
  const handleEditProduct = productId => {
    navigate(`/admin/products/${productId}/edit`);
  };
  const handleDeleteProduct = productId => {
    const product = products.find(p => p.pro_id === productId);
    if (product) {
      setDeleteTargetId(productId);
      setDeleteTargetName(product.pro_name || "Product");
      setShowDeletePopup(true);
      setDeleteOption("complete");
      setSelectedBranchId("");
    }
  };
  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      setError("");
      if (deleteOption === "complete") {
        await deleteProduct(deleteTargetId);
      } else if (deleteOption === "branch" && selectedBranchId) {
        await deleteBranchProduct(deleteTargetId, selectedBranchId);
      } else {
        setError("Please select a branch for branch deletion");
        setIsDeleting(false);
        return;
      }

      // Remove from local state
      setProducts(prev => prev.filter(p => p.pro_id !== deleteTargetId));

      // Show success notification

      showToastMessage(`Product "${deleteTargetName}" deleted successfully.`, "success");

      // Close popup
      setShowDeletePopup(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
      setSelectedBranchId("");
      setDeleteOption("complete");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to delete product";
      setError(message);
      showToastMessage(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };
  const closeDeletePopup = () => {
if (isDeleting) return;
    setShowDeletePopup(false);
    setDeleteTargetId(null);
    setDeleteTargetName("");
    setSelectedBranchId("");
    setDeleteOption("complete");
    setError("");
  };
  const dismissNotification = notificationId => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };
  return <div style={{
    display: "flex",
    background: "#F2F4F7",
    minHeight: "100vh"
  }}>
      <Sidebar />

      <div style={{
      flex: 1,
      marginLeft: "240px"
    }}>
        <Header title={t("company_admin.product_management", "Product Management")} />

        <div style={{
        padding: "22px 20px",
        marginTop: "20px",
        minHeight: "calc(100vh - 70px)"
      }}>
          {/* Toast Notifications */}
          {toasts.length > 0 && <div style={{
          position: 'fixed',
          top: '82px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: 'min(380px, calc(100vw - 32px))'
        }}>
              {toasts.map(toast => <div key={toast.id} style={{
            background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
            borderLeft: `4px solid ${toast.type === 'error' ? '#EF4444' : '#22C55E'}`,
            borderRadius: '8px',
            padding: '14px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            color: toast.type === 'error' ? '#991B1B' : '#065F46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
                  <span style={{
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: 1.4
            }}>{toast.message}</span>
                  <button type="button" onClick={() => removeToast(toast.id)} style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.7,
              padding: '4px',
              display: 'inline-flex'
            }} aria-label="Dismiss notification">
                    <FaTimes />
                  </button>
                </div>)}
            </div>}





          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px"
        }}>
            <h1 style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: "700",
            color: "#0F172A"
          }}>{t("company_admin.product_management", "Product Management")}</h1>

            <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
              <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#E5E7EB",
              borderRadius: "8px",
              padding: "8px 12px",
              width: "340px"
            }}>
                <FaSearch color="#9CA3AF" />
                <input type="text" placeholder={t("company_admin.search_products_skus_or_categories", "Search Products , SKUs, or Categories")} style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: "14px",
                color: "#6B7280"
              }} onChange={event => setSearchTerm(event.target.value)} />
              </div>
              <Button label={t("buttons.add_product", "+  Add Product")} onClick={() => navigate("/admin/products/add")} style={{
              background: "#0E6DCF",
              borderRadius: "3px",
              padding: "10px 18px",
              fontWeight: "600"
            }} />
            </div>
          </div>

          <div style={{
          display: "flex",
          gap: "15px",
          marginBottom: "30px"
        }}>
            <div style={{
            ...cardBaseStyle,
            background: "#BEE8C4"
          }}>
              <div style={{
              ...statIconWrapStyle,
              background: "#22C55E"
            }}>
                <FaBoxOpen color="#0B3F1D" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>{t("company_admin.total_items", "Total Items")}</div>
                <div style={statValueStyle}>{totalItems}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>

            <div style={{
            ...cardBaseStyle,
            background: "#F3C8DA"
          }}>
              <div style={{
              ...statIconWrapStyle,
              background: "#F87171"
            }}>
                <FaBell color="#7F1D1D" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>{t("company_admin.low_stock", "Low Stock")}</div>
                <div style={statValueStyle}>{lowStockCount}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>

            <div style={{
            ...cardBaseStyle,
            background: "#C8E0EC"
          }}>
              <div style={{
              ...statIconWrapStyle,
              background: "#38BDF8"
            }}>
                <FaExclamationTriangle color="#0C4A6E" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>{t("company_admin.out_of_stock", "Out Of Stock")}</div>
                <div style={statValueStyle}>{outOfStockCount}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>
          </div>

          {loading && <div style={{
          marginBottom: "14px",
          color: "#475569",
          fontSize: "14px"
        }}>{t("company_admin.loading_products", "Loading products...")}</div>}

          {error && <div style={{
          marginBottom: "14px",
          color: "#B91C1C",
          fontSize: "14px"
        }}>{error}</div>}

          <div style={{
          display: "flex",
          gap: "14px",
          marginBottom: "24px"
        }}>
            <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
            padding: "8px 12px",
            flex: 1
          }}>
              <FaSearch color="#9CA3AF" size={14} />
              <input type="text" placeholder={t("company_admin.search_by_name_or_code", "Search by Name or Code")} style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "14px"
            }} />
            </div>

            {["Category : All", "Status : All", "Stock Level : All"].map(option => <div key={option} style={{
            position: "relative",
            width: "182px"
          }}>
                <select style={{
              width: "100%",
              height: "36px",
              background: "#fff",
              borderRadius: "13px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.22)",
              border: "1px solid #D9DCE1",
              padding: "0 34px 0 14px",
              fontSize: "13px",
              fontWeight: "500",
              color: "#4B5563",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none"
            }}>
                  <option>{option}</option>
                </select>
                <FaChevronDown size={11} color="#111827" style={{
              position: "absolute",
              right: "17px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none"
            }} />
              </div>)}
          </div>

          <ProductItemsTable products={paginatedProducts} hideStockColumn={true} hideStatusColumn={true} showTypeColumn={true} onViewProduct={handleViewProduct} onEditProduct={handleEditProduct} onDeleteProduct={handleDeleteProduct} currentPage={currentPage} totalPages={totalPages} totalItems={tableProducts.length} pageStart={pageStart} pageEnd={pageEnd} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeletePopup && <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000
    }} onClick={closeDeletePopup}>
          <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "32px",
        maxWidth: "480px",
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }} onClick={e => e.stopPropagation()}>
            <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px"
        }}>
              <div style={{
            background: "#FEE2E2",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
                <FaTrash color="#DC2626" size={20} />
              </div>
              <h2 style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "#111827"
          }}>{t("company_admin.delete_product", "Delete Product")}</h2>
            </div>

            <p style={{
          margin: "0 0 20px 0",
          color: "#4B5563",
          fontSize: "15px",
          lineHeight: "1.6"
        }}>{t("company_admin.are_you_sure_you_want_to_delete", "Are you sure you want to delete")}<strong>"{deleteTargetName}"</strong>?
            </p>

            <div style={{
          marginBottom: "20px"
        }}>
              <label style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
            fontSize: "14px",
            color: "#374151"
          }}>{t("company_admin.delete_option", "Delete Option")}</label>
              <div style={{
            display: "flex",
            gap: "12px",
            flexDirection: "column"
          }}>
                <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              cursor: "pointer"
            }}>
                  <input type="radio" value="complete" checked={deleteOption === "complete"} onChange={e => setDeleteOption(e.target.value)} />
                  <span>{t("company_admin.complete_deletion_from_all_branches", "Complete Deletion (from all branches)")}</span>
                </label>
                <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              cursor: "pointer"
            }}>
                  <input type="radio" value="branch" checked={deleteOption === "branch"} onChange={e => setDeleteOption(e.target.value)} />
                  <span>{t("company_admin.delete_from_specific_branch_only", "Delete from specific branch only")}</span>
                </label>
              </div>
            </div>

            {deleteOption === "branch" && <div style={{
          marginBottom: "20px"
        }}>
                <label style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
            fontSize: "14px",
            color: "#374151"
          }}>{t("company_admin.select_branch", "Select Branch")}</label>
                <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} style={{
            width: "100%",
            height: "42px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            padding: "0 12px",
            fontSize: "14px",
            outline: "none",
            background: "white"
          }}>
                  <option value="">{t("company_admin.select_a_branch", "Select a branch...")}</option>
                  {branches.map(branch => <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.branch_name}
                    </option>)}
                </select>
              </div>}

            {error && <div style={{
          background: "#FEE2E2",
          color: "#991B1B",
          padding: "10px 12px",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "14px"
        }}>
                {error}
              </div>}

            <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}>
              <button onClick={closeDeletePopup} disabled={isDeleting} style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            background: "white",
            color: "#374151",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isDeleting ? "not-allowed" : "pointer",
            opacity: isDeleting ? 0.6 : 1
          }}>{t("company_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
              <button onClick={confirmDelete} disabled={isDeleting || deleteOption === "branch" && !selectedBranchId} style={{
            padding: "10px 24px",
            borderRadius: "8px",
            border: "none",
            background: "#DC2626",
            color: "white",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isDeleting || deleteOption === "branch" && !selectedBranchId ? "not-allowed" : "pointer",
            opacity: isDeleting || deleteOption === "branch" && !selectedBranchId ? 0.6 : 1
          }}>
                {isDeleting ? t("buttons.deleting", "Deleting...") : t("buttons.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .notifications-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .notifications-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .notifications-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>;
};
export default ProductManagement;