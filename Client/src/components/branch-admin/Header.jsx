import { useTranslation } from "react-i18next";
// C:\Users\USER\Desktop\2026-06-19 POS System\Cloud-Based-POS-System\Client\src\components\branch-admin\Header.jsx

import React, { useEffect, useState } from "react";
import { FaBell, FaTimes, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getBranchById } from "../../services/api";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../../services/socket";
const NOTIFICATION_KEYS = ["branchProductNotifications", "adminProductNotifications", "branchUserNotifications", "branchInventoryNotifications", "branchSupplierNotifications", "branchRecipeNotifications"];
const getUserFullName = userData => `${userData?.u_fname || ""} ${userData?.u_lname || ""}`.trim() || userData?.userName || "User";
const getProductName = payload => payload?.product?.pro_name || payload?.pro_name || payload?.productName || "Product";
const isFreshNotification = notification => {
  const timestamp = new Date(notification.timestamp);
  const diffMinutes = (new Date() - timestamp) / (1000 * 60);
  return diffMinutes < 60;
};
const loadStoredNotifications = () => {
  return NOTIFICATION_KEYS.flatMap(key => {
    const saved = sessionStorage.getItem(key);
    if (!saved) return [];
    try {
      return JSON.parse(saved).filter(isFreshNotification).map(notification => ({
        ...notification,
        storageKey: key
      }));
    } catch {
      sessionStorage.removeItem(key);
      return [];
    }
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};
const saveStoredNotifications = items => {
  NOTIFICATION_KEYS.forEach(key => {
    const keyItems = items.filter(notification => notification.storageKey === key).map(({
      storageKey,
      ...notification
    }) => notification);
    if (keyItems.length > 0) {
      sessionStorage.setItem(key, JSON.stringify(keyItems));
    } else {
      sessionStorage.removeItem(key);
    }
  });
};
const Header = ({
  title = "Product Management"
}) => {
  const { t } = useTranslation();
const {
    user
  } = useAuth();
  const [branchName, setBranchName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load branch name
  useEffect(() => {
    let mounted = true;
    const loadBranch = async () => {
      const fromUser = user?.B_name ?? user?.b_name ?? user?.branchName ?? null;
      if (fromUser) {
        if (mounted) setBranchName(fromUser);
        return;
      }
      if (user?.b_id) {
        try {
          const res = await getBranchById(user.b_id);
          const branch = res?.data ?? res;
          if (mounted) setBranchName(branch?.B_name ?? branch?.b_name ?? "");
        } catch {
          if (mounted) setBranchName("");
        }
      } else {
        if (mounted) setBranchName("");
      }
    };
    loadBranch();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Listen for notification updates from sessionStorage
  useEffect(() => {
    const refreshNotifications = () => {
      const validNotifications = loadStoredNotifications();
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter(n => !n.read).length);
    };
    const handleStorageChange = e => {
      if (NOTIFICATION_KEYS.includes(e.key)) {
        refreshNotifications();
      }
    };
    const handleCustomChange = () => {
      refreshNotifications();
    };
    refreshNotifications();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("branch-product-notifications-updated", handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("branch-product-notifications-updated", handleCustomChange);
    };
  }, []);

  // Socket listeners for real-time product, user, and inventory notifications
  useEffect(() => {
    if (!user) return undefined;
    const currentUserId = Number(user?.u_id ?? user?.id);
    const socket = connectSocket();
    const addNotification = notification => {
      setNotifications(prev => {
        const next = [notification, ...prev].filter(isFreshNotification).filter((item, index, items) => !item.dedupeKey || index === items.findIndex(candidate => {
          if (candidate.dedupeKey !== item.dedupeKey) return false;
          return Math.abs(new Date(candidate.timestamp) - new Date(item.timestamp)) < 5000;
        }));
        saveStoredNotifications(next);
        setUnreadCount(next.filter(item => !item.read).length);
        return next;
      });
    };
    const handleProductEvent = (type, payload = {}) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }
      const productName = getProductName(payload);
      const productId = payload?.product?.pro_id ?? payload?.pro_id ?? productName;
      const actionText = type === "delete" ? "deleted" : type === "update" ? "updated" : "added";
      const timestamp = new Date().toISOString();
      addNotification({
        id: `product-${type}-${productId}-${Date.now()}-${Math.random()}`,
        type,
        storageKey: "branchProductNotifications",
        dedupeKey: `product-${type}-${productId}-${payload?.actor_id || "unknown"}`,
        message: `Product ${actionText}: "${productName}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp,
        read: false,
        productName
      });
    };
    const handleProductCreated = payload => handleProductEvent("add", payload);
    const handleProductUpdated = payload => handleProductEvent("update", payload);
    const handleProductDeleted = payload => handleProductEvent("delete", payload);
    const handleUserEvent = (type, payload = {}) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }
      const fullName = getUserFullName(payload);
      const actionText = type === "delete" ? "deleted" : type === "update" ? "updated" : "added";
      const userId = payload?.u_id ?? fullName;
      const timestamp = new Date().toISOString();
      addNotification({
        id: `user-${type}-${userId}-${Date.now()}-${Math.random()}`,
        type,
        storageKey: "branchUserNotifications",
        dedupeKey: `user-${type}-${userId}-${payload?.actor_id || "unknown"}`,
        message: `User ${actionText}: "${fullName}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp,
        read: false,
        userName: fullName
      });
    };
    const handleUserCreated = payload => handleUserEvent("add", payload);
    const handleUserUpdated = payload => handleUserEvent("update", payload);
    const handleUserDeleted = payload => handleUserEvent("delete", payload);

    // Inventory event handler
    const handleInventoryEvent = (type, payload = {}) => {
      // Skip if the current user is the actor (they'll see a toast instead)
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }
      const materialName = payload?.rm_name || payload?.materialName || "Inventory Item";
      const materialId = payload?.rm_id || payload?.materialId || materialName;
      const actionText = type === "delete" ? "deleted" : type === "update" ? "updated" : "added";
      const timestamp = new Date().toISOString();
      addNotification({
        id: `inventory-${type}-${materialId}-${Date.now()}-${Math.random()}`,
        type: `inventory_${type}`,
        storageKey: "branchInventoryNotifications",
        dedupeKey: `inventory-${type}-${materialId}-${payload?.actor_id || "unknown"}`,
        message: `Inventory ${actionText}: "${materialName}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp,
        read: false,
        materialName
      });
    };
    const handleInventoryCreated = payload => handleInventoryEvent("created", payload);
    const handleInventoryUpdated = payload => handleInventoryEvent("updated", payload);
    const handleInventoryDeleted = payload => handleInventoryEvent("deleted", payload);

    // ── Supplier event handlers ──────────────────────────────────────────────
    const handleSupplierEvent = (type, payload = {}) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }
      const supplierName = payload?.sup_name || "Supplier";
      const supplierId = payload?.sup_id || supplierName;
      const actionText = type === "delete" ? "deleted" : type === "update" ? "updated" : "added";
      const timestamp = new Date().toISOString();
      addNotification({
        id: `supplier-${type}-${supplierId}-${Date.now()}-${Math.random()}`,
        type: `supplier_${type}`,
        storageKey: "branchSupplierNotifications",
        dedupeKey: `supplier-${type}-${supplierId}-${payload?.actor_id || "unknown"}`,
        message: `Supplier ${actionText}: "${supplierName}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp,
        read: false,
        supplierName
      });
    };
    const handleSupplierCreated = payload => handleSupplierEvent("created", payload);
    const handleSupplierUpdated = payload => handleSupplierEvent("updated", payload);
    const handleSupplierDeleted = payload => handleSupplierEvent("deleted", payload);

    // ── Recipe event handlers ────────────────────────────────────────────────
    const handleRecipeEvent = (type, payload = {}) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }
      const proName = payload?.pro_name || "Product";
      const proId = payload?.pro_id || "unknown";
      const ingredientCount = payload?.ingredients?.length || payload?.ingredient?.rm_name || "";
      const timestamp = new Date().toISOString();
      let message = "";
      let notifType = `recipe_${type}`;
      if (type === "bulk_created") {
        message = `Recipe updated for "${proName}" with ${payload?.ingredients?.length || 0} ingredients`;
      } else if (type === "product_cleared") {
        message = `All ingredients removed from "${proName}" recipe`;
      } else if (type === "created") {
        const ingName = payload?.ingredient?.rm_name || "";
        message = `Ingredient "${ingName}" added to "${proName}" recipe`;
      } else if (type === "updated") {
        const ingName = payload?.ingredient?.rm_name || "";
        message = `Ingredient "${ingName}" updated in "${proName}" recipe`;
      } else if (type === "deleted") {
        message = `Ingredient removed from "${proName}" recipe`;
      }
      addNotification({
        id: `recipe-${type}-${proId}-${Date.now()}-${Math.random()}`,
        type: notifType,
        storageKey: "branchRecipeNotifications",
        dedupeKey: `recipe-${type}-${proId}-${payload?.actor_id || "unknown"}`,
        message,
        timestamp,
        read: false,
        proName
      });
    };
    const handleRecipeBulkCreated = payload => handleRecipeEvent("bulk_created", payload);
    const handleRecipeCreated = payload => handleRecipeEvent("created", payload);
    const handleRecipeUpdated = payload => handleRecipeEvent("updated", payload);
    const handleRecipeDeleted = payload => handleRecipeEvent("deleted", payload);
    const handleRecipeProductCleared = payload => handleRecipeEvent("product_cleared", payload);
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, handleProductCreated);
    socket.on(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, handleProductUpdated);
    // Also listen for product deleted events that might affect branch
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    socket.on(SOCKET_EVENTS.USER_CREATED, handleUserCreated);
    socket.on(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);
    socket.on(SOCKET_EVENTS.USER_DELETED, handleUserDeleted);
    // Inventory events
    socket.on(SOCKET_EVENTS.INVENTORY_CREATED, handleInventoryCreated);
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
    socket.on(SOCKET_EVENTS.INVENTORY_DELETED, handleInventoryDeleted);
    // Supplier events
    socket.on(SOCKET_EVENTS.SUPPLIER_CREATED, handleSupplierCreated);
    socket.on(SOCKET_EVENTS.SUPPLIER_UPDATED, handleSupplierUpdated);
    socket.on(SOCKET_EVENTS.SUPPLIER_DELETED, handleSupplierDeleted);
    // Recipe events
    socket.on(SOCKET_EVENTS.RECIPE_BULK_CREATED, handleRecipeBulkCreated);
    socket.on(SOCKET_EVENTS.RECIPE_CREATED, handleRecipeCreated);
    socket.on(SOCKET_EVENTS.RECIPE_UPDATED, handleRecipeUpdated);
    socket.on(SOCKET_EVENTS.RECIPE_DELETED, handleRecipeDeleted);
    socket.on(SOCKET_EVENTS.RECIPE_PRODUCT_CLEARED, handleRecipeProductCleared);
    return () => {
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.off(SOCKET_EVENTS.BRANCH_PRODUCT_ADDED, handleProductCreated);
        activeSocket.off(SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, handleProductUpdated);
        activeSocket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
        activeSocket.off(SOCKET_EVENTS.USER_CREATED, handleUserCreated);
        activeSocket.off(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);
        activeSocket.off(SOCKET_EVENTS.USER_DELETED, handleUserDeleted);
        activeSocket.off(SOCKET_EVENTS.INVENTORY_CREATED, handleInventoryCreated);
        activeSocket.off(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
        activeSocket.off(SOCKET_EVENTS.INVENTORY_DELETED, handleInventoryDeleted);
        activeSocket.off(SOCKET_EVENTS.SUPPLIER_CREATED, handleSupplierCreated);
        activeSocket.off(SOCKET_EVENTS.SUPPLIER_UPDATED, handleSupplierUpdated);
        activeSocket.off(SOCKET_EVENTS.SUPPLIER_DELETED, handleSupplierDeleted);
        activeSocket.off(SOCKET_EVENTS.RECIPE_BULK_CREATED, handleRecipeBulkCreated);
        activeSocket.off(SOCKET_EVENTS.RECIPE_CREATED, handleRecipeCreated);
        activeSocket.off(SOCKET_EVENTS.RECIPE_UPDATED, handleRecipeUpdated);
        activeSocket.off(SOCKET_EVENTS.RECIPE_DELETED, handleRecipeDeleted);
        activeSocket.off(SOCKET_EVENTS.RECIPE_PRODUCT_CLEARED, handleRecipeProductCleared);
      }
    };
  }, [user]);

  // Mark notification as read and remove it permanently
  const markAsRead = notificationId => {
    const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
    setNotifications(updatedNotifications);
    saveStoredNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
    window.dispatchEvent(new Event("branch-product-notifications-updated"));
  };

  // Dismiss notification (delete permanently)
  const dismissNotification = notificationId => {
    const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
    setNotifications(updatedNotifications);
    saveStoredNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
    window.dispatchEvent(new Event("branch-product-notifications-updated"));
  };

  // Mark all as read (delete all notifications permanently)
  const markAllAsRead = () => {
    setNotifications([]);
    NOTIFICATION_KEYS.forEach(key => sessionStorage.removeItem(key));
    setUnreadCount(0);
    window.dispatchEvent(new Event("branch-product-notifications-updated"));
  };
  const toggleNotifications = () => {
    setShowNotifications(previous => !previous);
  };
  const fullName = user?.u_fname || user?.u_lname ? [user?.u_fname, user?.u_lname].filter(Boolean).join(" ") : user?.name || "";
  const email = user?.u_email || user?.email || "";
  const role = user?.role_name || user?.role || user?.role?.name || "";
  return <div style={{
    height: "70px",
    display: "flex",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
    margin: 0,
    color: "#fff",
    background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
    position: "relative"
  }}>
      <h2 style={{
      fontSize: "26px",
      margin: 0,
      fontWeight: "500"
    }}>{title}</h2>

      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "20px"
    }}>
        {/* Notification Bell with Dropdown */}
        <div style={{
        position: "relative"
      }}>
          <div onClick={toggleNotifications} style={{
          cursor: "pointer",
          position: "relative",
          padding: "8px",
          borderRadius: "50%",
          transition: "background 0.2s"
        }} onMouseEnter={event => event.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={event => event.currentTarget.style.background = "transparent"}>
            <FaBell size={22} />
            {unreadCount > 0 && <span style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            backgroundColor: "#EF4444",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "11px",
            fontWeight: "bold",
            minWidth: "18px",
            textAlign: "center",
            border: "2px solid white"
          }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>}
          </div>

          {/* Notification Dropdown */}
          {showNotifications && <div style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          right: "0",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          minWidth: "380px",
          maxWidth: "420px",
          maxHeight: "450px",
          overflow: "hidden",
          zIndex: 1000,
          border: "1px solid rgba(0,0,0,0.08)"
        }}>
              <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#F9FAFB"
          }}>
                <div>
                  <span style={{
                fontWeight: "700",
                fontSize: "16px",
                color: "#1F2937"
              }}>{t("branch_admin.notifications", "Notifications")}</span>
                  {notifications.length > 0 && <span style={{
                marginLeft: "8px",
                backgroundColor: "#E5E7EB",
                color: "#4B5563",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                      {notifications.length}
                    </span>}
                </div>

                {notifications.length > 0 && <button type="button" onClick={markAllAsRead} style={{
              background: "none",
              border: "none",
              color: "#3B82F6",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              transition: "background 0.2s"
            }} onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{t("branch_admin.clear_all", "Clear all")}</button>}
              </div>

              <div style={{
            maxHeight: "340px",
            overflowY: "auto",
            padding: "8px 0"
          }} className="notification-list">
                {notifications.length === 0 ? <div style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#9CA3AF",
              fontSize: "14px"
            }}>
                    <div style={{
                fontSize: "32px",
                marginBottom: "8px"
              }}>🔔</div>{t("branch_admin.no_notifications", "No notifications")}</div> : notifications.map(notification => <div key={notification.id} style={{
              padding: "12px 20px",
              borderBottom: "1px solid #F3F4F6",
              backgroundColor: notification.read ? "white" : "#EFF6FF",
              transition: "background 0.2s",
              cursor: "pointer",
              position: "relative"
            }} onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={e => e.currentTarget.style.background = notification.read ? "white" : "#EFF6FF"} onClick={() => markAsRead(notification.id)}>
                      <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}>
                        <div style={{
                  flex: 1,
                  marginRight: "10px"
                }}>
                          <div style={{
                    fontWeight: notification.read ? "500" : "600",
                    fontSize: "14px",
                    color: "#1F2937",
                    marginBottom: "4px"
                  }}>
                            {notification.type === "admin_delete" ? "❌ Deleted by admin" : notification.type === "admin_update" ? "📝 Updated by admin" : notification.type === "admin_add" ? "✅ New product available" : notification.type === "delete" ? "❌ Deleted" : notification.type === "update" ? "📝 Updated" : notification.type === "inventory_deleted" ? "🗑️ Inventory Deleted" : notification.type === "inventory_updated" ? "📦 Inventory Updated" : notification ? "➕ Inventory Added" : "✅ Added"}
                          </div>
                          <div style={{
                    fontSize: "14px",
                    color: "#4B5563",
                    lineHeight: "1.4"
                  }}>
                            {notification.message}
                          </div>
                          <div style={{
                    fontSize: "11px",
                    color: "#9CA3AF",
                    marginTop: "4px"
                  }}>
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        <button type="button" onClick={event => {
                  event.stopPropagation();
                  dismissNotification(notification.id);
                }} style={{
                  background: "none",
                  border: "none",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "14px",
                  transition: "color 0.2s",
                  flexShrink: 0
                }} onMouseEnter={e => e.currentTarget.style.color = "#EF4444"} onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}>
                          <FaTimes />
                        </button>
                      </div>
                      {!notification.read && <div style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6"
              }} />}
                    </div>)}
              </div>
            </div>}
        </div>

        <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "rgba(255,255,255,0.08)",
        padding: "6px 12px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.12)"
      }}>
          <FaUserCircle size={30} />
          <div style={{
          lineHeight: 1.1
        }}>
            <div style={{
            fontSize: "14px",
            fontWeight: 600
          }}>
              {fullName || role || "User"}
            </div>
            <div style={{
            fontSize: "12px",
            opacity: 0.95
          }}>{email || "—"}</div>
            {branchName && <div style={{
            fontSize: "12px",
            opacity: 0.9
          }}>{branchName}</div>}
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles for notification dropdown */}
      <style>{`
        .notification-list::-webkit-scrollbar {
          width: 4px;
        }
        .notification-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .notification-list::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 10px;
        }
        .notification-list::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>;
};
export default Header;