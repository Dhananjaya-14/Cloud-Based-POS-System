import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBox, FaBoxOpen, FaChartBar, FaChartLine, FaClipboardList, FaCodeBranch, FaExchangeAlt, FaFileAlt, FaLock, FaMoneyBill, FaSignOutAlt, FaStore, FaTable, FaTag, FaTachometerAlt, FaTrashAlt, FaTruck, FaUndo, FaUsers, FaWifi } from "react-icons/fa";
import { PiInvoiceBold } from "react-icons/pi";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast, ToastContainer } from "../components/super-admin/Toast";

const Slidebar = ({ isOpen = true, setIsOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { features, logout } = useAuth();
  const { toasts, removeToast, toast } = useToast();
  const path = location.pathname;
  const superAdmin = path.startsWith("/super-admin") || path === "/dashboard";
  const branchAdmin = path.startsWith("/branch-admin");
  const locked = (feature) => features && features[feature] !== true;
  const active = (target) => path === target || path.startsWith(`${target}/`);
  const item = (icon, label, target, disabled = false, onClick) => {
    const content = <><span className="text-base">{icon}</span><span className="flex-1 text-sm">{label}</span>{disabled && <FaLock size={12} />}</>;
    if (disabled) return <button type="button" key={label} className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[#4B5A6E] opacity-60" onClick={() => toast.info("Upgrade Required", `Your current package doesn't include ${label}.`)}>{content}</button>;
    return <Link key={label} to={target} onClick={(event) => { if (window.innerWidth < 1024) setIsOpen?.(false); onClick?.(event); }} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 no-underline transition-colors ${active(target) ? "bg-[#112A3C] text-white" : "text-[#8B9BB4] hover:bg-[#112A3C] hover:text-white"}`}>{content}</Link>;
  };
  const section = (label) => <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#5A6D85]">{label}</div>;
  const branchItems = [
    item(<FaTachometerAlt />, t("branch_admin.dashboard_overview", "Dashboard Overview"), "/branch-admin/dashboard"),
    item(<FaBoxOpen />, t("branch_admin.product", "Product"), "/branch-admin/products"),
    item(<FaUsers />, t("branch_admin.user_management", "User Management"), "/branch-admin/users"),
    !locked("has_inventory") && item(<FaClipboardList />, t("branch_admin.inventory_management", "Inventory Management"), "/branch-admin/inventory"),
    !locked("has_inventory") && item(<FaTruck />, t("branch_admin.supplier_directory", "Supplier Directory"), "/branch-admin/suppliers"),
    !locked("has_inventory") && item(<FaBox />, t("branch_admin.add_inventory_item", "Add Inventory Item"), "/branch-admin/raw-ingredient"),
    !locked("has_inventory") && item(<FaChartLine />, t("branch_admin.recipe_mapper", "Recipe Mapper"), "/branch-admin/recipe-mapper"),
    item(<FaExchangeAlt />, t("branch_admin.transactions", "Transactions"), "/branch-admin/transactions"),
    item(<FaChartLine />, t("branch_admin.sales_revenue", "Sales & Revenue"), "/branch-admin/sales-revenue"),
    item(<FaChartBar />, t("branch_admin.cashier_performance", "Cashier Performance"), "/branch-admin/cashier-performance"),
    item(<FaTable />, t("branch_admin.table_management", "Table Management"), "/branch-admin/tables"),
    !locked("has_inventory") && item(<FaTrashAlt />, t("branch_admin.waste_management", "Waste Management"), "/branch-admin/waste-management"),
    !locked("has_inventory") && item(<FaUndo />, t("branch_admin.return_management", "Return Management"), "/branch-admin/return-management"),
    !locked("has_reports") && item(<FaFileAlt />, t("branch_admin.sales_summary", "Sales Summary"), "/branch-admin/summary-sales"),
    !locked("has_reports") && item(<FaFileAlt />, t("branch_admin.product_sales", "Product Sales"), "/branch-admin/summary-productsales"),
    !locked("has_reports") && item(<FaFileAlt />, t("branch_admin.raw_material_stock_report", "Raw Material Stock Report"), "/branch-admin/raw-material-stock"),
    !locked("has_reports") && item(<FaFileAlt />, t("branch_admin.raw_material_consumption_report", "Raw Material Consumption Report"), "/branch-admin/raw-material-consumption"),
  ].filter(Boolean);
  const adminItems = [
    item(<FaTachometerAlt />, t("company_admin.dashboard", "Dashboard"), "/admin/dashboard"),
    item(<FaStore />, t("company_admin.branches", "Branches"), "/branches"),
    item(<FaBox />, t("company_admin.products", "Products"), "/admin/products"),
    item(<FaUsers />, t("company_admin.user_management", "User Management"), "/users"),
    item(<FaChartBar />, t("company_admin.statistics", "Statistics"), "/admin/statistics"),
    item(<FaMoneyBill />, t("company_admin.transactions", "Transactions"), "/admin/transactions"),
    !locked("has_promotions") && item(<FaTag />, t("company_admin.promotions", "Promotions"), "/admin/promotions"),
    !locked("has_inventory") && item(<FaTruck />, t("company_admin.suppliers", "Suppliers"), "/admin/suppliers"),
    !locked("has_reports") && item(<FaChartLine />, t("branch_admin.branch_wise_sales_report", "Branch Wise Sales Report"), "/admin/sales-details"),
    item(<FaClipboardList />, t("company_admin.activity_log", "Activity Log"), "/admin/activity-log"),
    item(<PiInvoiceBold />, t("company_admin.invoice_settings", "Invoice Settings"), "/admin/bill-settings"),
  ].filter(Boolean);
  const superItems = [
    item(<FaTachometerAlt />, "Dashboard", "/dashboard"),
    item(<FaStore />, "Company Management", "/super-admin/hotels"),
    item(<FaUsers />, "User Management", "/super-admin/users"),
    item(<FaCodeBranch />, "Branch Management", "/super-admin/branches"),
    item(<FaClipboardList />, "Activity Log", "/super-admin/activity-log"),
    item(<FaBox />, "Package Management", "/super-admin/packages"),
  ];
  const items = superAdmin ? superItems : branchAdmin ? branchItems : adminItems;
  return <><aside className={`fixed bottom-0 left-0 top-0 z-40 flex w-[250px] flex-col justify-between overflow-y-auto bg-[#081321] p-6 text-white transition-transform lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
    <div><div className="mb-4 flex items-center gap-3 pl-1"><div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600"><FaWifi size={18} /></div><h2 className="m-0 text-lg font-bold"><span>SLT</span> <span className="text-emerald-500">POS</span></h2></div>{section("MAIN")}{items}</div>
    <div>{item(<FaSignOutAlt />, t("company_admin.log_out", "Log Out"), "/logout", false, (event) => { event.preventDefault(); logout(); })}</div>
  </aside><ToastContainer toasts={toasts} removeToast={removeToast} /></>;
};

export default Slidebar;
