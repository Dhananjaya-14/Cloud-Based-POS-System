//"C:\Users\USER\Desktop\2026-06-19 POS System\Cloud-Based-POS-System\Client\src\components\admin\Header.jsx"

import React, { useEffect, useState } from "react";
import { FaBell, FaUserCircle, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

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
    const handleStorageChange = (e) => {
      if (e.key === 'branchNotifications') {
        const savedNotifications = sessionStorage.getItem('branchNotifications');
        if (savedNotifications) {
          try {
            const parsed = JSON.parse(savedNotifications);
            const now = new Date();
            const validNotifications = parsed.filter(notif => {
              const timestamp = new Date(notif.timestamp);
              const diffMinutes = (now - timestamp) / (1000 * 60);
              return diffMinutes < 60;
            });
            setNotifications(validNotifications);
            const unread = validNotifications.filter(n => !n.read).length;
            setUnreadCount(unread);
          } catch (e) {
            console.error('Error parsing notifications:', e);
          }
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    // Initial load
    const savedNotifications = sessionStorage.getItem('branchNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        const now = new Date();
        const validNotifications = parsed.filter(notif => {
          const timestamp = new Date(notif.timestamp);
          const diffMinutes = (now - timestamp) / (1000 * 60);
          return diffMinutes < 60;
        });
        setNotifications(validNotifications);
        const unread = validNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (e) {
        console.error('Error parsing notifications:', e);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Mark notification as read
  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    sessionStorage.setItem('branchNotifications', JSON.stringify(updatedNotifications));
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Dismiss notification
  const dismissNotification = (notificationId) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    sessionStorage.setItem('branchNotifications', JSON.stringify(updatedNotifications));
    const unread = updatedNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Mark all as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    sessionStorage.setItem('branchNotifications', JSON.stringify(updatedNotifications));
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