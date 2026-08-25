import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import ReorderModal from './ReorderModal';
const InventoryDashboard = () => {
  const { t } = useTranslation();
const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    fetchMaterials();
  }, []);
  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials');
      const data = await response.json();
      setMaterials(data); // Returns rm_id, rm_name, stock_qty, record_level, low_stock
    } catch (err) {
      console.error("Failed to load inventory", err);
    }
  };
  const getStatus = item => {
    if (item.stock_qty <= 0) return {
      label: 'OUT OF STOCK',
      color: 'bg-red-100 text-red-600'
    };
    if (item.low_stock) return {
      label: 'LOW STOCK',
      color: 'bg-yellow-100 text-yellow-600'
    };
    return {
      label: 'IN STOCK',
      color: 'bg-green-100 text-green-600'
    };
  };
  return <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("branch_admin.inventory_management", "Inventory Management")}</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <span>+</span>{t("branch_admin.add_new_item", "Add New Item")}</button>
      </div>

      {/* Inventory List */}
      <div className="space-y-4">
        {materials.map(item => {
        const status = getStatus(item);
        return <div key={item.rm_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{item.rm_name}</h3>
                <p className="text-sm text-gray-500">{t("branch_admin.unit", "Unit:")}{item.unit}</p>
                <div className="flex gap-8 mt-2">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">{t("branch_admin.quantity", "Quantity")}</p>
                    <p className="font-semibold">{item.stock_qty} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">{t("branch_admin.reorder_level", "Reorder Level")}</p>
                    <p className="font-semibold">{item.record_level} {item.unit}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                  {status.label}
                </span>
                <button onClick={() => {
              setSelectedMaterial(item);
              setIsModalOpen(true);
            }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg border border-blue-200">{t("branch_admin.reorder", "🛒 Reorder")}</button>
              </div>
            </div>;
      })}
      </div>

      {isModalOpen && <ReorderModal material={selectedMaterial} onClose={() => setIsModalOpen(false)} onSuccess={fetchMaterials} />}
    </div>;
};
export default InventoryDashboard;