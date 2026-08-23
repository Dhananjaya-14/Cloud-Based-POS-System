import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { FaSearch, FaBell, FaUserCircle, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import BranchTable from "../../components/admin/BranchTable";
import Button from "../../components/admin/Button";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches, setAuthToken, logout } from "../../services/api";
import { connectSocket } from "../../services/socket";
import Spinner from "../../components/super-admin/Spinner";
import { useAuth } from "../../context/AuthContext";
const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 64;
const BranchManagement = () => {
  const { t } = useTranslation();
const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();
  const {
    user
  } = useAuth();

  // Get user details from auth context
  const fullName = user?.u_fname || user?.u_lname ? [user?.u_fname, user?.u_lname].filter(Boolean).join(" ") : user?.name || "User";
  const email = user?.u_email || user?.email || "";

  // State for real-time notifications - stored as an array in sessionStorage
  const [notifications, setNotifications] = useState(() => {
    // Try to load notifications from sessionStorage on component mount
    const savedNotifications = sessionStorage.getItem('branchNotifications');
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
          sessionStorage.removeItem('branchNotifications');
          return [];
        }
      } catch (e) {
        sessionStorage.removeItem('branchNotifications');
        return [];
      }
    }
    return [];
  });

  // Save notifications to sessionStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('branchNotifications', JSON.stringify(notifications));
    } else {
      sessionStorage.removeItem('branchNotifications');
    }
  }, [notifications]);

  // Auto-dismiss toasts after 5 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthToken(token);
    fetchBranches();
  }, [navigate]);

  // Realtime branch updates (created / updated / deleted)
  useEffect(() => {
    const socket = connectSocket();
    const handleCreated = branch => {
      setBranches(prev => [branch, ...prev]);

      // Show toast for the user making the update
      showToastMessage(`✅ New branch added: "${branch.B_name || 'Branch'}"`, 'success');

      // Add notification for other users
      setNotifications(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'add',
        message: `🏢 New branch added: "${branch.B_name || 'Branch'}"`,
        timestamp: new Date().toISOString(),
        branchName: branch.B_name || 'Branch'
      }]);
    };
    const handleUpdated = branch => {
      setBranches(prev => prev.map(b => b.B_id === branch.B_id ? branch : b));

      // Show toast for the user making the update
      showToastMessage(`✏️ Branch updated: "${branch.B_name || 'Branch'}"`, 'info');

      // Add notification for other users
      setNotifications(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'update',
        message: `✏️ Branch updated: "${branch.B_name || 'Branch'}"`,
        timestamp: new Date().toISOString(),
        branchName: branch.B_name || 'Branch'
      }]);
    };
    const handleDeleted = payload => {
      const id = payload?.B_id ?? payload?.b_id ?? payload?.id ?? null;
      if (id == null) return;

      // Find the branch name before removing it
      const deletedBranch = branches.find(b => Number(b.B_id) === Number(id));
      const branchName = deletedBranch?.B_name || 'Branch';
      setBranches(prev => prev.filter(b => Number(b.B_id) !== Number(id)));

      // Show toast for the user making the update
      showToastMessage(`🗑️ Branch deleted: "${branchName}"`, 'error');

      // Add notification for other users
      setNotifications(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'delete',
        message: `🗑️ Branch deleted: "${branchName}"`,
        timestamp: new Date().toISOString(),
        branchName: branchName
      }]);
    };
    socket.on("branch:created", handleCreated);
    socket.on("branch:updated", handleUpdated);
    socket.on("branch:deleted", handleDeleted);
    return () => {
      socket.off("branch:created", handleCreated);
      socket.off("branch:updated", handleUpdated);
      socket.off("branch:deleted", handleDeleted);
    };
  }, [branches]); // Added branches as dependency for handleDeleted to access branch names

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error("fetchBranches error:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };
  const filteredBranches = branches.filter(branch => {
    if (!searchQuery.trim()) return true;
    const companyName = branch.com_name || "";
    const branchName = branch.B_name || "";
    return companyName.toLowerCase().includes(searchQuery.toLowerCase()) || branchName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Dismiss a specific notification
  const dismissNotification = notificationId => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  // Toggle notification dropdown
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get notification count
  const notificationCount = notifications.length;

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  // Show toast message
  const showToastMessage = (message, type = 'success') => {
    const newToast = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setToasts(prev => [...prev, newToast]);
  };

  // Remove a specific toast
  const removeToast = toastId => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };
  const addButtonStyle = {
    padding: "10px 18px",
    background: "#2E3E8F",
    color: "#fff",
    borderRadius: "8px",
    fontWeight: 600
  };

  // Get toast color based on type
  const getToastColor = type => {
    switch (type) {
      case 'success':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      case 'info':
        return '#3B82F6';
      default:
        return '#22C55E';
    }
  };
  const getToastBackground = type => {
    switch (type) {
      case 'success':
        return '#F0FDF4';
      case 'error':
        return '#FEF2F2';
      case 'info':
        return '#EFF6FF';
      default:
        return '#F0FDF4';
    }
  };
  const getToastTextColor = type => {
    switch (type) {
      case 'success':
        return '#065F46';
      case 'error':
        return '#991B1B';
      case 'info':
        return '#1E40AF';
      default:
        return '#065F46';
    }
  };
  return <div style={{
    display: "flex",
    minHeight: "100vh",
    background: "#F4F6F9"
  }}>
      <Sidebar />

      <div style={{
      flex: 1,
      marginLeft: "240px"
    }}>
        {/* Header with notification icon */}
        <div style={{
        height: "70px",
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        margin: 0,
        color: "#fff",
        background: "linear-gradient(135deg, #2E3E8F 0%, #00B4EB 59%, #55D24B 100%)"
      }}>
          <h2 style={{
          fontSize: "26px",
          margin: 0,
          fontWeight: "500"
        }}>{t("company_admin.branch_management", "Branch Management")}</h2>

          <div style={{
          display: "flex",
          alignItems: "center",
          gap: "20px"
        }}>
            {/* Notification Bell with Badge */}
            <div style={{
            position: "relative"
          }}>
              <FaBell size={24} onClick={toggleNotifications} style={{
              cursor: 'pointer'
            }} />
              {notificationCount > 0 && <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#EF4444',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center',
              border: '2px solid white'
            }}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>}
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
                  {fullName || "User"}
                </div>
                <div style={{
                fontSize: "12px",
                opacity: 0.95
              }}>{email || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Messages Container */}
        <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: '100%'
      }}>
          {toasts.map(toast => <div key={toast.id} style={{
          backgroundColor: getToastBackground(toast.type),
          borderLeft: `4px solid ${getToastColor(toast.type)}`,
          borderRadius: '8px',
          padding: '14px 18px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'slideInRight 0.3s ease-out',
          color: getToastTextColor(toast.type)
        }}>
              <div style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.5'
          }}>
                {toast.message}
              </div>
              <button onClick={() => removeToast(toast.id)} style={{
            background: 'none',
            border: 'none',
            color: getToastTextColor(toast.type),
            cursor: 'pointer',
            padding: '4px',
            marginLeft: '12px',
            fontSize: '16px',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }} onMouseEnter={e => {
            e.currentTarget.style.opacity = '1';
          }} onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.6';
          }}>
                <FaTimes />
              </button>
            </div>)}
        </div>

        {/* Notification Dropdown */}
        {showNotifications && <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9998,
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        maxWidth: '420px',
        minWidth: '320px',
        maxHeight: '400px',
        overflow: 'hidden',
        border: '1px solid #E5E7EB'
      }}>
            <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F9FAFB'
        }}>
              <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#1F2937'
          }}>{t("company_admin.notifications", "Notifications")}</h3>
              {notificationCount > 0 && <button onClick={clearAllNotifications} style={{
            background: 'none',
            border: 'none',
            color: '#EF4444',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }} onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
          }} onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>{t("company_admin.clear_all", "Clear all")}</button>}
            </div>
            <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          padding: '8px 0'
        }}>
              {notifications.length === 0 ? <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: '14px'
          }}>
                  <span style={{
              fontSize: '32px',
              display: 'block',
              marginBottom: '8px'
            }}>
                    🔔
                  </span>{t("company_admin.no_new_notifications", "No new notifications")}</div> : notifications.map(notification => <div key={notification.id} style={{
            padding: '12px 20px',
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: notification.type === 'delete' ? '#FEF2F2' : notification.type === 'update' ? '#EFF6FF' : '#F0FDF4',
            transition: 'background 0.2s',
            cursor: 'default'
          }} onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = notification.type === 'delete' ? '#FEE2E2' : notification.type === 'update' ? '#DBEAFE' : '#D1FAE5';
          }} onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = notification.type === 'delete' ? '#FEF2F2' : notification.type === 'update' ? '#EFF6FF' : '#F0FDF4';
          }}>
                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
                      <div style={{
                flex: 1
              }}>
                        <div style={{
                  fontWeight: '600',
                  fontSize: '13px',
                  color: '#1F2937',
                  marginBottom: '4px'
                }}>
                          {notification.type === 'delete' ? '❌ Branch Deleted' : notification.type === 'update' ? '📝 Branch Updated' : '✅ New Branch Added'}
                        </div>
                        <div style={{
                  fontSize: '13px',
                  color: '#4B5563',
                  lineHeight: '1.4'
                }}>
                          {notification.message}
                        </div>
                        <div style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  marginTop: '4px'
                }}>
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <button onClick={() => dismissNotification(notification.id)} style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '16px',
                marginLeft: '8px',
                transition: 'color 0.2s'
              }} onMouseEnter={e => {
                e.currentTarget.style.color = '#EF4444';
              }} onMouseLeave={e => {
                e.currentTarget.style.color = '#9CA3AF';
              }}>
                        ×
                      </button>
                    </div>
                  </div>)}
            </div>
          </div>}

        <div style={{
        padding: "20px"
      }}>
          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
            <h1 style={{
            fontSize: "22px",
            margin: 10,
            fontWeight: "500"
          }}>{t("company_admin.branch_management", "Branch Management")}</h1>
            <Button label={t("buttons.new_branch", "+ New Branch")} onClick={() => setShowModal(true)} />
          </div>

          <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "300px",
          marginBottom: "20px"
        }}>
            <FaSearch style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9CA3AF",
            fontSize: "14px"
          }} />
            <input type="text" placeholder={t("company_admin.search_here", "Search here...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{
            width: "100%",
            maxWidth: "300px",
            padding: "10px 14px 10px 36px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            fontSize: "14px",
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }} />
          </div>

          {loading ? <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
          marginTop: "24px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
        }}>
              <Spinner size={36} />
            </div> : filteredBranches.length === 0 ? <div style={{
          textAlign: "center",
          padding: "40px 20px",
          marginTop: "24px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          color: "#6B7280"
        }}>
              <p style={{
            fontSize: "16px",
            fontWeight: "500",
            margin: 0
          }}>{t("company_admin.no_records_match", "No records match \"")}{searchQuery}"
              </p>
              <p style={{
            fontSize: "14px",
            marginTop: "4px",
            color: "#9CA3AF"
          }}>{t("company_admin.try_checking_your_spelling_or_using_a_di", "Try checking your spelling or using a different search term.")}</p>
            </div> : <BranchTable branches={filteredBranches} />}
        </div>
      </div>
      {showModal && <AddBranchWizard onClose={() => setShowModal(false)} onSuccess={() => {
      fetchBranches();
      // Show success message when branch is created via modal
      showToastMessage("✅ Branch created. The branch was added successfully!", "success");
    }} />}

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
    </div>;
};
export default BranchManagement;