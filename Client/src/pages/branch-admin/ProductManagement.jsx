import { useTranslation } from "react-i18next";
// Client/src/pages/branch-admin/ProductManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBoxOpen, FaChevronDown, FaExclamationTriangle, FaSearch } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import ReorderModal from "../../components/branch-admin/ReorderModal";
import { getBranchProducts, updateBranchProduct, deleteBranchProduct, addBranchProductStock, getBranchProductIngredientStatus } from "../../services/api";
import { getSocket, connectSocket, SOCKET_EVENTS, joinBranchInventoryRoom, leaveBranchInventoryRoom, joinCompanyRoom } from "../../services/socket";
import { formatProductDiscount } from "../../utils/productDiscount";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

const cardBaseStyle = {
  flex: "0 1 calc((100% - 60px) / 3)",
  borderRadius: "18px",
  padding: "25px 18px",
  display: "flex",
  alignItems: "center",
  gap: "2px",
  minHeight: "98px"
};
const statIconWrapStyle = {
  width: "30px",
  height: "30px",
  borderRadius: "8px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  transform: "translateX(2px)"
};
const statTextWrapStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: "-6px"
};
const statRightSpacerStyle = {
  width: "18px",
  flexShrink: 0
};
const statTitleStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#101828",
  lineHeight: 1,
  textAlign: "center"
};
const statValueStyle = {
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: 1.1,
  textAlign: "center"
};

const getStockStatus = (quantity, lowStockLimit = 10) => {
  if (quantity <= 0) return "Out of stock";
  if (quantity <= lowStockLimit) return "Low stock";
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
  const quantity = Number(product.pro_quantity ?? 0);
  const lowStockLimit = Number(product.low_stock_limit ?? 10);
  const price = Number(product.pro_price ?? 0);
  const imageUrl = resolveProductImage(product.pro_image);
  const productType = product.product_type || "made_to_order";

  // made_to_order products' status depends on ingredient stock (calculated
  // server-side via RECIPE/Raw_Material). pre_made/finished products use
  // their own pro_quantity vs low_stock_limit instead.
  const status = productType === "made_to_order" ? product.calculated_status || "In stock" : getStockStatus(quantity, lowStockLimit);

  return {
    id: product.Bpro_id,
    product_type: productType,
    imageUrl,
    imageAlt: product.pro_name || "Product",
    name: product.pro_name,
    sku: `SKU: BPRD-${String(product.Bpro_id).padStart(3, "0")}`,
    category: product.cat_name || "General",
    price: `$${price.toFixed(2)}`,
    discount: formatProductDiscount(product),
    stock: quantity,
    status,
    _original: product
  };
};

/* ===== Design components (Branch Product Management redesign) ===== */
const BP_SELECT = "cursor-pointer rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0F9B8E] disabled:cursor-not-allowed disabled:opacity-50";
const BP_TONES = {
  teal: "bg-[#0F9B8E]/10 text-[#0F9B8E]",
  brass: "bg-[#D9A15C]/15 text-[#D9A15C]",
  coral: "bg-[#E0654F]/10 text-[#E0654F]"
};
function BpKpiCard({ icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-5">
      <div className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] ${BP_TONES[tone]}`}>{icon}</div>
      <div>
        <div className="mb-[3px] text-[12.5px] text-[#5B6470]">{label}</div>
        <div className="font-space text-[22px] font-bold leading-none text-[#071E38]">{value}</div>
      </div>
    </div>
  );
}
/* ===== End of design components ===== */

const ProductManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockLevelFilter, setStockLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const branchId = user?.b_id;
  const companyId = user?.com_id;
  const isSubscribedRef = useRef(false);

  // Delete confirmation states
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Product type tabs and stock modal
  const [activeTab, setActiveTab] = useState("made_to_order");
  const [stockModalItem, setStockModalItem] = useState(null);
  const [stockModalQty, setStockModalQty] = useState("");

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
      setNotifications(prev => {
        const existingNotif = prev.find(notification => notification.type === type && notification.productName === productName && new Date() - new Date(notification.timestamp) < 5000);
        if (existingNotif) return prev;
        return [...prev, {
          id: Date.now() + Math.random(),
          type,
          message,
          timestamp: new Date().toISOString(),
          productName,
          ...extra
        }];
      });
    };

    // Handler for new product added by admin (from company room)
    const handleAdminProductAdded = data => {
      console.log("New product added by admin via socket (branch):", data);
      if (data.product && data.company_id === companyId) {
        const productName = data.product.pro_name || 'Product';
        appendNotification('admin_add', productName, `📢 New product available for branch: "${productName}"`, {
          productId: data.product.pro_id
        });
      }
    };

    const handleAdminProductUpdated = data => {
      console.log("Product updated by admin via socket (branch):", data);
      if (data.product && data.company_id === companyId) {
        const productName = data.product.pro_name || 'Product';
        appendNotification('admin_update', productName, `✏️ Product updated by admin: "${productName}"`, {
          productId: data.product.pro_id
        });
      }
    };

    const handleAdminProductDeleted = data => {
      console.log("Product deleted by admin via socket (branch):", data);
      if ((data.product || data.pro_id) && data.company_id === companyId) {
        const productName = data.product?.pro_name || data.pro_name || 'Product';
        appendNotification('admin_delete', productName, `🗑️ Product deleted by admin: "${productName}"`, {
          productId: data.product?.pro_id ?? data.pro_id
        });
      }
    };

    // Handler for new branch product added
    const handleBranchProductAdded = data => {
      console.log("Branch product added via WebSocket:", data);
      if (data.branch_product && data.branch_id === branchId) {
        setProducts(prev => {
          const exists = prev.some(p => p.Bpro_id === data.branch_product.Bpro_id);
          if (exists) return prev;
          return [data.branch_product, ...prev];
        });
        setNotifications(prev => {
          const productName = data.branch_product.pro_name || 'Product';
          const existingNotif = prev.find(n => n.type === 'add' && n.productName === productName && new Date() - new Date(n.timestamp) < 5000);
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
    const handleBranchProductUpdated = data => {
      console.log("Branch product updated via WebSocket:", data);
      if (data.branch_product && data.branch_id === branchId) {
        setProducts(prev => prev.map(p => p.Bpro_id === data.branch_product.Bpro_id ? {
          ...p,
          ...data.branch_product
        } : p));
        setNotifications(prev => {
          const productName = data.branch_product.pro_name || 'Product';
          const existingNotif = prev.find(n => n.type === 'update' && n.productName === productName && new Date() - new Date(n.timestamp) < 5000);
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
    const handleBranchProductDeleted = data => {
      console.log("Branch product deleted via WebSocket:", data);
      if (data.Bpro_id && data.branch_id === branchId) {
        const deletedProduct = products.find(p => p.Bpro_id === data.Bpro_id);
        const productName = deletedProduct?.pro_name || data.pro_name || 'Product';
        setProducts(prev => prev.filter(p => p.Bpro_id !== data.Bpro_id));
        setNotifications(prev => {
          const existingNotif = prev.find(n => n.type === 'delete' && n.productName === productName && new Date() - new Date(n.timestamp) < 5000);
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
  const dismissNotification = notificationId => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const tableProducts = useMemo(() => {
    let mapped = products.map(mapApiProductToTableItem);
    if (activeTab === "made_to_order") {
      mapped = mapped.filter(item => item.product_type === "made_to_order");
    } else if (activeTab === "pre_made") {
      mapped = mapped.filter(item => item.product_type === "pre_made");
    } else if (activeTab === "finished") {
      mapped = mapped.filter(item => item.product_type === "finished");
    }
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      mapped = mapped.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    if (categoryFilter !== "all") {
      mapped = mapped.filter(item => item.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      mapped = mapped.filter(item => item.status === statusFilter);
    }
    // Stock level uses the stock quantity (not used for made-to-order products)
    if (stockLevelFilter !== "all" && activeTab !== "made_to_order") {
      mapped = mapped.filter(item => {
        const qty = Number(item.stock ?? 0);
        if (stockLevelFilter === "out") return qty <= 0;
        if (stockLevelFilter === "low") return qty > 0 && qty <= 10;
        return qty > 10;
      });
    }
    return mapped;
  }, [products, searchTerm, activeTab, categoryFilter, statusFilter, stockLevelFilter]);

  useEffect(() => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockLevelFilter("all");
  }, [activeTab]);

  useEffect(() => {
    // Reset filters when search/filter changes (kept for consistency, no pagination reset needed now)
  }, [searchTerm, categoryFilter, stockLevelFilter]);

  const totalItems = products.length;
  const lowStockCount = products.filter(item => {
    const quantity = Number(item.pro_quantity ?? 0);
    return quantity > 0 && quantity <= 10;
  }).length;
  const outOfStockCount = products.filter(item => Number(item.pro_quantity ?? 0) <= 0).length;

  const handleAdjustStock = async (productId, delta) => {
    if (updatingStockId !== null) return;
    const existing = products.find(item => item.Bpro_id === productId);
    if (!existing) return;
    const currentQty = Number(existing.pro_quantity ?? 0);
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty === currentQty) return;
    try {
      setUpdatingStockId(productId);
      setError("");
      const updated = await updateBranchProduct(productId, {
        pro_quantity: nextQty
      });
      setProducts(prev => prev.map(item => item.Bpro_id === productId ? {
        ...item,
        ...updated,
        pro_quantity: Number(updated?.pro_quantity ?? nextQty)
      } : item));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update stock quantity");
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleConfirmAddStock = async () => {
    if (!stockModalItem || !stockModalQty) return;
    const qty = parseInt(stockModalQty, 10);
    if (isNaN(qty) || qty <= 0) return;
    try {
      setUpdatingStockId(stockModalItem.id);
      setError("");
      const updated = await addBranchProductStock(stockModalItem.id, qty);
      setProducts(prev => prev.map(item => item.Bpro_id === stockModalItem.id ? {
        ...item,
        ...updated
      } : item));
      setStockModalItem(null);
      setStockModalQty("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add stock");
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleDeleteClick = productId => {
    const product = products.find(item => item.Bpro_id === productId);
    setDeleteTargetId(productId);
    setDeleteTargetName(product?.pro_name || "this product");
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await deleteBranchProduct(deleteTargetId);
      setProducts(prev => prev.filter(item => item.Bpro_id !== deleteTargetId));
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
    <div style={{ display: "flex", background: "#F7F5F0", minHeight: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px", minWidth: 0 }}>
        <Header title={t("branch_admin.branch_product_management", "Branch Product Management")} />

        <div className="px-9 py-8">
          {/* Notification Container */}
          {notifications.length > 0 && (
            <div style={{
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
              paddingRight: '4px'
            }} className="notifications-container">
              {notifications.map(notification => (
                <div key={notification.id} style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderLeft: `4px solid ${notification.type === 'admin_add' || notification.type === 'add' ? '#22C55E' : notification.type === 'admin_update' || notification.type === 'update' ? '#3B82F6' : '#EF4444'}`,
                  animation: 'slideInRight 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px', color: '#111827' }}>{notification.message}</span>
                    <button onClick={() => dismissNotification(notification.id)} style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '16px',
                      lineHeight: 1
                    }}>
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mb-1 font-space text-xl font-bold text-[#071E38]">{t("branch_admin.products_title", "Products")}</h2>
              <p className="text-[13px] text-[#5B6470]">{totalItems} {t("branch_admin.products_in_this_branch", "products in this branch")}</p>
            </div>
            <button type="button" onClick={() => navigate("/branch-admin/products/add")} className="inline-flex flex-shrink-0 items-center gap-[7px] rounded-lg bg-[#071E38] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#0F9B8E]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              {t("branch_admin.add_product", "Add Product")}
            </button>
          </div>

          {/* Summary cards */}
          <div className="mb-[22px] grid grid-cols-1 gap-[18px] md:grid-cols-3">
            <BpKpiCard tone="teal" label={t("branch_admin.total_items", "Total Items")} value={totalItems} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>} />
            <BpKpiCard tone="brass" label={t("branch_admin.low_stock", "Low Stock")} value={lowStockCount} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>} />
            <BpKpiCard tone="coral" label={t("branch_admin.out_of_stock", "Out Of Stock")} value={outOfStockCount} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>} />
          </div>

          {loading && <div className="mb-3.5 text-sm text-[#5B6470]">{t("branch_admin.loading_products", "Loading products...")}</div>}
          {error && <div className="mb-3.5 text-sm text-[#B91C1C]">{error}</div>}

          {/* Product Type Tabs */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { value: "made_to_order", label: t("branch_admin.made_to_order", "Made to Order") },
              { value: "pre_made", label: t("branch_admin.pre_made", "Pre-made") },
              { value: "finished", label: t("branch_admin.external_products", "External Products") }
            ].map(tab => (
              <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} className={`rounded-full border-[1.5px] px-[18px] py-[9px] text-[13px] font-semibold transition-colors ${activeTab === tab.value ? "border-[#071E38] bg-[#071E38] text-white" : "border-[#E7E3D8] bg-white text-[#5B6470] hover:border-[#071E38]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <ProductItemsTable
            toolbar={<>
              <div className="relative min-w-[220px] flex-1">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input type="text" placeholder={t("branch_admin.search_by_name_or_code", "Search by Name or Code")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-lg border-[1.5px] border-[#E7E3D8] py-2.5 pl-9 pr-3.5 text-[13px] outline-none focus:border-[#0F9B8E]" />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={BP_SELECT} aria-label="Category">
                <option value="all">{t("branch_admin.category_all", "Category: All")}</option>
                {[...new Set(products.map(p => p.cat_name).filter(Boolean))].sort().map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={BP_SELECT} aria-label="Status">
                <option value="all">{t("branch_admin.status_all", "Status: All")}</option>
                <option value="In stock">In stock</option>
                <option value="Low stock">Low stock</option>
                <option value="Out of stock">Out of stock</option>
              </select>
              <select value={stockLevelFilter} onChange={e => setStockLevelFilter(e.target.value)} className={BP_SELECT} aria-label="Stock level" disabled={activeTab === "made_to_order"} title={activeTab === "made_to_order" ? "Made-to-order stock depends on ingredients. Use Status instead." : undefined}>
                <option value="all">{t("branch_admin.stock_level_all", "Stock Level: All")}</option>
                <option value="high">High (&gt;10)</option>
                <option value="low">Low (1-10)</option>
                <option value="out">Out (0)</option>
              </select>
            </>}
            products={tableProducts}
            onDecreaseStock={id => handleAdjustStock(id, -1)}
            onIncreaseStock={id => handleAdjustStock(id, 1)}
            onAddStock={activeTab !== "made_to_order" ? item => setStockModalItem(item) : null}
            hideStockColumn={activeTab === "made_to_order"}
            updatingStockId={updatingStockId}
            showActions={true}
            onDeleteProduct={handleDeleteClick}
            onFetchIngredients={getBranchProductIngredientStatus}
            onEditProduct={null}
            totalItems={tableProducts.length}
            pageStart={tableProducts.length > 0 ? 1 : 0}
            pageEnd={tableProducts.length}
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
          zIndex: 9999
        }}>
          <div style={{
            width: "min(92vw, 430px)",
            background: "#EBEBEB",
            borderRadius: "22px",
            padding: "32px 20px",
            textAlign: "center"
          }}>
            <div style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              background: "#EF4444",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <span style={{ color: "#fff", fontSize: "28px" }}>🗑️</span>
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#111" }}>
              {t("branch_admin.remove_product", "Remove Product?")}
            </h2>

            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#555" }}>
              {t("branch_admin.are_you_sure_you_want_to_remove", "Are you sure you want to remove")}
            </p>

            <p style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#111" }}>
              "{deleteTargetName}"
            </p>

            <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#888" }}>
              {t("branch_admin.this_will_remove_the_product_from_your_b", "This will remove the product from\n              your branch only. It will still\n              exist in the admin panel and\n              other branches.")}
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTargetId(null);
                setDeleteTargetName("");
              }} disabled={isDeleting} style={{
                flex: 1,
                height: "48px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                background: "#fff",
                color: "#333",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer"
              }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
              <button onClick={handleConfirmDelete} disabled={isDeleting} style={{
                flex: 1,
                height: "48px",
                border: "none",
                borderRadius: "12px",
                background: "#EF4444",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "700",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.7 : 1
              }}>
                {isDeleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Add Modal / Reorder Modal */}
      {stockModalItem && (stockModalItem.product_type === 'finished' ? (
        <ReorderModal material={stockModalItem} onClose={() => {
          setStockModalItem(null);
          setStockModalQty("");
        }} onSuccess={() => {
          setStockModalItem(null);
          setStockModalQty("");
        }} />
      ) : (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            width: "min(92vw, 400px)",
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
              {t("branch_admin.add_stock_for", "Add Stock for")} {stockModalItem.name}
            </h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", color: "#4B5563", marginBottom: "8px" }}>
                {t("branch_admin.quantity_to_add", "Quantity to Add")}
              </label>
              <input type="number" min="1" value={stockModalQty} onChange={e => setStockModalQty(e.target.value)} placeholder={t("branch_admin.enter_quantity", "Enter quantity")} style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                outline: "none",
                fontSize: "14px"
              }} />
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setStockModalItem(null)} style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "600",
                color: "#374151"
              }}>{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</button>
              <button onClick={handleConfirmAddStock} style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#0E6DCF",
                cursor: "pointer",
                fontWeight: "600",
                color: "#fff"
              }}>{t("branch_admin.confirm", t("buttons.confirm", "Confirm"))}</button>
            </div>
          </div>
        </div>
      ))}

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