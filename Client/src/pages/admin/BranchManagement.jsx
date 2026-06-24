import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import BranchTable from "../../components/admin/BranchTable";
import Button from "../../components/admin/Button";
import AddBranchWizard from "../../components/admin/AddBranchModal";
import { getBranches, setAuthToken, logout } from "../../services/api";
import { connectSocket } from "../../services/socket";
import Spinner from "../../components/super-admin/Spinner";

const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 64;

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

    const handleCreated = (branch) => {
      setBranches((prev) => [branch, ...prev]);
      
      // Add new notification to the queue
      setNotifications(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'add',
        message: `🏢 New branch added: "${branch.B_name || 'Branch'}"`,
        timestamp: new Date().toISOString(),
        branchName: branch.B_name || 'Branch'
      }]);
    };

    const handleUpdated = (branch) => {
      setBranches((prev) => prev.map((b) => (b.B_id === branch.B_id ? branch : b)));
      
      // Add new notification to the queue
      setNotifications(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'update',
        message: `✏️ Branch updated: "${branch.B_name || 'Branch'}"`,
        timestamp: new Date().toISOString(),
        branchName: branch.B_name || 'Branch'
      }]);
    };

    const handleDeleted = (payload) => {
      const id = payload?.B_id ?? payload?.b_id ?? payload?.id ?? null;
      if (id == null) return;
      
      // Find the branch name before removing it
      const deletedBranch = branches.find(b => Number(b.B_id) === Number(id));
      const branchName = deletedBranch?.B_name || 'Branch';
      
      setBranches((prev) => prev.filter((b) => Number(b.B_id) !== Number(id)));
      
      // Add new notification to the queue
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

  const filteredBranches = branches.filter((branch) => {
    if (!searchQuery.trim()) return true;
    const companyName = branch.com_name || "";
    const branchName = branch.B_name || "";
    
    return companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           branchName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Dismiss a specific notification
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const addButtonStyle = {
    padding: "10px 18px",
    background: "#2E3E8F",
    color: "#fff",
    borderRadius: "8px",
    fontWeight: 600,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F6F9" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: "240px" }}>
        <Header />

        <div style={{ padding: "20px" }}>
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
              className="notifications-container"
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
                      {notification.type === 'delete' ? '❌ Branch Deleted' :
                       notification.type === 'update' ? '📝 Branch Updated' : '✅ New Branch Added'}
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
            }}
          >
            <h1 style={{ fontSize: "22px", margin: 10, fontWeight: "500" }}>Branch Management</h1>
            <Button label="+ New Branch" onClick={() => setShowModal(true)} />
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: "300px", marginBottom: "20px" }}>
            <FaSearch style={{ 
              position: "absolute", 
              left: "12px", 
              top: "50%", 
              transform: "translateY(-50%)", 
              color: "#9CA3AF",
              fontSize: "14px"
            }} />
            <input
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "300px",
                padding: "10px 14px 10px 36px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            />
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", marginTop: "24px", background: "#ffffff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)" }}>
              <Spinner size={36} />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", marginTop: "24px", background: "#ffffff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", color: "#6B7280" }}>
              <p style={{ fontSize: "16px", fontWeight: "500", margin: 0 }}>
                No records match "{searchQuery}"
              </p>
              <p style={{ fontSize: "14px", marginTop: "4px", color: "#9CA3AF" }}>
                Try checking your spelling or using a different search term.
              </p>
            </div>
          ) : (
            <BranchTable branches={filteredBranches} />
          )}
        </div>
      </div>
      {showModal && (
        <AddBranchWizard
          onClose={() => setShowModal(false)}
          onSuccess={fetchBranches}
        />
      )}

      {/* Add animation styles */}
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
    </div>
  );
};

export default BranchManagement;