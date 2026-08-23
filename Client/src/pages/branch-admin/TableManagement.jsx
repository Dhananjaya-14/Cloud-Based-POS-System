import { useTranslation } from "react-i18next";
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTablesByBranch, createTable, updateTable, deleteTable } from "../../services/api";
import { connectSocket, subscribeToTableUpdates } from "../../services/socket";
import Sidebar from "../../components/branch-admin/Sidebar";
import Header from "../../components/branch-admin/Header";
import { FaPlus, FaRegEdit, FaTrash, FaSearch, FaCheck, FaChair, FaClock, FaHeartbeat, FaMapMarkerAlt, FaUserFriends, FaThLarge, FaList, FaExclamationTriangle } from "react-icons/fa";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md shadow-blue-500/30",
    secondary: "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-md shadow-red-500/30",
    ghost: "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
    dangerGhost: "bg-transparent text-red-500 hover:text-red-700 hover:bg-red-50 focus:ring-red-500",
    activeGhost: "bg-blue-50 text-blue-600 border border-blue-200 focus:ring-blue-500"
  };
  return <button className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>;
};
const Card = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${hover ? 'transition-all hover:-translate-y-1 hover:shadow-lg' : ''} ${className}`} {...props}>
      {children}
    </div>;
};
const CardHeader = ({
  children,
  className = ''
}) => <div className={`p-5 pb-4 border-b border-gray-100 ${className}`}>{children}</div>;
const CardContent = ({
  children,
  className = ''
}) => <div className={`p-5 ${className}`}>{children}</div>;
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md'
}) => {
if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}>
        {title && <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>;
};
const Input = ({
  label,
  id,
  className = '',
  ...props
}) => {
return <div className={`w-full ${className}`}>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-semibold text-gray-700">{label}</label>}
      <input id={id} className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors" {...props} />
    </div>;
};
const Select = ({
  label,
  id,
  options,
  className = '',
  ...props
}) => {
return <div className={`w-full ${className}`}>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-semibold text-gray-700">{label}</label>}
      <select id={id} className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors cursor-pointer" {...props}>
        {options.map((opt, i) => <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
            {typeof opt === 'object' ? opt.label : opt}
          </option>)}
      </select>
    </div>;
};
const Badge = ({
  children,
  variant = 'gray',
  className = '',
  ...props
}) => {
const variants = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    red: "bg-red-50 text-red-600 border-red-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200"
  };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wide border rounded-full ${variants[variant] || variants.gray} ${className}`} {...props}>
      {children}
    </span>;
};
const Table = ({
  children,
  className = ''
}) => <div className={`w-full overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>;
const TableHeader = ({
  children
}) => <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold tracking-wider text-gray-500 uppercase">
    <tr>{children}</tr>
  </thead>;
const TableHead = ({
  children,
  className = '',
  ...props
}) => <th className={`px-6 py-4 ${className}`} {...props}>{children}</th>;
const TableBody = ({
  children
}) => <tbody className="divide-y divide-gray-100">
    {children}
  </tbody>;
const TableRow = ({
  children,
  className = ''
}) => <tr className={`hover:bg-gray-50 transition-colors ${className}`}>
    {children}
  </tr>;
const TableCell = ({
  children,
  className = '',
  ...props
}) => <td className={`px-6 py-4 text-sm ${className}`} {...props}>{children}</td>;
const TableManagement = () => {
  const { t } = useTranslation();
const {
    user
  } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    toasts,
    removeToast,
    toast
  } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({
    table_number: "",
    chair_count: 2,
    status: "Available",
    area: "Main Hall"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("All Areas");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterCapacity, setFilterCapacity] = useState("Any Capacity");
  const [viewMode, setViewMode] = useState("grid");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const fetchTables = async (showSpinner = true) => {
    try {
      if (!user?.b_id) return;
      if (showSpinner) setLoading(true);
      const data = await getTablesByBranch(user.b_id);
      const normalizedData = data.map(t => ({
        ...t,
        id: t.table_id,
        chair_count: t.table_capacity,
        status: t.table_status.charAt(0).toUpperCase() + t.table_status.slice(1)
      }));
      setTables(normalizedData);
    } catch (error) {
      toast.error("Failed to load tables");
      console.error(error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };
  useEffect(() => {
    fetchTables(true);
    if (user?.b_id) {
      connectSocket();
      const unsubscribe = subscribeToTableUpdates(user.b_id, {
        onTableUpdated: data => {
          setTables(prev => prev.map(t => t.table_id === data.table_id ? {
            ...t,
            table_status: data.table_status,
            status: data.table_status.charAt(0).toUpperCase() + data.table_status.slice(1)
          } : t));
        }
      });
      return () => unsubscribe();
    }
  }, [user?.b_id]);
  const openAddModal = () => {
setEditTarget(null);
    setFormData({
      table_number: "",
      chair_count: 2,
      status: "Available",
      area: "Main Hall"
    });
    setIsModalOpen(true);
  };
  const openEditModal = table => {
    setEditTarget(table);
    setFormData({
      table_number: table.table_number,
      chair_count: table.chair_count,
      status: table.status,
      area: table.area
    });
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
  const handleSave = async e => {
    e.preventDefault();
    try {
      const payload = {
        table_number: formData.table_number,
        table_capacity: parseInt(formData.chair_count),
        table_status: formData.status.toLowerCase(),
        area: formData.area,
        branch_id: user.b_id
      };
      if (editTarget) {
        await updateTable(editTarget.id, payload);
        toast.success("Table updated successfully!");
      } else {
        await createTable(payload);
        toast.success("New table created successfully!");
      }
      closeModal();
      fetchTables(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save table");
    }
  };
  const confirmDelete = id => {
    setTableToDelete(id);
    setDeleteModalOpen(true);
  };
  const executeDelete = async () => {
    try {
      await deleteTable(tableToDelete);
      toast.success("Table deleted successfully!");
      setDeleteModalOpen(false);
      setTableToDelete(null);
      fetchTables(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete table");
    }
  };
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (searchTerm && !t.table_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterArea !== "All Areas" && t.area !== filterArea) return false;
      if (filterStatus !== "All Status" && t.status !== filterStatus) return false;
      if (filterCapacity !== "Any Capacity") {
        if (filterCapacity === "2 Persons" && Number(t.chair_count) !== 2) return false;
        if (filterCapacity === "4 Persons" && Number(t.chair_count) !== 4) return false;
        if (filterCapacity === "6+ Persons" && Number(t.chair_count) < 6) return false;
      }
      return true;
    });
  }, [tables, searchTerm, filterArea, filterStatus, filterCapacity]);

  // KPIs based on filtered tables
  const totalTables = filteredTables.length;
  const availableTables = filteredTables.filter(t => t.status === "Available").length;
  const occupiedTables = filteredTables.filter(t => t.status === "Occupied").length;
  const reservedTables = filteredTables.filter(t => t.status === "Reserved").length;
  const getStatusBadge = status => {
    switch (status) {
      case "Available":
        return <Badge variant="green"><FaCheck /> {status}</Badge>;
      case "Occupied":
        return <Badge variant="red"><FaHeartbeat /> {status}</Badge>;
      case "Reserved":
        return <Badge variant="amber"><FaClock /> {status}</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };
  const getStatusColorClass = status => {
    switch (status) {
      case "Available":
        return "bg-emerald-500";
      case "Occupied":
        return "bg-red-500";
      case "Reserved":
        return "bg-amber-500";
      default:
        return "bg-gray-400";
    }
  };
  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-hidden ml-[240px]">
        <Header title={t("branch_admin.table_management", "Table Management")} />
        
        {/* Main UI Container */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto font-sans text-gray-900 bg-gray-50">
          
          {/* Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 m-0 gap-2 flex items-center">
                <span className="text-gray-900">{t("branch_admin.table", "TABLE")}</span>
                <span className="text-blue-600">{t("branch_admin.grid", "GRID")}</span>
              </h1>
              <p className="mt-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">{t("branch_admin.manage_floor_capacity_and_live_status", "Manage Floor Capacity and Live Status")}</p>
            </div>
            
            <Button onClick={openAddModal} variant="primary">
              <FaPlus />{t("branch_admin.add_new_table", t("buttons.add_new_table", "Add New Table"))}</Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-5 mb-6 md:grid-cols-4">
            <Card className="flex items-center gap-4 p-5">
              <div className="flex items-center justify-center w-12 h-12 text-xl text-blue-600 rounded-xl bg-blue-50">
                <FaChair />
              </div>
              <div>
                <h3 className="m-0 text-2xl font-bold">{totalTables}</h3>
                <p className="m-0 mt-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("branch_admin.total_tables", "Total Tables")}</p>
              </div>
            </Card>
            
            <Card className="flex items-center gap-4 p-5">
              <div className="flex items-center justify-center w-12 h-12 text-xl text-emerald-600 rounded-xl bg-emerald-50">
                <FaCheck />
              </div>
              <div>
                <h3 className="m-0 text-2xl font-bold">{availableTables}</h3>
                <p className="m-0 mt-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("branch_admin.available", "Available")}</p>
              </div>
            </Card>
            
            <Card className="flex items-center gap-4 p-5">
              <div className="flex items-center justify-center w-12 h-12 text-xl text-red-600 rounded-xl bg-red-50">
                <FaHeartbeat />
              </div>
              <div>
                <h3 className="m-0 text-2xl font-bold">{occupiedTables}</h3>
                <p className="m-0 mt-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("branch_admin.occupied", "Occupied")}</p>
              </div>
            </Card>
            
            <Card className="flex items-center gap-4 p-5">
              <div className="flex items-center justify-center w-12 h-12 text-xl text-amber-600 rounded-xl bg-amber-50">
                <FaClock />
              </div>
              <div>
                <h3 className="m-0 text-2xl font-bold">{reservedTables}</h3>
                <p className="m-0 mt-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t("branch_admin.reserved", "Reserved")}</p>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="flex flex-wrap items-center gap-4 p-4 mb-6">
            <div className="flex items-center flex-1 min-w-[200px] px-3 bg-gray-50 border border-gray-200 rounded-lg">
              <FaSearch className="text-gray-400" />
              <input type="text" placeholder={t("branch_admin.search_by_table_number", "Search by table number...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 text-sm text-gray-900 bg-transparent border-none outline-none" />
            </div>
            
            <Select id="filterArea" value={filterArea} onChange={e => setFilterArea(e.target.value)} className="!w-auto min-w-[140px]" options={["All Areas", "Main Hall", "Bar Counter", "Terrace", "Garden", "VIP Deck", "Private Room"]} />

            <Select id="filterStatus" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="!w-auto min-w-[140px]" options={["All Status", "Available", "Occupied", "Reserved"]} />

            <Select id="filterCapacity" value={filterCapacity} onChange={e => setFilterCapacity(e.target.value)} className="!w-auto min-w-[140px]" options={["Any Capacity", "2 Persons", "4 Persons", "6+ Persons"]} />

            <div className="flex gap-2 ml-auto">
              <Button variant={viewMode === "list" ? "activeGhost" : "secondary"} onClick={() => setViewMode("list")} className="w-11 h-11 !p-0">
                <FaList />
              </Button>
              <Button variant={viewMode === "grid" ? "activeGhost" : "secondary"} onClick={() => setViewMode("grid")} className="w-11 h-11 !p-0">
                <FaThLarge />
              </Button>
            </div>
          </Card>

          {/* Render based on viewMode */}
          {loading ? <div className="flex flex-col items-center justify-center p-20 text-gray-400">
               <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
               <p className="font-semibold text-gray-500">{t("branch_admin.loading_tables", "Loading Tables...")}</p>
             </div> : viewMode === "grid" ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTables.map(table => <Card key={table.id} hover={true} className="relative p-5 cursor-default">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="m-0 text-2xl font-bold text-gray-900">{table.table_number}</h2>
                      <p className="m-0 text-[10px] font-bold tracking-widest text-gray-500 uppercase">{t("branch_admin.table", "Table")}</p>
                    </div>
                    {getStatusBadge(table.status)}
                  </div>

                  <div className="flex items-center justify-between mb-3 text-xs text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <FaUserFriends className="text-gray-400" />
                      <span className="font-semibold">{t("branch_admin.capacity", "Capacity:")}{table.chair_count}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-gray-500 uppercase text-[10px]">
                      <FaMapMarkerAlt /> {table.area}
                    </div>
                  </div>

                  <div className="w-full h-1.5 mb-5 overflow-hidden bg-gray-100 rounded-full">
                    <div className={`h-full w-[70%] ${getStatusColorClass(table.status)}`}></div>
                  </div>

                  <div className="flex items-center justify-end mt-auto">
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEditModal(table)} className="!p-2 text-blue-600">
                        <FaRegEdit size={16} />
                      </Button>
                      <Button variant="dangerGhost" onClick={() => confirmDelete(table.id)} className="!p-2">
                        <FaTrash size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>)}
            </div> : <Table>
              <TableHeader>
                <TableHead>{t("branch_admin.table_number", "Table Number")}</TableHead>
                <TableHead>{t("branch_admin.area", "Area")}</TableHead>
                <TableHead className="text-center">{t("branch_admin.capacity", "Capacity")}</TableHead>
                <TableHead>{t("branch_admin.status", "Status")}</TableHead>
                <TableHead className="text-right">{t("branch_admin.actions", "Actions")}</TableHead>
              </TableHeader>
              <TableBody>
                {filteredTables.map(table => <TableRow key={table.id}>
                    <TableCell className="font-bold text-gray-900">{table.table_number}</TableCell>
                    <TableCell className="font-medium text-gray-500">{table.area}</TableCell>
                    <TableCell className="font-medium text-center text-gray-500">{table.chair_count}{t("branch_admin.persons", "Persons")}</TableCell>
                    <TableCell>{getStatusBadge(table.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEditModal(table)} className="!p-2 text-blue-600">
                          <FaRegEdit size={16} />
                        </Button>
                        <Button variant="dangerGhost" onClick={() => confirmDelete(table.id)} className="!p-2">
                          <FaTrash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}

          {filteredTables.length === 0 && <div className="p-16 text-center text-gray-400">
               <FaChair className="inline-block mb-4 text-gray-200 text-5xl" />
               <h3 className="text-lg font-semibold text-gray-500">{t("branch_admin.no_tables_found_matching_your_criteria", "No tables found matching your criteria.")}</h3>
             </div>}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editTarget ? "Edit Table" : "Add New Table"}>
        <form onSubmit={handleSave} className="space-y-5">
          <Input id="table_number" label={t("fields.table_number", "Table Number")} placeholder={t("branch_admin.e_g_t01", "e.g. T01")} required value={formData.table_number} onChange={e => setFormData({
          ...formData,
          table_number: e.target.value
        })} />

          <Select id="area" label={t("fields.area", "Area")} value={formData.area} onChange={e => setFormData({
          ...formData,
          area: e.target.value
        })} options={["Main Hall", "Bar Counter", "Terrace", "Garden", "VIP Deck", "Private Room"]} />

          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min="1" max="20" id="chair_count" label={t("fields.capacity", "Capacity")} required value={formData.chair_count} onChange={e => setFormData({
            ...formData,
            chair_count: e.target.value
          })} />
            <Select id="status" label={t("fields.status", "Status")} value={formData.status} onChange={e => setFormData({
            ...formData,
            status: e.target.value
          })} options={["Available", "Occupied", "Reserved"]} />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</Button>
            <Button type="submit" variant="primary" className="flex-1">
              {editTarget ? t("buttons.save_changes", "Save Changes") : t("buttons.create_table", "Create Table")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => {
      setDeleteModalOpen(false);
      setTableToDelete(null);
    }}>
        <div className="text-center pb-2">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-full bg-red-100 text-red-500">
            <FaExclamationTriangle size={32} />
          </div>
          <h2 className="mb-3 text-xl font-bold text-gray-900">{t("branch_admin.delete_table", "Delete Table?")}</h2>
          <p className="mb-8 text-sm text-gray-500">{t("branch_admin.are_you_sure_you_want_to_delete_this_tab", "Are you sure you want to delete this table?")}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => {
            setDeleteModalOpen(false);
            setTableToDelete(null);
          }} className="flex-1">{t("branch_admin.cancel", t("buttons.cancel", "Cancel"))}</Button>
            <Button variant="danger" onClick={executeDelete} className="flex-1">{t("branch_admin.yes_delete_it", t("buttons.yes_delete_it", "Yes, Delete it"))}</Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>;
};
export default TableManagement;

