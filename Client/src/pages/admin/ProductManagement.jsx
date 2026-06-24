
// Client/src/pages/admin/ProductManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBoxOpen,
  FaChevronDown,
  FaExclamationTriangle,
  FaSearch,
} from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getProducts, updateProduct } from "../../services/api";
import { 
  connectSocket, 
  getSocket, 
  SOCKET_EVENTS,
  joinCompanyRoom,
  subscribeToProductUpdates 
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

const getStockStatus = (quantity) => {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= 10) return "Low stock";
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
  const quantity = Number(product.pro_qty ?? 0);
  const price = Number(product.pro_price ?? 0);
  const imageUrl = resolveProductImage(product.pro_image);

  return {
    id: product.pro_id,
    imageUrl,
    imageAlt: product.pro_name || "Product",
    name: product.pro_name,
    sku: `SKU: PRD-${String(product.pro_id).padStart(3, "0")}`,
    category: product.cat_name || "General",
    price: `$${price.toFixed(2)}`,
    discount: "0%",
    stock: quantity,
    status: getStockStatus(quantity),
    // Store original product data for updates
    _original: product
  };
};

const ProductManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [userCompanyId, setUserCompanyId] = useState(null);
  
  // State for real-time notifications - stored as an array in sessionStorage
  const [notifications, setNotifications] = useState(() => {
    // Try to load notifications from sessionStorage on component mount
    const savedNotifications = sessionStorage.getItem('productNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Filter out notifications older than 1 hour
        const now = new Date();
        const validNotifications = parsed.filter(notif => {
          const timestamp = new Date(notif.timestamp);
          const diffMinutes = (now - timestamp) / (1000 * 60);
          return diffMinutes < 60;
        });
        if (validNotifications.length > 0) {
          return validNotifications;
        } else {
          sessionStorage.removeItem('productNotifications');
          return [];
        }
      } catch (e) {
        sessionStorage.removeItem('productNotifications');
        return [];
      }
    }
    return [];
  });

  // Save notifications to sessionStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('productNotifications', JSON.stringify(notifications));
    } else {
      sessionStorage.removeItem('productNotifications');
    }
  }, [notifications]);

  // Connect to socket and join company room
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Get user data from token or store
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData.com_id) {
        setUserCompanyId(userData.com_id);
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }

    // Connect socket
    const socket = connectSocket();
    
    // Set up auth for socket
    socket.auth = { token };

    // Handle socket connection
    const handleConnect = () => {
      console.log("Socket connected for product management");
      
      // Join company room if we have company ID
      if (userCompanyId) {
        joinCompanyRoom(userCompanyId);
        console.log(`Joined company room: ${userCompanyId}`);
      }
    };

    socket.on("connect", handleConnect);

    // If socket is already connected, join room immediately
    if (socket.connected && userCompanyId) {
      joinCompanyRoom(userCompanyId);
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [userCompanyId]);

  // Subscribe to product updates
  useEffect(() => {
    if (!userCompanyId) return;

    const socket = getSocket();
    if (!socket) return;

    // Handler for new product added
    const handleNewProduct = (data) => {
      console.log("New product added via socket:", data);
      if (data.product && data.company_id === userCompanyId) {
        setProducts(prev => {
          // Check if product already exists
          const exists = prev.some(p => p.pro_id === data.product.pro_id);
          if (exists) return prev;
          return [...prev, data.product];
        });
        
        // Add new notification to the queue
        setNotifications(prev => [...prev, {
          id: Date.now() + Math.random(), // Unique ID for each notification
          type: 'add',
          message: `📦 New product added: "${data.product.pro_name || 'Product'}"`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    // Handler for product updated
    const handleProductUpdated = (data) => {
      console.log("Product updated via socket:", data);
      if (data.product && data.company_id === userCompanyId) {
        setProducts(prev => 
          prev.map(p => 
            p.pro_id === data.product.pro_id 
              ? { ...p, ...data.product }
              : p
          )
        );
        
        // Add new notification to the queue
        setNotifications(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'update',
          message: `✏️ Product updated: "${data.product.pro_name || 'Product'}"`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    // Handler for product deleted
    const handleProductDeleted = (data) => {
      console.log("Product deleted via socket:", data);
      if (data.pro_id && data.company_id === userCompanyId) {
        setProducts(prev => 
          prev.filter(p => p.pro_id !== data.pro_id)
        );
        
        // Add new notification to the queue
        setNotifications(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: 'delete',
          message: `🗑️ Product deleted: "${data.pro_name || 'Product'}"`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    // Subscribe to events
    socket.on(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleNewProduct);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.NEW_PRODUCT_ADDED, handleNewProduct);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    };
  }, [userCompanyId]);

  // Load initial products
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getProducts();
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
  }, []);

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

  const pageStart =
    tableProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, tableProducts.length);

  const totalItems = products.length;
  const lowStockCount = products.filter((item) => {
    const quantity = Number(item.pro_qty ?? 0);
    return quantity > 0 && quantity <= 10;
  }).length;
  const outOfStockCount = products.filter((item) => Number(item.pro_qty ?? 0) <= 0).length;

  const handleAdjustStock = async (productId, delta) => {
    if (updatingStockId !== null) return;

    const existing = products.find((item) => item.pro_id === productId);
    if (!existing) return;

    const currentQty = Number(existing.pro_qty ?? 0);
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty === currentQty) return;

    try {
      setUpdatingStockId(productId);
      setError("");
      const updated = await updateProduct(productId, { pro_qty: nextQty });

      setProducts((prev) =>
        prev.map((item) =>
          item.pro_id === productId
            ? {
                ...item,
                ...updated,
                pro_qty: Number(updated?.pro_qty ?? nextQty),
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

  const handleViewProduct = (productId) => {
    navigate(`/admin/products/${productId}`);
  };

  const handleEditProduct = (productId) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  const handleDeleteProduct = (productId) => {
    navigate(`/admin/products/${productId}/delete`);
  };

  // Dismiss a specific notification
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  return (
    <div style={{ display: "flex", background: "#F2F4F7", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header title="Product Management" />

        <div
          style={{
            padding: "22px 20px",
            marginTop: "20px",
            minHeight: "calc(100vh - 70px)",
          }}
        >
          {/* Notification Container - Shows all active notifications */}
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
            >
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    backgroundColor: notification.type === 'delete' ? '#FEE2E2' : 
                                    notification.type === 'update' ? '#DBEAFE' : '#D1FAE5',
                    borderLeft: `4px solid ${notification.type === 'delete' ? '#EF4444' : 
                                    notification.type === 'update' ? '#3B82F6' : '#22C55E'}`,
                    borderRadius: '8px',
                    padding: '16px 20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'slideInRight 0.3s ease-out',
                  }}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '15px',
                      color: '#1F2937',
                      marginBottom: '4px'
                    }}>
                      {notification.type === 'delete' ? '❌ Product Deleted' :
                       notification.type === 'update' ? '📝 Product Updated' : '✅ New Product Added'}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#4B5563',
                      fontWeight: '500',
                      lineHeight: '1.5'
                    }}>
                      {notification.message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      marginTop: '4px',
                      fontWeight: '400'
                    }}>
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    style={{
                      background: notification.type === 'delete' ? '#EF4444' :
                                notification.type === 'update' ? '#3B82F6' : '#22C55E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      alignSelf: 'flex-end',
                      minWidth: '70px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.85';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    OK
                  </button>
                </div>
              ))}
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
              Product Management
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#E5E7EB",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  width: "340px",
                }}
              >
                <FaSearch color="#9CA3AF" />
                <input
                  type="text"
                  placeholder="Search Products , SKUs, or Categories"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    width: "100%",
                    fontSize: "14px",
                    color: "#6B7280",
                  }}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Button
                label="+  Add Product"
                onClick={() => navigate("/admin/products/add")}
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
            onViewProduct={handleViewProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            updatingStockId={updatingStockId}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={tableProducts.length}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Add animation styles */}
      <style jsx>{`
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
        
        /* Custom scrollbar for notifications container */
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