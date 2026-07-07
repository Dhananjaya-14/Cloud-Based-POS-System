//"C:\Users\USER\Desktop\2026-06-19 POS System\Cloud-Based-POS-System\Client\src\components\admin\Header.jsx"

import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, getSocket, SOCKET_EVENTS } from "../../services/socket";

const NOTIFICATION_KEYS = ["branchNotifications", "adminUserNotifications"];

const getUserFullName = (userData) =>
  `${userData?.u_fname || ""} ${userData?.u_lname || ""}`.trim() || userData?.userName || "User";

const isFreshNotification = (notification) => {
  const timestamp = new Date(notification.timestamp);
  const diffMinutes = (new Date() - timestamp) / (1000 * 60);
  return diffMinutes < 60;
};

const loadStoredNotifications = () => {
  return NOTIFICATION_KEYS.flatMap((key) => {
    const saved = sessionStorage.getItem(key);
    if (!saved) return [];

    try {
      return JSON.parse(saved)
        .filter(isFreshNotification)
        .map((notification) => ({ ...notification, storageKey: key }));
    } catch {
      sessionStorage.removeItem(key);
      return [];
    }
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const saveStoredNotifications = (items) => {
  NOTIFICATION_KEYS.forEach((key) => {
    const keyItems = items
      .filter((notification) => notification.storageKey === key)
      .map(({ storageKey, ...notification }) => notification);

    if (keyItems.length > 0) {
      sessionStorage.setItem(key, JSON.stringify(keyItems));
    } else {
      sessionStorage.removeItem(key);
    }
  });
};

const Header = ({ title = "Branch Management" }) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCompanyName("");
      return;
    }
    // Read company name purely from the user's auth profile — no API call needed
    const uCompany = user?.com_name ?? user?.companyName ?? user?.company?.com_name ?? "";
    setCompanyName(uCompany);
  }, [user]);

  // Listen for notification updates from sessionStorage
  useEffect(() => {
    const refreshNotifications = () => {
      const validNotifications = loadStoredNotifications();
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter((n) => !n.read).length);
    };

    const handleStorageChange = (e) => {
      if (NOTIFICATION_KEYS.includes(e.key)) {
        refreshNotifications();
      }
    };

    refreshNotifications();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const currentUserId = Number(user?.u_id ?? user?.id);
    const socket = connectSocket();

    const addUserNotification = (notification) => {
      setNotifications((prev) => {
        const next = [notification, ...prev]
          .filter(isFreshNotification)
          .filter((item, index, items) => (
            !item.dedupeKey || index === items.findIndex((candidate) => {
              if (candidate.dedupeKey !== item.dedupeKey) return false;
              return Math.abs(new Date(candidate.timestamp) - new Date(item.timestamp)) < 5000;
            })
          ));
        saveStoredNotifications(next);
        setUnreadCount(next.filter((item) => !item.read).length);
        return next;
      });
    };

    const handleUserEvent = (type, payload = {}) => {
      if (payload?.actor_id && Number(payload.actor_id) === currentUserId) {
        return;
      }

      const fullName = getUserFullName(payload);
      const actionText = type === "delete" ? "deleted" : type === "update" ? "updated" : "added";
      const userId = payload?.u_id ?? fullName;
      const timestamp = new Date().toISOString();

      addUserNotification({
        id: `${type}-${userId}-${Date.now()}-${Math.random()}`,
        type,
        storageKey: "adminUserNotifications",
        dedupeKey: `user-${type}-${userId}-${payload?.actor_id || "unknown"}`,
        message: `User ${actionText}: "${fullName}"${payload?.actor_name ? ` by ${payload.actor_name}` : ""}`,
        timestamp,
        read: false,
        userName: fullName,
      });
    };

    const handleCreated = (payload) => handleUserEvent("add", payload);
    const handleUpdated = (payload) => handleUserEvent("update", payload);
    const handleDeleted = (payload) => handleUserEvent("delete", payload);

    socket.on(SOCKET_EVENTS.USER_CREATED, handleCreated);
    socket.on(SOCKET_EVENTS.USER_UPDATED, handleUpdated);
    socket.on(SOCKET_EVENTS.USER_DELETED, handleDeleted);

    return () => {
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.off(SOCKET_EVENTS.USER_CREATED, handleCreated);
        activeSocket.off(SOCKET_EVENTS.USER_UPDATED, handleUpdated);
        activeSocket.off(SOCKET_EVENTS.USER_DELETED, handleDeleted);
      }
    };
  }, [user]);

  // Mark notification as read
  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    saveStoredNotifications(updatedNotifications);
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Dismiss notification
  const dismissNotification = (notificationId) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    saveStoredNotifications(updatedNotifications);
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Mark all as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    saveStoredNotifications(updatedNotifications);
    setUnreadCount(0);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.length > 0) {
      // Mark all as read when opening notification panel
      // Uncomment if you want auto-mark as read when opening
      // markAllAsRead();
    }
  };

  const fullName =
    user?.u_fname || user?.u_lname
      ? [user?.u_fname, user?.u_lname].filter(Boolean).join(" ")
      : user?.name || "";

  const email = user?.u_email || user?.email || "";

  return (
    <div
      style={{
        height: "70px",
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        margin: 0,
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)",
        position: "relative",
      }}
    >
      <h2 style={{ fontSize: "26px", margin: 0, fontWeight: "500" }}>{title}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Notification Bell with Dropdown */}
        <div style={{ position: "relative" }}>
          <div 
            onClick={toggleNotifications}
            style={{ 
              cursor: "pointer", 
              position: "relative",
              padding: "8px",
              borderRadius: "50%",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <FaBell size={22} />
            {unreadCount > 0 && (
              <span
                style={{
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
                  border: "2px solid white",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div
              style={{
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
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#F9FAFB",
                }}
              >
                <div>
                  <span style={{ fontWeight: "700", fontSize: "16px", color: "#1F2937" }}>
                    Notifications
                  </span>
                  {notifications.length > 0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        backgroundColor: "#E5E7EB",
                        color: "#4B5563",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3B82F6",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#EFF6FF"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: "340px",
                  overflowY: "auto",
                  padding: "8px 0",
                }}
                className="notification-list"
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#9CA3AF",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔔</div>
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid #F3F4F6",
                        backgroundColor: notification.read ? "white" : "#EFF6FF",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? "white" : "#EFF6FF"}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, marginRight: "10px" }}>
                          <div
                            style={{
                              fontWeight: notification.read ? "500" : "600",
                              fontSize: "14px",
                              color: "#1F2937",
                              marginBottom: "4px",
                            }}
                          >
                            {notification.type === 'delete' ? '❌ Deleted' :
                             notification.type === 'update' ? '📝 Updated' : '✅ Added'}
                          </div>
                          <div style={{ fontSize: "14px", color: "#4B5563", lineHeight: "1.4" }}>
                            {notification.message}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#9CA3AF",
                              marginTop: "4px",
                            }}
                          >
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#9CA3AF",
                            cursor: "pointer",
                            padding: "4px",
                            fontSize: "14px",
                            transition: "color 0.2s",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#9CA3AF"}
                        >
                          <FaTimes />
                        </button>
                      </div>
                      {!notification.read && (
                        <div
                          style={{
                            position: "absolute",
                            left: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#3B82F6",
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.08)",
            padding: "6px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <FaUserCircle size={30} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>
              {fullName || "User"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.95 }}>{email || "—"}</div>
            {companyName && (
              <div style={{ fontSize: "12px", opacity: 0.9 }}>{companyName}</div>
            )}
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
    </div>
  );
};

export default Header;
