import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaBars, FaTimes } from "react-icons/fa";
import { FiBell } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { getBranchById } from "../services/api";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../services/socket";

const NOTIFICATION_KEYS = [
  "branchNotifications",
  "adminUserNotifications",
  "adminProductNotifications",
  "adminSupplierNotifications",
  "branchProductNotifications",
  "branchUserNotifications",
  "branchInventoryNotifications",
  "branchSupplierNotifications",
  "branchRecipeNotifications",
];

const isFresh = (item) => (Date.now() - new Date(item.timestamp).getTime()) / 60000 < 60;
const nameOf = (value) => `${value?.u_fname || ""} ${value?.u_lname || ""}`.trim() || value?.userName || "User";
const productOf = (value) => value?.product?.pro_name || value?.pro_name || value?.productName || "Product";
const supplierOf = (value) => value?.sup_name || value?.supplierName || value?.name || "Supplier";
const branchOf = (value) => value?.B_name || value?.b_name || value?.branchName || value?.branch?.B_name || "Branch";

const loadNotifications = () => NOTIFICATION_KEYS.flatMap((key) => {
  const saved = sessionStorage.getItem(key);
  if (!saved) return [];
  try {
    return JSON.parse(saved).filter(isFresh).map((item) => ({ ...item, storageKey: key }));
  } catch {
    sessionStorage.removeItem(key);
    return [];
  }
}).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

const saveNotifications = (items) => NOTIFICATION_KEYS.forEach((key) => {
  const values = items.filter((item) => item.storageKey === key).map(({ storageKey, ...item }) => item);
  if (values.length) sessionStorage.setItem(key, JSON.stringify(values));
  else sessionStorage.removeItem(key);
});

const Header = ({ title = "Dashboard", subtitle, variant = "app", toggleSidebar }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [branchName, setBranchName] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.b_id) {
      setBranchName(user?.B_name || user?.b_name || user?.branchName || "");
      return undefined;
    }
    let mounted = true;
    getBranchById(user.b_id).then((result) => {
      if (mounted) {
        const branch = result?.data || result;
        setBranchName(branch?.B_name || branch?.b_name || "");
      }
    }).catch(() => {
      if (mounted) setBranchName("");
    });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications());
    refresh();
    const onStorage = (event) => {
      if (NOTIFICATION_KEYS.includes(event.key)) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("branch-product-notifications-updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("branch-product-notifications-updated", refresh);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const currentUserId = Number(user.u_id ?? user.id);
    const socket = connectSocket();
    const add = (item) => {
      setNotifications((previous) => {
        const next = [item, ...previous].filter(isFresh).filter((candidate, index, all) => (
          !candidate.dedupeKey || index === all.findIndex((other) => (
            other.dedupeKey === candidate.dedupeKey &&
            Math.abs(new Date(other.timestamp) - new Date(candidate.timestamp)) < 5000
          ))
        ));
        saveNotifications(next);
        return next;
      });
    };
    const event = (type, payload, storageKey, subject, subjectId) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) return;
      const id = subjectId || subject;
      add({
        id: `${subject}-${type}-${id}-${Date.now()}`,
        type,
        storageKey,
        dedupeKey: `${subject}-${type}-${id}-${payload?.actor_id || "unknown"}`,
        message: `${subject[0].toUpperCase()}${subject.slice(1)} ${type === "delete" ? "deleted" : type === "update" ? "updated" : "added"}: "${id}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    };
    const handlers = [
      [SOCKET_EVENTS.USER_CREATED, (p) => event("add", p, "adminUserNotifications", "user", nameOf(p))],
      [SOCKET_EVENTS.USER_UPDATED, (p) => event("update", p, "adminUserNotifications", "user", nameOf(p))],
      [SOCKET_EVENTS.USER_DELETED, (p) => event("delete", p, "adminUserNotifications", "user", nameOf(p))],
      [SOCKET_EVENTS.NEW_PRODUCT_ADDED, (p) => event("add", p, "adminProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, (p) => event("add", p, "branchProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.PRODUCT_UPDATED, (p) => event("update", p, "adminProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, (p) => event("update", p, "branchProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.PRODUCT_DELETED, (p) => event("delete", p, "adminProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.BRANCH_PRODUCT_DELETED, (p) => event("delete", p, "branchProductNotifications", "product", productOf(p))],
      [SOCKET_EVENTS.SUPPLIER_CREATED, (p) => event("add", p, "branchSupplierNotifications", "supplier", supplierOf(p))],
      [SOCKET_EVENTS.SUPPLIER_UPDATED, (p) => event("update", p, "branchSupplierNotifications", "supplier", supplierOf(p))],
      [SOCKET_EVENTS.SUPPLIER_DELETED, (p) => event("delete", p, "branchSupplierNotifications", "supplier", supplierOf(p))],
      [SOCKET_EVENTS.INVENTORY_CREATED, (p) => event("add", p, "branchInventoryNotifications", "inventory", p?.rm_name || p?.materialName || "Inventory Item")],
      [SOCKET_EVENTS.INVENTORY_UPDATED, (p) => event("update", p, "branchInventoryNotifications", "inventory", p?.rm_name || p?.materialName || "Inventory Item")],
      [SOCKET_EVENTS.INVENTORY_DELETED, (p) => event("delete", p, "branchInventoryNotifications", "inventory", p?.rm_name || p?.materialName || "Inventory Item")],
      [SOCKET_EVENTS.RECIPE_CREATED, (p) => event("add", p, "branchRecipeNotifications", "recipe", p?.productName || p?.pro_name || "Recipe")],
      [SOCKET_EVENTS.RECIPE_UPDATED, (p) => event("update", p, "branchRecipeNotifications", "recipe", p?.productName || p?.pro_name || "Recipe")],
      [SOCKET_EVENTS.RECIPE_DELETED, (p) => event("delete", p, "branchRecipeNotifications", "recipe", p?.productName || p?.pro_name || "Recipe")],
      ["branch:created", (p) => event("add", p, "branchNotifications", "branch", branchOf(p))],
      ["branch:updated", (p) => event("update", p, "branchNotifications", "branch", branchOf(p))],
      ["branch:deleted", (p) => event("delete", p, "branchNotifications", "branch", branchOf(p))],
    ];
    handlers.forEach(([eventName, handler]) => socket.on(eventName, handler));
    return () => {
      const activeSocket = getSocket();
      handlers.forEach(([eventName, handler]) => activeSocket?.off(eventName, handler));
    };
  }, [user]);

  const clearNotification = (id) => {
    const next = notifications.filter((item) => item.id !== id);
    setNotifications(next);
    saveNotifications(next);
  };
  const clearAll = () => {
    setNotifications([]);
    NOTIFICATION_KEYS.forEach((key) => sessionStorage.removeItem(key));
  };
  const displayName = useMemo(() => nameOf(user) || user?.u_email || "User", [user]);
  const email = user?.u_email || user?.email || "";
  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "U";
  }, [displayName]);

  if (variant === "register") {
    return <div className="w-full bg-gradient-to-r from-[#0056A2] via-[#00B4EB] to-[#50B748] px-5 py-2 text-xs text-white">SLT POS</div>;
  }

  return (
<header className="relative flex min-h-[70px] w-full items-center justify-between bg-gradient-to-r from-[#071E38] via-[#14A6E0] via-55% to-[#3CAE49] px-5 py-5 text-white shadow-sm lg:px-9">
      <div className="flex min-w-0 items-center gap-4">
        {toggleSidebar && <button type="button" className="lg:hidden" onClick={toggleSidebar} aria-label="Toggle sidebar"><FaBars size={22} /></button>}
        <div className="min-w-0">
          <h1 className="m-0 truncate font-space text-[21px] font-bold leading-tight text-white">{title}</h1>
          {subtitle && <div className="mt-[3px] truncate text-[12.5px] text-white/75">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative">
          <button type="button" className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications">
            <FiBell size={18} />
            {notifications.length > 0 && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#E0654F]" />}
          </button>
          {showNotifications && <div className="absolute right-0 top-12 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white text-gray-800 shadow-2xl">
            <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
              <strong>{t("company_admin.notifications", "Notifications")} {notifications.length > 0 && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs">{notifications.length}</span>}</strong>
              {notifications.length > 0 && <button type="button" className="text-sm font-semibold text-blue-500" onClick={clearAll}>{t("company_admin.clear_all", "Clear all")}</button>}
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {notifications.length === 0 ? <div className="p-10 text-center text-sm text-gray-400">🔔 {t("company_admin.no_notifications", "No notifications")}</div> : notifications.map((item) => (
                <div key={item.id} className="flex gap-2 border-b p-3 text-sm hover:bg-gray-50" onClick={() => clearNotification(item.id)}>
                  <div className="flex-1"><div className="font-semibold">{item.type === "delete" ? "❌ Deleted" : item.type === "update" ? "📝 Updated" : "✅ Added"}</div><div className="text-gray-600">{item.message}</div><div className="mt-1 text-[11px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString()}</div></div>
                  <button type="button" aria-label="Dismiss notification" className="text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); clearNotification(item.id); }}><FaTimes /></button>
                </div>
              ))}
            </div>
          </div>}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-white/95 text-[13px] font-bold text-[#071E38]">{initials}</div>
          <div className="hidden leading-[1.3] sm:block"><div className="text-[13.5px] font-semibold text-white">{displayName}</div><div className="text-[11.5px] text-white/75">{email || branchName}</div></div>
        </div>
      </div>
    </header>
  );
};

export default Header;