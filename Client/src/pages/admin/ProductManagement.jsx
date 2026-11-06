import { useTranslation } from "react-i18next";
// Client/src/pages/admin/ProductManagement.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBoxOpen, FaChevronDown, FaExclamationTriangle, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import Button from "../../components/admin/Button";
import ProductItemsTable from "../../components/branch-admin/ProductItemsTable";
import { getProducts, updateProduct, deleteProduct, deleteBranchProduct, getBranches } from "../../services/api";
import { connectSocket, getSocket, SOCKET_EVENTS, joinCompanyRoom } from "../../services/socket";
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
    discount: formatProductDiscount(product),
    stock: quantity,
    status: getStockStatus(quantity),
    _original: product
  };
};

/* ===== Design components (Product Management redesign) ===== */
/* ---------- Summary cards ---------- */
const STAT_TONES = {
  green: "bg-[#EAF9EC] text-[#3CAE49]",
  amber: "bg-[#FFF6E6] text-[#F59E0B]",
  red: "bg-[#FDECEC] text-[#EF4444]",
};

const StatBoxIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7L12 3L4 7L12 11L20 7Z" /><path d="M4 7V17L12 21L20 17V7" /><path d="M12 11V21" /></svg>;
const StatWarningIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9V13M12 17H12.01" /><path d="M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0Z" /></svg>;
const StatOutIcon = () => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M15 9L9 15M9 9L15 15" /></svg>;
const PlusIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5V19M5 12H19" /></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3A2.83 2.83 0 0121 7L7 21H3V17Z" /></svg>;
const DeleteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7H20M9 7V4H15V7M6 7L7 20H17L18 7" /></svg>;

function PageHeading({ title, subtitle, buttonLabel, onButtonClick }) {
  return (
    <div className="mb-[22px] flex items-start justify-between gap-4">
      <div>
        <h2 className="mb-1 font-space text-2xl font-bold text-[#111827]">{title}</h2>
        <p className="text-[13px] text-[#6B7280]">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onButtonClick}
        className="inline-flex flex-shrink-0 items-center gap-2 rounded-[9px] bg-[#071E38] px-5 py-[11px] text-[13.5px] font-bold text-white shadow-[0_8px_18px_rgba(7,30,56,0.25)] hover:bg-[#0D2B4D]"
      >
        <PlusIcon />
        {buttonLabel}
      </button>
    </div>
  );
}

function ProductStatCard({ icon, tone = "green", value, label }) {
  return (
    <div className="flex flex-1 items-center gap-[15px] rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
      <div className={`flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl ${STAT_TONES[tone]}`}>{icon}</div>
      <div>
        <div className="font-space text-[22px] font-bold leading-tight text-[#071E38]">{value}</div>
        <div className="text-xs font-semibold text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}

/* ---------- Filter bar ---------- */
function FilterSearch({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-[260px] flex-1">
      <FiSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-3 pl-10 pr-9 text-[13px] text-[#111827] outline-none focus:border-[#14A6E0]"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]">
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="cursor-pointer appearance-none rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white py-3 pl-3.5 pr-9 text-[12.5px] font-semibold text-[#111827] outline-none focus:border-[#14A6E0]"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <FiChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#111827]" />
    </div>
  );
}

/* ---------- Badges ---------- */
const CATEGORY_TONES = {
  appetizers: "bg-[#FFF6E6] text-[#B45309]",
  "fast food": "bg-[#FDECEC] text-[#B91C1C]",
  desserts: "bg-[#F3EDFE] text-[#6D28D9]",
  "main courses": "bg-[#EAF9EC] text-[#15803D]",
  beverages: "bg-[#EAF6FD] text-[#0E6FA8]",
};
const EXTRA_TONES = Object.values(CATEGORY_TONES);
const categoryTone = name => {
  const key = String(name || "").trim().toLowerCase();
  if (CATEGORY_TONES[key]) return CATEGORY_TONES[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return EXTRA_TONES[hash % EXTRA_TONES.length];
};
const TYPE_LABELS = { pre_made: "Pre-made", finished: "External", made_to_order: "Made to Order" };

/* ---------- Product table ---------- */
function ProductCatalogTable({
  products,
  loading,
  emptyText,
  columns,
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  footerText,
  currentPage,
  totalPages,
  onPageChange,
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className="border-b border-[#E5E7EB] bg-[#FAFAFB] px-5 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#9CA3AF]">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center text-sm text-[#9CA3AF]">{loading ? "…" : emptyText}</td>
              </tr>
            ) : products.map(item => (
              <tr key={item.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#FAFBFC]">
                <td className="px-5 py-[13px]">
                  <button type="button" onClick={() => onViewProduct?.(item.id)} className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[11px] bg-[#F3F4F6] text-center text-[9px] font-semibold leading-tight text-[#9CA3AF]">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt} className="h-full w-full object-cover" /> : <>No<br />image</>}
                  </button>
                </td>
                <td className="px-5 py-[13px]">
                  <button type="button" onClick={() => onViewProduct?.(item.id)} className="text-left">
                    <span className="block text-[13.5px] font-bold text-[#071E38] hover:underline">{item.name}</span>
                    <span className="mt-0.5 block text-[11px] text-[#9CA3AF]">{item.sku}</span>
                  </button>
                </td>
                <td className="px-5 py-[13px]">
                  <span className={`inline-block rounded-full px-[11px] py-[5px] text-[11px] font-bold ${categoryTone(item.category)}`}>{item.category}</span>
                </td>
                <td className="px-5 py-[13px]">
                  <span className="inline-block rounded-full bg-[#F3F4F6] px-[11px] py-[5px] text-[11px] font-bold text-[#6B7280]">{TYPE_LABELS[item.product_type] || "Made to Order"}</span>
                </td>
                <td className="px-5 py-[13px] font-space text-[13.5px] font-bold text-[#071E38]">{item.price}</td>
                <td className="px-5 py-[13px] text-[13.5px] font-semibold text-[#6B7280]">{item.discount}</td>
                <td className="px-5 py-[13px]">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onEditProduct?.(item.id)} aria-label={`Edit ${item.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[#14A6E0] transition-colors hover:border-[#14A6E0] hover:bg-[#EAF6FD]">
                      <EditIcon />
                    </button>
                    <button type="button" onClick={() => onDeleteProduct?.(item.id)} aria-label={`Delete ${item.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[#E5E7EB] bg-white text-[#EF4444] transition-colors hover:border-[#EF4444] hover:bg-[#FDECEC]">
                      <DeleteIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: count on the left, pagination on the right when there is more than one page */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-5 py-3.5 text-[12.5px] text-[#6B7280]">
        <span>{footerText}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
            <span className="px-1 font-semibold text-[#111827]">{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
/* ===== End of design components ===== */

const ProductManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userCompanyId, setUserCompanyId] = useState(null);
  const isSubscribedRef = useRef(false);

  // Filter dropdown states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedStockLevel, setSelectedStockLevel] = useState("All");

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
    const handleNewProduct = (data) => {
      console.log("New product added via socket (admin):", data);
      if (data.product && String(data.company_id) === String(userCompanyId)) {
        setProducts(prev => {
          const exists = prev.some(p => Number(p.pro_id) === Number(data.product.pro_id));
          if (exists) return prev;
          return [...prev, data.product];
        });

        setNotifications(prev => {
          const productName = data.product.pro_name || 'Product';
          const existingNotif = prev.find(n =>
            n.type === 'add' &&
            n.productName === productName &&
            (new Date() - new Date(n.timestamp)) < 5000
          );
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
    const handleProductUpdated = (data) => {
      console.log("Product updated via socket (admin):", data);
      if (data.product && String(data.company_id) === String(userCompanyId)) {
        setProducts(prev =>
          prev.map(p =>
            Number(p.pro_id) === Number(data.product.pro_id)
              ? { ...p, ...data.product }
              : p
          )
        );

        setNotifications(prev => {
          const productName = data.product.pro_name || 'Product';
          const existingNotif = prev.find(n =>
            n.type === 'update' &&
            n.productName === productName &&
            (new Date() - new Date(n.timestamp)) < 5000
          );
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
    const handleProductDeleted = (data) => {
      console.log("Product deleted via socket (admin):", data);
      if (data.pro_id && String(data.company_id) === String(userCompanyId)) {
        const productName = data.pro_name || 'Product';

        setProducts(prev =>
          prev.filter(p => Number(p.pro_id) !== Number(data.pro_id))
        );

        showToastMessage(`Product "${productName}" was deleted in real time.`, "info");
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
  }, [userCompanyId]);

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

  // Get unique categories from products
  const categoryOptions = useMemo(() => {
    const categories = new Set();
    products.forEach(p => {
      if (p.cat_name) categories.add(p.cat_name);
    });
    return ["All", ...Array.from(categories).sort()];
  }, [products]);

  const tableProducts = useMemo(() => {
    const mapped = products.map(mapApiProductToTableItem);
    const query = searchTerm.trim().toLowerCase();

    return mapped.filter(item => {
      // Search filter (name, SKU, category)
      const matchesSearch = !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      // Category filter
      const matchesCategory = selectedCategory === "All" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      // Status filter
      const matchesStatus = selectedStatus === "All" ||
        (selectedStatus === "In Stock" && item.status === "In stock") ||
        (selectedStatus === "Low Stock" && item.status === "Low stock") ||
        (selectedStatus === "Out of Stock" && item.status === "Out of stock");

      // Stock level filter
      let matchesStockLevel = true;
      if (selectedStockLevel === "Low (1-10)") {
        matchesStockLevel = item.stock > 0 && item.stock <= 10;
      } else if (selectedStockLevel === "Out (0)") {
        matchesStockLevel = item.stock <= 0;
      } else if (selectedStockLevel === "High (>10)") {
        matchesStockLevel = item.stock > 10;
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStockLevel;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus, selectedStockLevel]);

  const totalPages = Math.max(1, Math.ceil(tableProducts.length / itemsPerPage));
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus, selectedStockLevel, itemsPerPage]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [tableProducts, currentPage, itemsPerPage]);
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

  // Shared filter select style
  const filterSelectStyle = {
    width: "100%",
    height: "40px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    border: "1px solid #D9DCE1",
    padding: "0 34px 0 14px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#4B5563",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    cursor: "pointer"
  };

  const filterWrapperStyle = {
    position: "relative",
    flex: "1 1 0",
    minWidth: "150px"
  };

  const filterChevronStyle = {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "#111827"
  };

  return <div style={{
    display: "flex",
    background: "#F3F4F6",
    minHeight: "100vh"
  }}>
    <Sidebar />

    <div style={{
      flex: 1,
      marginLeft: "240px",
      minWidth: 0
    }}>
      <Header title={t("company_admin.product_management", "Product Management")} />

      <div className="px-8 pb-10 pt-7">
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

        <PageHeading
          title={t("company_admin.product_management", "Product Management")}
          subtitle={t("company_admin.product_management_subtitle", "Manage catalog items, pricing, and stock visibility")}
          buttonLabel={t("company_admin.add_product", "Add Product")}
          onButtonClick={() => navigate("/admin/products/add")}
        />

        <div className="mb-[22px] flex flex-col gap-4 md:flex-row">
          <ProductStatCard icon={<StatBoxIcon />} tone="green" value={totalItems} label={t("company_admin.total_items", "Total Items")} />
          <ProductStatCard icon={<StatWarningIcon />} tone="amber" value={lowStockCount} label={t("company_admin.low_stock", "Low Stock")} />
          <ProductStatCard icon={<StatOutIcon />} tone="red" value={outOfStockCount} label={t("company_admin.out_of_stock", "Out Of Stock")} />
        </div>

        {error && <div className="mb-3.5 text-sm text-[#B91C1C]">{error}</div>}

        <div className="mb-[18px] flex flex-wrap gap-2.5">
          <FilterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("company_admin.search_products_skus_or_categories", "Search Products, SKUs, or Categories")}
          />
          <FilterSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            ariaLabel="Category"
            options={categoryOptions.map(cat => ({ value: cat, label: cat === "All" ? `${t("company_admin.category", "Category")} : All` : cat }))}
          />
          <FilterSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            ariaLabel="Status"
            options={[
              { value: "All", label: `${t("company_admin.status", "Status")} : All` },
              { value: "In Stock", label: "In Stock" },
              { value: "Low Stock", label: "Low Stock" },
              { value: "Out of Stock", label: "Out of Stock" }
            ]}
          />
          <FilterSelect
            value={selectedStockLevel}
            onChange={setSelectedStockLevel}
            ariaLabel="Stock level"
            options={[
              { value: "All", label: `${t("company_admin.stock_level", "Stock Level")} : All` },
              { value: "Low (1-10)", label: "Low (1-10)" },
              { value: "Out (0)", label: "Out (0)" },
              { value: "High (>10)", label: "High (>10)" }
            ]}
          />
          <FilterSelect
            value={itemsPerPage}
            onChange={value => setItemsPerPage(Number(value))}
            ariaLabel="Products per page"
            options={[10, 25, 50, 100].map(n => ({ value: n, label: `Products per page: ${n}` }))}
          />
        </div>

        <ProductCatalogTable
          products={paginatedProducts}
          loading={loading}
          emptyText={t("company_admin.no_products_found", "No products found")}
          columns={["Image", "Product Name", "Category", "Type", "Price", "Discount", "Action"]}
          onViewProduct={handleViewProduct}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
          footerText={loading ? t("company_admin.loading_products", "Loading products...") : `Showing ${pageStart}-${pageEnd} of ${tableProducts.length} products`}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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