import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import ToastMessage from "../../components/branch-admin/ToastMessage";
import { connectSocket, getSocket, SOCKET_EVENTS } from '../../services/socket';
import { useAuth } from "../../context/AuthContext";
import { getSuppliers } from "../../services/api";
import SupplierDetailView from "../../components/branch-admin/SupplierDetailView";

// ─── Main Branch Admin Supplier Page (Read-Only) ──────────────────────────────
const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Combine both approaches - try API service first, fallback to direct fetch
      try {
        const data = await getSuppliers();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (apiError) {
        console.warn("API service failed, trying direct fetch:", apiError);
        // Fallback to direct fetch
        const token = localStorage.getItem("token");
        const res = await fetch("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch suppliers (${res.status})`);
        const data = await res.json();
        const suppliersList = Array.isArray(data) ? data : data.suppliers || [];
        setSuppliers(suppliersList);
        localStorage.setItem('cached_suppliers', JSON.stringify(suppliersList));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  // Initialize socket and listen for supplier events
  useEffect(() => {
    const companyId = user?.com_id;
    if (!companyId) return;

    // Connect to socket
    const socket = connectSocket();
    
    const handleConnect = () => {
      console.log('Socket connected in SupplierManagement');
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected in SupplierManagement');
      setSocketConnected(false);
    };

    // Listen for new supplier creation
    const handleSupplierCreated = (newSupplier) => {
      console.log('New supplier received via socket:', newSupplier);
      setSuppliers(prevSuppliers => {
        // Check if supplier already exists (prevent duplicates)
        const exists = prevSuppliers.some(s => 
          s.sup_id === newSupplier.sup_id || 
          s.sup_email?.toLowerCase() === newSupplier.sup_email?.toLowerCase()
        );
        if (exists) {
          console.log('Supplier already exists, skipping addition');
          return prevSuppliers;
        }
        // Add new supplier to the list
        const updated = [newSupplier, ...prevSuppliers];
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        showToast(`New supplier "${newSupplier.sup_name}" added!`, "success");
        return updated;
      });
    };

    // Listen for supplier updates
    const handleSupplierUpdated = (updatedSupplier) => {
      console.log('Supplier updated via socket:', updatedSupplier);
      setSuppliers(prevSuppliers => {
        const updated = prevSuppliers.map(s => 
          s.sup_id === updatedSupplier.sup_id ? { ...s, ...updatedSupplier } : s
        );
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        showToast(`Supplier "${updatedSupplier.sup_name}" updated`, "info");
        return updated;
      });
    };

    // Listen for supplier deletion
    const handleSupplierDeleted = (data) => {
      console.log('Supplier deleted via socket:', data);
      setSuppliers(prevSuppliers => {
        const deletedSupplier = prevSuppliers.find(s => s.sup_id === data.sup_id);
        const updated = prevSuppliers.filter(s => s.sup_id !== data.sup_id);
        localStorage.setItem('cached_suppliers', JSON.stringify(updated));
        if (deletedSupplier) {
          showToast(`Supplier "${deletedSupplier.sup_name}" deleted`, "info");
        }
        // If the deleted supplier was selected, clear selection
        if (selectedSupplier?.sup_id === data.sup_id) {
          setSelectedSupplier(null);
        }
        return updated;
      });
    };

    // Set up socket event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('supplier:created', handleSupplierCreated);
    socket.on('supplier:updated', handleSupplierUpdated);
    socket.on('supplier:deleted', handleSupplierDeleted);

    // If socket is already connected, call handleConnect
    if (socket.connected) {
      handleConnect();
    }

    // Initial fetch
    fetchSuppliers();

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('supplier:created', handleSupplierCreated);
      socket.off('supplier:updated', handleSupplierUpdated);
      socket.off('supplier:deleted', handleSupplierDeleted);
    };
  }, [user?.com_id]);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <Header title="Suppliers" role="Branch Admin" />
        {toast.show && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
        
        {/* Socket connection indicator */}
        {socketConnected && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs shadow-lg z-50">
            Live Updates Active
          </div>
        )}
        
        <div className="p-8 max-w-[1200px] mx-auto">
          {selectedSupplier ? (
            <SupplierDetailView supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} showToast={showToast} />
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 m-0">Supplier Directory</h1>
                <p className="text-gray-500 mt-1.5 text-sm">
                  Suppliers assigned to your branch. Contact your Company Admin to add new suppliers.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-600 mb-5 font-medium">
                  {error}
                </div>
              )}

              {isLoading ? (
                <p className="text-gray-500">Loading suppliers...</p>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-5xl mb-3">🏢</div>
                  <p className="font-semibold text-base mb-1">No suppliers assigned to this branch</p>
                  <p className="text-sm">Ask your Company Admin to add suppliers to this branch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {suppliers.map((sup) => (
                    <div
                      key={sup.sup_id}
                      onClick={() => setSelectedSupplier(sup)}
                      className="bg-white p-6 rounded-2xl border border-gray-200 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-200 flex items-center justify-center text-xl">
                          🏢
                        </div>
                        <h3 className="m-0 text-base font-bold text-gray-900">{sup.sup_name}</h3>
                      </div>
                      
                      <div className="text-sm text-gray-600 flex flex-col gap-2">
                        <div className="flex gap-2">📧 <span className="truncate">{sup.sup_email}</span></div>
                        <div className="flex gap-2">📞 <span>{sup.sup_contact}</span></div>
                        <div className="flex gap-2">📍 <span className="text-xs mt-0.5">{sup.sup_address || "No address provided"}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;