import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/branch-admin/Sidebar';
import Header from '../../components/branch-admin/Header';
import ReorderModal from '../../components/branch-admin/ReorderModal';
import EditMaterialModal from '../../components/branch-admin/EditMaterialModal';
import StatCard from '../../components/branch-admin/StatCard';

const InventoryDashboard = () => {
  const navigate = useNavigate();

  const getCachedMaterials = () => {
    const saved = localStorage.getItem('cached_materials');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.data)) return parsed.data;
      if (Array.isArray(parsed?.materials)) return parsed.materials;
      return [];
    } catch {
      return [];
    }
  };

  const [materials, setMaterials] = useState(getCachedMaterials);
  const [isLoading, setIsLoading] = useState(() => getCachedMaterials().length === 0);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.materials)) return data.materials;
    return [];
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const res = await fetch('/api/raw-materials', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.status === 401) {
        // Not authorized — redirect to login (or handle as needed)
        setIsLoading(false);
        navigate('/login');
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Failed to load inventory, status:', res.status, text);
        setIsLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const items = extractArray(data);

      setMaterials(items);
      localStorage.setItem('cached_materials', JSON.stringify(items));
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const list = Array.isArray(materials) ? materials : [];
    return {
      total: list.length,
      lowStock: list.filter(m => m?.low_stock === true && Number(m?.stock_qty) > 0).length,
      outOfStock: list.filter(m => Number(m?.stock_qty) <= 0).length
    };
  }, [materials]);

  const getStatus = (item) => {
    const qty = Number(item?.stock_qty ?? 0);
    if (qty <= 0) return { label: 'OUT OF STOCK', color: 'bg-red-100 text-red-600' };
    if (item?.low_stock) return { label: 'LOW STOCK', color: 'bg-yellow-100 text-yellow-600' };
    return { label: 'IN STOCK', color: 'bg-green-100 text-green-600' };
  };

  const ItemSkeleton = () => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 flex justify-between items-center animate-pulse">
      <div className="flex-1 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-3 bg-gray-100 rounded w-1/6"></div>
        <div className="flex gap-12 pt-2"><div className="h-8 bg-gray-50 rounded w-20"></div></div>
      </div>
      <div className="h-10 bg-gray-100 rounded-lg w-32"></div>
    </div>
  );

  const listToRender = Array.isArray(materials) ? materials : [];

  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: 240 }}>
        <Header title="Inventory Management" />

        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="flex gap-6 mb-8">
            <StatCard title="Total Raw Materials" value={isLoading ? '...' : stats.total} colorClass="bg-blue-100 text-blue-600" icon="📦" />
            <StatCard title="Low Stock Items" value={isLoading ? '...' : stats.lowStock} colorClass="bg-yellow-100 text-yellow-600" icon="⚠️" />
            <StatCard title="Out of Stock" value={isLoading ? '...' : stats.outOfStock} colorClass="bg-red-100 text-red-600" icon="🚫" />
          </div>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Item List</h1>
            <button
              onClick={() => navigate('/branch-admin/raw-ingredient')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <span>+</span> Add New Item
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              [...Array(5)].map((_, i) => <ItemSkeleton key={i} />)
            ) : (
              listToRender.map((item, idx) => {
                const status = getStatus(item);
                const key = item?.rm_id ?? item?.id ?? item?._id ?? idx;
                return (
                  <div key={key} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-all duration-200">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800">{item?.rm_name}</h3>
                      <p className="text-sm text-gray-500 mb-3">Unit: {item?.unit}</p>
                      <div className="flex gap-12">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Stock</p>
                          <p className="font-semibold text-gray-700">{item?.stock_qty ?? 0} {item?.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reorder Level</p>
                          <p className="font-semibold text-gray-700">{item?.record_level ?? 0} {item?.unit}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => { setSelectedMaterial(item); setIsEditModalOpen(true); }}
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => { setSelectedMaterial(item); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-600 hover:text-white text-blue-600 font-medium rounded-lg border border-blue-600 transition-all group"
                      >
                        <span className="group-hover:rotate-12 transition-transform">🛒</span> Reorder
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ReorderModal
          material={selectedMaterial}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchMaterials}
        />
      )}

      {isEditModalOpen && (
        <EditMaterialModal
          material={selectedMaterial}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={fetchMaterials}
          setMaterials={setMaterials}
        />
      )}
    </>
  );
};

export default InventoryDashboard;




































// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Sidebar from '../../components/branch-admin/Sidebar';
// import Header from '../../components/branch-admin/Header';
// import ReorderModal from '../../components/branch-admin/ReorderModal';
// import EditMaterialModal from '../../components/branch-admin/EditMaterialModal';
// import StatCard from '../../components/branch-admin/StatCard';

// const InventoryDashboard = () => {
//   const navigate = useNavigate();
  
//   // 1. Instant Load Logic: Check if we have cached data first
//   // const [materials, setMaterials] = useState(() => {
//   //   const saved = localStorage.getItem('cached_materials');
//   //   return saved ? JSON.parse(saved) : [];
//   // });


//   const [materials, setMaterials] = useState(() => {
//   const saved = localStorage.getItem('cached_materials');
//   const parsed = saved ? JSON.parse(saved) : [];
//   return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed?.materials) ? parsed.materials : []));
// });

//   // If we have cached data, start isLoading as false so the list appears immediately
//   const [isLoading, setIsLoading] = useState(materials.length === 0);
//   const [selectedMaterial, setSelectedMaterial] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);

//   useEffect(() => {
//     fetchMaterials();
//   }, []);

//   const fetchMaterials = async () => {
//     try {
//       const response = await fetch('/api/raw-materials');
//       const data = await response.json();
      
//       // Update state and Cache for the next visit
//       setMaterials(data);
//       localStorage.setItem('cached_materials', JSON.stringify(data));
//     } catch (err) {
//       console.error("Failed to load inventory", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ... (stats and getStatus logic remain the same)
//   const stats = useMemo(() => {
//     return {
//       total: materials.length,
//       lowStock: materials.filter(m => m.low_stock === true && Number(m.stock_qty) > 0).length,
//       outOfStock: materials.filter(m => Number(m.stock_qty) <= 0).length
//     };
//   }, [materials]);

//   const getStatus = (item) => {
//     if (item.stock_qty <= 0) return { label: 'OUT OF STOCK', color: 'bg-red-100 text-red-600' };
//     if (item.low_stock) return { label: 'LOW STOCK', color: 'bg-yellow-100 text-yellow-600' };
//     return { label: 'IN STOCK', color: 'bg-green-100 text-green-600' };
//   };

//   const ItemSkeleton = () => (
//     <div className="bg-white p-5 rounded-xl border border-gray-100 flex justify-between items-center animate-pulse">
//       <div className="flex-1 space-y-3">
//         <div className="h-5 bg-gray-200 rounded w-1/4"></div>
//         <div className="h-3 bg-gray-100 rounded w-1/6"></div>
//         <div className="flex gap-12 pt-2"><div className="h-8 bg-gray-50 rounded w-20"></div></div>
//       </div>
//       <div className="h-10 bg-gray-100 rounded-lg w-32"></div>
//     </div>
//   );

//   return (
//     <>
//       <Sidebar />
//       <div style={{ marginLeft: 240 }}>
//         <Header title="Inventory Management" />
        
//         <div className="p-8 bg-gray-50 min-h-screen">
//           {/* STAT CARDS */}
//           <div className="flex gap-6 mb-8">
//             <StatCard title="Total Raw Materials" value={isLoading ? "..." : stats.total} colorClass="bg-blue-100 text-blue-600" icon="📦" />
//             <StatCard title="Low Stock Items" value={isLoading ? "..." : stats.lowStock} colorClass="bg-yellow-100 text-yellow-600" icon="⚠️" />
//             <StatCard title="Out of Stock" value={isLoading ? "..." : stats.outOfStock} colorClass="bg-red-100 text-red-600" icon="🚫" />
//           </div>

//           <div className="flex justify-between items-center mb-6">
//             <h1 className="text-2xl font-bold text-gray-800">Item List</h1>
//             <button 
//               onClick={() => navigate('/branch-admin/raw-ingredient')}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95"
//             >
//               <span>+</span> Add New Item
//             </button>
//           </div>

//           <div className="space-y-4">
//             {isLoading ? (
//               [...Array(5)].map((_, i) => <ItemSkeleton key={i} />)
//             ) : (
//               materials.map((item) => {
//                 const status = getStatus(item);
//                 return (
//                   <div key={item.rm_id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-all duration-200">
//                     <div className="flex-1">
//                       <h3 className="font-bold text-lg text-gray-800">{item.rm_name}</h3>
//                       <p className="text-sm text-gray-500 mb-3">Unit: {item.unit}</p>
//                       <div className="flex gap-12">
//                         <div>
//                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Stock</p>
//                           <p className="font-semibold text-gray-700">{item.stock_qty} {item.unit}</p>
//                         </div>
//                         <div>
//                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reorder Level</p>
//                           <p className="font-semibold text-gray-700">{item.record_level} {item.unit}</p>
//                         </div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-4">
//                       <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${status.color}`}>
//                         {status.label}
//                       </span>
//                       <button
//                         onClick={() => { setSelectedMaterial(item); setIsEditModalOpen(true); }}
//                         className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
//                       >
//                         ✏️
//                       </button>
//                       <button
//                         onClick={() => { setSelectedMaterial(item); setIsModalOpen(true); }}
//                         className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-600 hover:text-white text-blue-600 font-medium rounded-lg border border-blue-600 transition-all group"
//                       >
//                         <span className="group-hover:rotate-12 transition-transform">🛒</span> Reorder
//                       </button>
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>
//       </div>

//       {/* MODALS */}
//       {isModalOpen && (
//         <ReorderModal 
//           material={selectedMaterial} 
//           onClose={() => setIsModalOpen(false)} 
//           onSuccess={fetchMaterials} 
//         />
//       )}

//       {isEditModalOpen && (
//         <EditMaterialModal 
//           material={selectedMaterial} 
//           onClose={() => setIsEditModalOpen(false)} 
//           onSuccess={fetchMaterials} 
//           setMaterials={setMaterials} 
//         />
//       )}
//     </>
//   );
// };

// export default InventoryDashboard;






