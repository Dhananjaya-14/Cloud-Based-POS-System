// Client/src/pages/branch-admin/ProductManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBoxOpen,
  FaChevronDown,
  FaExclamationTriangle,
  FaSearch,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getBranchProducts, updateBranchProduct, deleteBranchProduct } from "../../services/api";
import { 
  getSocket, 
  connectSocket, 
  SOCKET_EVENTS,
  joinBranchInventoryRoom,
  leaveBranchInventoryRoom,
  joinCompanyRoom,
} from "../../services/socket";

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

const getStockStatus = (quantity, lowStockLimit = 10) => {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= lowStockLimit) return "Low stock";
  return "In stock";
};

const resolveProductImage = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return `${IMAGE_BASE_URL}/images/${trimmed.replace(/^\/+/, "")}`;
};

const mapApiProductToTableItem = (product) => {
  const quantity = Number(product.pro_quantity ?? 0);
  const lowStockLimit = Number(product.low_stock_limit ?? 10);
  const price = Number(product.pro_price ?? 0);
  const imageUrl = resolveProductImage(product.pro_image);

  return {
    id: product.Bpro_id,
    imageUrl,
    imageAlt: product.pro_name || "Product",
    name: product.pro_name,
    sku: `SKU: BPRD-${String(product.Bpro_id).padStart(3, "0")}`,
    category: product.cat_name || "General",
    price: `$${price.toFixed(2)}`,
    discount: "0%",
    stock: quantity,
    status: getStockStatus(quantity, lowStockLimit),
    _original: product
  };
};

const ProductManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const branchId = user?.b_id;
  const companyId = user?.com_id;
  const isSubscribedRef = useRef(false);
  
  // Delete confirmation states
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for real-time notifications
  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = sessionStorage.getItem('branchProductNotifications');
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
          sessionStorage.removeItem('branchProductNotifications');
          return [];
        }
      } catch (e) {
        sessionStorage.removeItem('branchProductNotifications');
        return [];
      }
    }
    return [];
  });

  // Save notifications to sessionStorage
  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('branchProductNotifications', JSON.stringify(notifications));
    } else {
      sessionStorage.removeItem('branchProductNotifications');
    }
    window.dispatchEvent(new Event('branch-product-notifications-updated'));
  }, [notifications]);

  // Setup WebSocket listeners
  useEffect(() => {
    if (!branchId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const socket = getSocket();
    if (!socket.connected) {
      connectSocket();
    }

    // Join the branch inventory room
    joinBranchInventoryRoom(branchId);
    
    // Also join company room to receive product notifications from admin
    if (companyId) {
      joinCompanyRoom(companyId);
      console.log(`Branch admin joined company room: ${companyId}`);
    }

    const appendNotification = (type, productName, message, extra = {}) => {
      setNotifications((prev) => {
        const existingNotif = prev.find((notification) => 
          notification.type === type && 
          notification.productName === productName && 
          (new Date() - new Date(notification.timestamp)) < 5000
        );
        if (existingNotif) return prev;

        return [...prev, {
          id: Date.now() + Math.random(),
          type,
          message,
          timestamp: new Date().toISOString(),
          productName,
          ...extra,
        }];
      });
    };

    // Handler for new product added by admin (from company room)
    const handleAdminProductAdded = (data) => {
      console.log("New product added by admin via socket (branch):", data);
      if (data.product && data.company_id === companyId) {
        const productName = data.product.pro_name || 'Product';
        appendNotification(
          'admin_add',
          productName,
          `📢 New product available for branch: "${productName}"`,
          { productId: data.product.pro_id }
        );
      }
    };

    const handleAdminProductUpdated = (data) => {
      console.log("Product updated by admin via socket (branch):", data);
      if (data.product && data.company_id === companyId) {
        const productName = data.product.pro_name || 'Product';
        appendNotification(
          'admin_update',
          productName,
          `✏️ Product updated by admin: "${productName}"`,
          { productId: data.product.pro_id }
        );
      }
    };

    const handleAdminProductDeleted = (data) => {
      console.log("Product deleted by admin via socket (branch):", data);
      if ((data.product || data.pro_id) && data.company_id === companyId) {
        const productName = data.product?.pro_name || data.pro_name || 'Product';
        appendNotification(
          'admin_delete',
          productName,
          `🗑️ Product deleted by admin: "${productName}"`,
          { productId: data.product?.pro_id ?? data.pro_id }
        );
      }
    };

    // Handler for new branch product added
    const handleBranchProductAdded = (data) => {
      console.log("Branch product added via WebSocket:", data);
      if (data.branch_product && data.branch_id === branchId) {
        setProducts(prev => {
          const exists = prev.some(p => p.Bpro_id === data.branch_product.Bpro_id);
          if (exists) return prev;
          return [data.branch_product, ...prev];
        });
        
        setNotifications(prev => {
          const productName = data.branch_product.pro_name || 'Product';
          const existingNotif = prev.find(n => 
            n.type === 'add' && 
            n.productName === productName && 
            (new Date() - new Date(n.timestamp)) < 5000
          );
          if (existingNotif) return prev;
          
          return [...prev, {
            id: Date.now() + Math.random(),
            type: 'add',
            message: `📦 New branch product added: "${productName}"`,
            timestamp: new Date().toISOString(),
            productName: productName
          }];
        });
      }
    };

    // Handler for product updated in branch
    const handleBranchProductUpdated = (data) => {
      console.log("Branch product updated via WebSocket:", data);
      if (data.branch_product && data.branch_id === branchId) {
        setProducts(prev =>
          prev.map(p =>
            p.Bpro_id === data.branch_product.Bpro_id
              ? { ...p, ...data.branch_product }
              : p
          )
        );
        
        setNotifications(prev => {
          const productName = data.branch_product.pro_name || 'Product';
          const existingNotif = prev.find(n => 
            n.type === 'update' && 
            n.productName === productName && 
            (new Date() - new Date(n.timestamp)) < 5000
          );
          if (existingNotif) return prev;
          
          return [...prev, {
            id: Date.now() + Math.random(),
            type: 'update',
            message: `✏️ Branch product updated: "${productName}"`,
            timestamp: new Date().toISOString(),
            productName: productName
          }];
        });
      }
    };

    // Handler for product deleted from branch
    const handleBranchProductDeleted = (data) => {
      console.log("Branch product deleted via WebSocket:", data);
      if (data.Bpro_id && data.branch_id === branchId) {
        const deletedProduct = products.find(p => p.Bpro_id === data.Bpro_id);
        const productName = deletedProduct?.pro_name || data.pro_name || 'Product';
        
        setProducts(prev =>
          prev.filter(p => p.Bpro_id !== data.Bpro_id)
        );
        
        setNotifications(prev => {
          const existingNotif = prev.find(n => 
            n.type === 'delete' && 
            n.productName === productName && 
            (new Date() - new Date(n.timestamp)) < 5000
          );
          if (existingNotif) return prev;
          
          return [...prev, {
            id: Date.now() + Math.random(),
            type: 'delete',
            message: `🗑️ Branch product deleted: "${productName}"`,
            timestamp: new Date().toISOString(),
            productName: productName
          }];
        });
      }
    };

    // Subscribe to events
    socket.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleAdminProductAdded);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleAdminProductUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleAdminProductDeleted);
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, handleBranchProductAdded);
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, handleBranchProductUpdated);
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_DELETED, handleBranchProductDeleted);

    return () => {
      isSubscribedRef.current = false;
      leaveBranchInventoryRoom(branchId);
      socket.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleAdminProductAdded);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleAdminProductUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleAdminProductDeleted);
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, handleBranchProductAdded);
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, handleBranchProductUpdated);
      socket.off(SOCKET_EVENTS.BRANCH_PRODUCT_DELETED, handleBranchProductDeleted);
    };
  }, [branchId, companyId, products]);

  // Load initial products
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const myBranchId = user?.b_id ?? null;
        
        const response = myBranchId ? await getBranchProducts(myBranchId) : [];
        
        if (!isMounted) return;
        setProducts(Array.isArray(response) ? response : []);
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
  }, [user?.u_id, user?.b_id]);

  // Dismiss a specific notification
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const tableProducts = useMemo(() => {
    const mapped = products.map(mapApiProductToTableItem);
    const query = searchTerm.trim().toLowerCase();

    if (!query) return mapped;

    return mapped.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
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
  const lowStockCount = products.filter((item) => {
    const quantity = Number(item.pro_quantity ?? 0);
    return quantity > 0 && quantity <= 10;
  }).length;
  const outOfStockCount = products.filter((item) => Number(item.pro_quantity ?? 0) <= 0).length;

  const handleAdjustStock = async (productId, delta) => {
    if (updatingStockId !== null) return;

    const existing = products.find((item) => item.Bpro_id === productId);
    if (!existing) return;

    const currentQty = Number(existing.pro_quantity ?? 0);
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty === currentQty) return;

    try {
      setUpdatingStockId(productId);
      setError("");
      const updated = await updateBranchProduct(productId, { pro_quantity: nextQty });

      setProducts((prev) =>
        prev.map((item) =>
          item.Bpro_id === productId
            ? {
                ...item,
                ...updated,
                pro_quantity: Number(updated?.pro_quantity ?? nextQty),
              }
            : item
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update stock quantity");
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleDeleteClick = (productId) => {
    const product = products.find((item) => item.Bpro_id === productId);
    setDeleteTargetId(productId);
    setDeleteTargetName(product?.pro_name || "this product");
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteBranchProduct(deleteTargetId);
      setProducts((prev) => prev.filter((item) => item.Bpro_id !== deleteTargetId));
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header
          title="Branch Product Management"
          role="Branch Admin"
          email="branchadmin@gmail.com"
          showAddUserIcon
        />

        <div
          style={{
            padding: "22px 20px",
            marginTop: "20px",
            minHeight: "calc(100vh - 70px)",
          }}
        >
          {/* Notification Container */}
          {notifications.length > 0 && (
            <div
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '420px',
                minWidth: '320px',
                maxHeight: '80vh',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
              className="notifications-container"
            >
              
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#0F172A" }}>
              Branch Product Management
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Button
                label="+  Add Product"
                onClick={() => navigate("/branch-admin/products/add")}
                style={{
                  background: "#0E6DCF",
                  borderRadius: "3px",
                  padding: "10px 18px",
                  fontWeight: "600",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
            <div style={{ ...cardBaseStyle, background: "#BEE8C4" }}>
              <div
                style={{
                  ...statIconWrapStyle,
                  background: "#22C55E",
                }}
              >
                <FaBoxOpen color="#0B3F1D" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>Total Items</div>
                <div style={statValueStyle}>{totalItems}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>

            <div style={{ ...cardBaseStyle, background: "#F3C8DA" }}>
              <div
                style={{
                  ...statIconWrapStyle,
                  background: "#F87171",
                }}
              >
                <FaBell color="#7F1D1D" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>Low Stock</div>
                <div style={statValueStyle}>{lowStockCount}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>

            <div style={{ ...cardBaseStyle, background: "#C8E0EC" }}>
              <div
                style={{
                  ...statIconWrapStyle,
                  background: "#38BDF8",
                }}
              >
                <FaExclamationTriangle color="#0C4A6E" size={12} />
              </div>
              <div style={statTextWrapStyle}>
                <div style={statTitleStyle}>Out Of Stock</div>
                <div style={statValueStyle}>{outOfStockCount}</div>
              </div>
              <div style={statRightSpacerStyle} />
            </div>
          </div>

          {loading && (
            <div style={{ marginBottom: "14px", color: "#475569", fontSize: "14px" }}>
              Loading products...
            </div>
          )}

          {error && (
            <div style={{ marginBottom: "14px", color: "#B91C1C", fontSize: "14px" }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
                padding: "8px 12px",
                flex: 1,
              }}
            >
              <FaSearch color="#9CA3AF" size={14} />
              <input
                type="text"
                placeholder="Search by Name or Code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }}
              />
            </div>

            {["Category : All", "Status : All", "Stock Level : All"].map((option) => (
              <div key={option} style={{ position: "relative", width: "182px" }}>
                <select
                  style={{
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
                    MozAppearance: "none",
                  }}
                >
                  <option>{option}</option>
                </select>
                <FaChevronDown
                  size={11}
                  color="#111827"
                  style={{
                    position: "absolute",
                    right: "17px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ))}
          </div>

          <ProductItemsTable
            products={paginatedProducts}
            onDecreaseStock={(id) => handleAdjustStock(id, -1)}
            onIncreaseStock={(id) => handleAdjustStock(id, 1)}
            updatingStockId={updatingStockId}
            showActions={true}
            onDeleteProduct={handleDeleteClick}
            onEditProduct={null}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={tableProducts.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            width: "min(92vw, 430px)",
            background: "#EBEBEB",
            borderRadius: "22px",
            padding: "32px 20px",
            textAlign: "center",
          }}>
            <div style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              background: "#EF4444",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ color: "#fff", fontSize: "28px" }}>🗑️</span>
            </div>

            <h2 style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: "700",
              color: "#111",
            }}>
              Remove Product?
            </h2>

            <p style={{
              margin: "0 0 8px",
              fontSize: "14px",
              color: "#555",
            }}>
              Are you sure you want to remove
            </p>

            <p style={{
              margin: "0 0 8px",
              fontSize: "16px",
              fontWeight: "700",
              color: "#111",
            }}>
              "{deleteTargetName}"
            </p>

            <p style={{
              margin: "0 0 24px",
              fontSize: "13px",
              color: "#888",
            }}>
              This will remove the product from
              your branch only. It will still
              exist in the admin panel and
              other branches.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTargetId(null);
                  setDeleteTargetName("");
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  height: "48px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "#fff",
                  color: "#333",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  height: "48px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default ProductManagement;