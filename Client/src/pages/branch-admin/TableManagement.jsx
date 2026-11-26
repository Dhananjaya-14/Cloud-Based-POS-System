import { useTranslation } from "react-i18next";
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTablesByBranch, createTable, updateTable, deleteTable, getOrders } from "../../services/api";
import { connectSocket, subscribeToTableUpdates } from "../../services/socket";
import Sidebar from "../../layout/slidebar";
import Header from "../../layout/header";
import { FaRegEdit, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { Armchair, Check, Clock, LayoutGrid, List, Plus, Search, User, Users } from "lucide-react";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";
const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#071E38] text-white hover:bg-[#0F9B8E] focus:ring-[#0F9B8E]",
    secondary: "bg-white text-[#071E38] border-[1.5px] border-[#E7E3D8] hover:border-[#0F9B8E] hover:text-[#0F9B8E] focus:ring-[#0F9B8E]",
    danger: "bg-[#E0654F] text-white hover:bg-[#C9533F] focus:ring-[#E0654F]",
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
}) => <div className={`w-full overflow-x-auto bg-white rounded-[14px] border border-[#E7E3D8] ${className}`}>
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>;
const TableHeader = ({
  children
}) => <thead className="bg-[#FBFAF7] border-b border-[#E7E3D8] text-[10.5px] font-bold tracking-[0.05em] text-[#5B6470] uppercase">
    <tr>{children}</tr>
  </thead>;
const TableHead = ({
  children,
  className = '',
  ...props
}) => <th className={`px-6 py-4 ${className}`} {...props}>{children}</th>;
const TableBody = ({
  children
}) => <tbody className="divide-y divide-[#E7E3D8]">
    {children}
  </tbody>;
const TableRow = ({
  children,
  className = ''
}) => <tr className={`hover:bg-[#FBFAF7] transition-colors ${className}`}>
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
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderTable, setOrderTable] = useState(null);
  const [busyTableId, setBusyTableId] = useState(null);
  const [now, setNow] = useState(Date.now());
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
      fetchActiveOrders();
    } catch (error) {
      toast.error("Failed to load tables");
      console.error(error);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };
  const fetchActiveOrders = async () => {
    try {
      if (!user?.b_id) return;
      const data = await getOrders({
        b_id: user.b_id
      });
      const list = Array.isArray(data) ? data : data?.data || [];
      setActiveOrders(list.filter(order => {
        const status = String(order?.or_status || "").toLowerCase();
        return order?.table_id && !["completed", "cancelled", "voided", "delivered"].includes(status);
      }));
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
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
  const changeTableStatus = async (table, nextStatus, message) => {
    setBusyTableId(table.id);
    try {
      await updateTable(table.id, {
        table_number: table.table_number,
        table_capacity: parseInt(table.chair_count),
        table_status: nextStatus.toLowerCase(),
        area: table.area,
        branch_id: user.b_id
      });
      setTables(prev => prev.map(item => item.id === table.id ? {
        ...item,
        table_status: nextStatus.toLowerCase(),
        status: nextStatus
      } : item));
      toast.success(message);
      fetchActiveOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update table");
    } finally {
      setBusyTableId(null);
    }
  };
  const getOrderStart = order => {
    const rawDate = order?.or_date;
    const rawTime = order?.or_time;
    if (rawDate && rawTime) {
      const datePart = typeof rawDate === "string" ? rawDate.slice(0, 10) : new Date(rawDate).toISOString().slice(0, 10);
      const parsed = new Date(`${datePart}T${String(rawTime).slice(0, 8)}`).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    const fallback = new Date(order?.created_at || rawDate || 0).getTime();
    return Number.isNaN(fallback) ? null : fallback;
  };
  const activeOrderByTable = useMemo(() => {
    const map = new Map();
    activeOrders.forEach(order => {
      const key = Number(order.table_id);
      const existing = map.get(key);
      if (!existing || (getOrderStart(order) || 0) > (getOrderStart(existing) || 0)) {
        map.set(key, order);
      }
    });
    return map;
  }, [activeOrders]);
  const formatSeated = start => {
    if (!start) return "";
    const mins = Math.max(0, Math.floor((now - start) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours >= 24) return "";
    return `${hours}h ${String(mins % 60).padStart(2, "0")}m ago`;
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
  const STATUS_STYLES = {
    Available: {
      pill: "bg-[rgba(60,174,73,0.12)] text-[#3CAE49]",
      dot: "bg-[#3CAE49]",
      accent: "bg-[#3CAE49]",
      sub: "text-[#5B6470]"
    },
    Occupied: {
      pill: "bg-[rgba(224,101,79,0.1)] text-[#E0654F]",
      dot: "bg-[#E0654F]",
      accent: "bg-[#E0654F]",
      sub: "font-semibold text-[#E0654F]"
    },
    Reserved: {
      pill: "bg-[rgba(217,161,92,0.16)] text-[#B47B34]",
      dot: "bg-[#D9A15C]",
      accent: "bg-[#D9A15C]",
      sub: "font-semibold text-[#B47B34]"
    }
  };
  const getStatusBadge = status => {
    const style = STATUS_STYLES[status];
    return <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${style ? style.pill : "bg-[#F0EEE7] text-[#5B6470]"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${style ? style.dot : "bg-[#9CA3AF]"}`} />
        {status}
      </span>;
  };
  const AREA_ORDER = ["Main Hall", "Bar Counter", "Terrace", "Garden", "VIP Deck", "Private Room"];
  const tablesByArea = useMemo(() => {
    const groups = new Map();
    filteredTables.forEach(table => {
      const area = table.area || "Other";
      groups.set(area, [...(groups.get(area) || []), table]);
    });
    return [...groups.entries()].sort(([a], [b]) => {
      const ia = AREA_ORDER.indexOf(a);
      const ib = AREA_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
  }, [filteredTables]);
  const tableTitle = number => /^\d+$/.test(String(number || "")) ? `Table ${number}` : number;
  const cardBtn = "flex-1 cursor-pointer rounded-lg border-[1.5px] bg-white px-2 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const cardBtnNeutral = `${cardBtn} border-[#E7E3D8] text-[#071E38] hover:border-[#0F9B8E] hover:text-[#0F9B8E]`;
  const cardBtnDanger = `${cardBtn} border-[rgba(224,101,79,0.3)] text-[#E0654F] hover:bg-[#E0654F] hover:text-white`;
  const filterSelect = "cursor-pointer rounded-lg border-[1.5px] border-[#E7E3D8] bg-white px-3.5 py-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0F9B8E] min-w-[130px]";
  const renderTableCard = table => {
    const style = STATUS_STYLES[table.status] || STATUS_STYLES.Available;
    const order = activeOrderByTable.get(Number(table.id));
    const busy = busyTableId === table.id;
    let subText = "Ready to seat";
    if (table.status === "Occupied") {
      const seated = order ? formatSeated(getOrderStart(order)) : "";
      subText = seated ? `Seated ${seated}` : "Seated";
    } else if (table.status === "Reserved") {
      subText = "Booked";
    }
    return <div key={table.id} className="relative overflow-hidden rounded-[14px] border border-[#E7E3D8] bg-white p-[18px] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(7,30,56,0.08)]">
        <span className={`absolute inset-x-0 top-0 h-[3px] ${style.accent}`} />
        <div className="mb-3.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-space text-[18px] font-bold text-[#071E38]">{tableTitle(table.table_number)}</div>
            <div className="mt-0.5 truncate text-[11px] text-[#5B6470]">{table.area}</div>
          </div>
          {getStatusBadge(table.status)}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#E7E3D8] pt-3">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-[#5B6470]">
            <User size={14} strokeWidth={1.8} />
            {table.chair_count} seats
          </span>
          <span className={`truncate text-[11px] ${style.sub}`}>{subText}</span>
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {table.status === "Available" && <button type="button" disabled={busy} onClick={() => changeTableStatus(table, "Occupied", "Guests seated")} className={cardBtnNeutral}>Seat guests</button>}
          {table.status === "Occupied" && <>
              <button type="button" disabled={busy} onClick={() => setOrderTable(table)} className={cardBtnNeutral}>View order</button>
              <button type="button" disabled={busy} onClick={() => changeTableStatus(table, "Available", "Table cleared")} className={cardBtnDanger}>Clear</button>
            </>}
          {table.status === "Reserved" && <>
              <button type="button" disabled={busy} onClick={() => changeTableStatus(table, "Occupied", "Guests checked in")} className={cardBtnNeutral}>Check in</button>
              <button type="button" disabled={busy} onClick={() => changeTableStatus(table, "Available", "Reservation cancelled")} className={cardBtnDanger}>Cancel</button>
            </>}
        </div>
      </div>;
  };
  const selectedOrder = orderTable ? activeOrderByTable.get(Number(orderTable.id)) : null;
  return <div className="flex min-h-screen bg-[#F7F5F0]">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-hidden ml-[240px]">
        <Header title={t("branch_admin.table_management", "Table Management")} />

        <div className="flex-1 overflow-y-auto px-9 py-8 text-[#1A1A1A]">

          <div className="mb-[22px] flex items-start justify-between gap-4">
            <div>
              <h2 className="m-0 mb-1 font-space text-xl font-bold text-[#071E38]">{t("branch_admin.table_grid", "Table grid")}</h2>
              <p className="m-0 text-[13px] text-[#5B6470]">{t("branch_admin.table_grid_subtitle", "Manage floor capacity and live status")}</p>
            </div>
            <button type="button" onClick={openAddModal} className="inline-flex shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-lg border-0 bg-[#071E38] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0F9B8E]">
              <Plus size={14} strokeWidth={2.2} />{t("branch_admin.add_new_table", t("buttons.add_new_table", "Add New Table"))}</button>
          </div>

          <div className="mb-[22px] grid grid-cols-2 gap-[18px] md:grid-cols-4">
            {[{
            icon: <Armchair size={20} strokeWidth={1.8} />,
            tone: "bg-[rgba(11,46,79,0.08)] text-[#0B2E4F]",
            label: t("branch_admin.total_tables", "Total Tables"),
            value: totalTables
          }, {
            icon: <Check size={20} strokeWidth={2.2} />,
            tone: "bg-[rgba(60,174,73,0.12)] text-[#3CAE49]",
            label: t("branch_admin.available", "Available"),
            value: availableTables
          }, {
            icon: <Users size={20} strokeWidth={1.8} />,
            tone: "bg-[rgba(224,101,79,0.1)] text-[#E0654F]",
            label: t("branch_admin.occupied", "Occupied"),
            value: occupiedTables
          }, {
            icon: <Clock size={20} strokeWidth={1.8} />,
            tone: "bg-[rgba(217,161,92,0.16)] text-[#D9A15C]",
            label: t("branch_admin.reserved", "Reserved"),
            value: reservedTables
          }].map(card => <div key={card.label} className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-5">
                <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] ${card.tone}`}>{card.icon}</div>
                <div>
                  <div className="mb-[3px] text-[12.5px] text-[#5B6470]">{card.label}</div>
                  <div className="font-space text-[24px] font-bold leading-none text-[#071E38]">{card.value}</div>
                </div>
              </div>)}
          </div>

          <div className="mb-[22px] flex flex-wrap items-center gap-3 rounded-[14px] border border-[#E7E3D8] bg-white px-[18px] py-4">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
              <input type="text" placeholder={t("branch_admin.search_by_table_number", "Search by table number...")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-lg border-[1.5px] border-[#E7E3D8] bg-white py-2.5 pl-9 pr-3.5 text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0F9B8E]" />
            </div>

            <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className={filterSelect}>
              {["All Areas", ...AREA_ORDER].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterSelect}>
              {["All Status", "Available", "Occupied", "Reserved"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select value={filterCapacity} onChange={e => setFilterCapacity(e.target.value)} className={filterSelect}>
              {["Any Capacity", "2 Persons", "4 Persons", "6+ Persons"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>

            <div className="ml-0.5 flex gap-1.5 border-l border-[#E7E3D8] pl-3">
              {[{
              mode: "list",
              icon: <List size={15} strokeWidth={1.8} />,
              label: "List view"
            }, {
              mode: "grid",
              icon: <LayoutGrid size={15} strokeWidth={1.8} />,
              label: "Grid view"
            }].map(item => <button key={item.mode} type="button" aria-label={item.label} onClick={() => setViewMode(item.mode)} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] transition-colors ${viewMode === item.mode ? "border-[#071E38] bg-[#071E38] text-white" : "border-[#E7E3D8] bg-white text-[#071E38] hover:border-[#0F9B8E] hover:text-[#0F9B8E]"}`}>
                  {item.icon}
                </button>)}
            </div>
          </div>

          {loading ? <div className="flex flex-col items-center justify-center p-20">
               <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E7E3D8] border-t-[#0F9B8E]"></div>
               <p className="text-[13px] font-semibold text-[#5B6470]">{t("branch_admin.loading_tables", "Loading Tables...")}</p>
             </div> : viewMode === "grid" ? <div>
              {tablesByArea.map(([area, list], index) => <section key={area} className={index === 0 ? "" : "mt-[26px]"}>
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <h3 className="m-0 font-space text-[14.5px] font-bold text-[#071E38]">{area}</h3>
                    <span className="text-[12px] font-medium text-[#5B6470]">{list.length} {list.length === 1 ? "table" : "tables"}</span>
                    <span className="h-px flex-1 bg-[#E7E3D8]" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {list.map(renderTableCard)}
                  </div>
                </section>)}
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
                    <TableCell className="font-space font-bold text-[#071E38]">{table.table_number}</TableCell>
                    <TableCell className="text-[#5B6470]">{table.area}</TableCell>
                    <TableCell className="text-center text-[#5B6470]">{table.chair_count} {t("branch_admin.persons", "Persons")}</TableCell>
                    <TableCell>{getStatusBadge(table.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" aria-label="Edit table" onClick={() => openEditModal(table)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] border-[#E7E3D8] bg-white text-[#071E38] transition-colors hover:border-[#0F9B8E] hover:text-[#0F9B8E]">
                          <FaRegEdit size={14} />
                        </button>
                        <button type="button" aria-label="Delete table" onClick={() => confirmDelete(table.id)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border-[1.5px] border-[rgba(224,101,79,0.3)] bg-white text-[#E0654F] transition-colors hover:bg-[#E0654F] hover:text-white">
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}

          {!loading && filteredTables.length === 0 && <div className="flex flex-col items-center p-16 text-center">
               <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[11px] bg-[#FBFAF7] text-[#5B6470]">
                 <Armchair size={20} strokeWidth={1.8} />
               </div>
               <h3 className="m-0 font-space text-[14.5px] font-bold text-[#071E38]">{t("branch_admin.no_tables_found_matching_your_criteria", "No tables found matching your criteria.")}</h3>
             </div>}
        </div>
      </div>

      <Modal isOpen={Boolean(orderTable)} onClose={() => setOrderTable(null)} title={orderTable ? `${tableTitle(orderTable.table_number)} — current order` : ""}>
        {selectedOrder ? <div className="space-y-3 text-[13px]">
            {[["Order", `#${selectedOrder.or_id}`], ["Status", String(selectedOrder.or_status || "-").replace(/\b\w/g, c => c.toUpperCase())], ["Placed", getOrderStart(selectedOrder) ? new Date(getOrderStart(selectedOrder)).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
          }) : "-"], ["Total", `$${Number(selectedOrder.or_totalCostWtax ?? selectedOrder.or_totalcost ?? 0).toFixed(2)}`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[#E7E3D8] pb-2.5 last:border-b-0">
                <span className="text-[#5B6470]">{label}</span>
                <span className="font-semibold text-[#071E38]">{value}</span>
              </div>)}
            {selectedOrder.or_notes && <p className="m-0 rounded-lg bg-[#FBFAF7] p-3 text-[12.5px] text-[#5B6470]">{selectedOrder.or_notes}</p>}
          </div> : <p className="m-0 text-[13px] text-[#5B6470]">No active order found for this table.</p>}
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setOrderTable(null)}>{t("buttons.close", "Close")}</Button>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editTarget ? t("branch_admin.edit_table", "Edit Table") : t("branch_admin.add_new_table", "Add New Table")}>
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

