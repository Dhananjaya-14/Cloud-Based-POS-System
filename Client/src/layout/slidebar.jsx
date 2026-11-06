import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBox, FaBoxOpen, FaChartBar, FaChartLine, FaClipboardList, FaCodeBranch, FaExchangeAlt, FaFileAlt, FaLock, FaMoneyBill, FaSignOutAlt, FaStore, FaTable, FaTag, FaTachometerAlt, FaTrashAlt, FaTruck, FaUndo, FaUsers, FaWifi } from "react-icons/fa";
import { FiBarChart2, FiBriefcase, FiClipboard, FiCreditCard, FiFileText, FiGrid, FiHome, FiLogOut, FiSettings, FiTag, FiTruck, FiUsers, FiFile } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useToast, ToastContainer } from "../components/super-admin/Toast";

const Slidebar = ({ isOpen = true, setIsOpen, isSuperAdmin, superAdmin: superAdminProp }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { features, logout, user } = useAuth();
  const { toasts, removeToast, toast } = useToast();
  const path = location.pathname;

  const storedUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isSuperAdminRole = storedUser?.role_id === 6;
  const isBranchAdminRole = storedUser?.role_id === 1;

  const superAdmin =
    isSuperAdmin !== undefined
      ? Boolean(isSuperAdmin)
      : superAdminProp !== undefined
      ? Boolean(superAdminProp)
      : (isSuperAdminRole || path.startsWith("/super-admin") || path === "/dashboard");

  const branchAdmin = !superAdmin && (isBranchAdminRole || path.startsWith("/branch-admin"));
  const locked = (feature) => features && features[feature] !== true;
  const active = (target) => {
    if (path === target || path.startsWith(`${target}/`)) return true;
    if (superAdmin && target === "/super-admin/branches" && path.startsWith("/branch_profile")) return true;
    if (!superAdmin && target === "/branches" && path.startsWith("/branch_profile")) return true;
    if (superAdmin && target === "/super-admin/users" && (path.startsWith("/users") || path.startsWith("/user_profile"))) return true;
    return false;
  };
  const item = (icon, label, target, disabled = false, onClick) => {
    const content = <><span className="flex text-[17px] opacity-85">{icon}</span><span className="flex-1">{label}</span>{disabled && <FaLock size={12} />}</>;
    const base = "relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] no-underline transition-colors";
    if (disabled) return <button type="button" key={label} className={`${base} font-medium text-white/40`} onClick={() => toast.info("Upgrade Required", `Your current package doesn't include ${label}.`)}>{content}</button>;
    const isActive = active(target);
    return <Link key={label} to={target} onClick={(event) => { if (window.innerWidth < 1024) setIsOpen?.(false); onClick?.(event); }} className={`${base} ${isActive ? "bg-[#0F9B8E]/[0.18] font-semibold text-white" : "font-medium text-white/[0.68] hover:bg-white/[0.06] hover:text-white"}`}>{isActive && <span className="absolute -left-4 bottom-2 top-2 w-[3px] rounded-sm bg-[#4FC5B7]" />}{content}</Link>;
  };
  const section = (label) => <div className="mb-2 mt-[18px] px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/35">{label}</div>;
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
  const adminMainItems = [
    item(<FiGrid />, t("company_admin.dashboard", "Dashboard"), "/admin/dashboard"),
    item(<FiHome />, t("company_admin.branches", "Branches"), "/branches"),
    item(<FiBriefcase />, t("company_admin.products", "Products"), "/admin/products"),
    item(<FiUsers />, t("company_admin.user_management", "User Management"), "/users"),
  ];
  const adminInsightItems = [
    item(<FiBarChart2 />, t("company_admin.statistics", "Statistics"), "/admin/statistics"),
    item(<FiCreditCard />, t("company_admin.transactions", "Transactions"), "/admin/transactions"),
    !locked("has_promotions") && item(<FiTag />, t("company_admin.promotions", "Promotions"), "/admin/promotions"),
    !locked("has_inventory") && item(<FiTruck />, t("company_admin.suppliers", "Suppliers"), "/admin/suppliers"),
    !locked("has_reports") && item(<FiFileText />, t("company_admin.reports", "Reports"), "/admin/sales-details"),
    item(<FiClipboard />, t("company_admin.activity_log", "Activity Log"), "/admin/activity-log"),
    item(<FiFile />, t("company_admin.invoice_settings", "Invoice Settings"), "/admin/bill-settings"),
  ].filter(Boolean);
  const superItems = [
    item(<FaTachometerAlt />, "Dashboard", "/dashboard"),
    item(<FaStore />, "Company Management", "/super-admin/hotels"),
    item(<FaUsers />, "User Management", "/super-admin/users"),
    item(<FaCodeBranch />, "Branch Management", "/super-admin/branches"),
    item(<FaClipboardList />, "Activity Log", "/super-admin/activity-log"),
    item(<FaBox />, "Package Management", "/super-admin/packages"),
  ];
  const isCompanyAdmin = !superAdmin && !branchAdmin;
  const navContent = superAdmin
    ? <>{section("Main")}{superItems}</>
    : branchAdmin
    ? <>{section("Main")}{branchItems}</>
    : <>{section("Main")}{adminMainItems}{section("Insights")}{adminInsightItems}</>;
  return <><aside className={`fixed bottom-0 left-0 top-0 z-40 flex w-[240px] flex-col overflow-y-auto bg-[#071E38] px-4 py-[26px] text-white transition-transform lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="mb-[18px] flex items-center gap-2.5 px-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F9B8E] to-[#3CAE49]"><FaWifi size={16} /></div>
      <h2 className="m-0 text-[15px] font-bold tracking-[0.01em]"><span>SLT</span> <span className="text-[#3CAE49]">POS</span></h2>
    </div>
    <nav>{navContent}</nav>
    <div className="mt-auto border-t border-white/[0.08] pt-3">
      {isCompanyAdmin && <button type="button" className="relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-white/[0.68] transition-colors hover:bg-white/[0.06] hover:text-white" onClick={() => toast.info("Coming soon", "The Settings page is not available yet.")}><span className="flex text-[17px] opacity-85"><FiSettings /></span><span className="flex-1">{t("company_admin.settings", "Settings")}</span></button>}
      {item(<FiLogOut />, t("company_admin.log_out", "Log Out"), "/logout", false, (event) => { event.preventDefault(); logout(); })}
    </div>
  </aside><ToastContainer toasts={toasts} removeToast={removeToast} /></>;
};

export default Slidebar;