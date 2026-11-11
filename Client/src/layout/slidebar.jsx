import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBox, FaBoxOpen, FaChartBar, FaChartLine, FaClipboardList, FaCodeBranch, FaExchangeAlt, FaFileAlt, FaLock, FaMoneyBill, FaSignOutAlt, FaStore, FaTable, FaTag, FaTachometerAlt, FaTrashAlt, FaTruck, FaUndo, FaUsers, FaWifi } from "react-icons/fa";
import { FiArchive, FiChevronDown, FiLayout, FiShoppingBag, FiBarChart2, FiBriefcase, FiClipboard, FiCreditCard, FiFileText, FiGrid, FiHome, FiLogOut, FiSettings, FiTag, FiTruck, FiUsers, FiFile } from "react-icons/fi";
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
  // Collapsible sidebar group (Branch Admin): opens automatically when one of its pages is active
  const [openGroups, setOpenGroups] = useState({});
  const group = (key, icon, label, children) => {
    const links = children.filter(Boolean);
    if (links.length === 0) return null;
    const childActive = links.some((child) => active(child.target));
    const isOpen = openGroups[key] ?? childActive;
    return <div key={key} className="mb-0.5">
      <button type="button" onClick={() => setOpenGroups((prev) => ({ ...prev, [key]: !isOpen }))} aria-expanded={isOpen} className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${childActive ? "bg-[#0F9B8E]/[0.18] font-semibold text-white" : "font-medium text-white/[0.68] hover:bg-white/[0.06] hover:text-white"}`}>
        {childActive && <span className="absolute -left-4 bottom-2 top-2 w-[3px] rounded-sm bg-[#4FC5B7]" />}
        <span className="flex text-[17px] opacity-85">{icon}</span>
        <span className="flex-1">{label}</span>
        <FiChevronDown size={14} className={`flex-shrink-0 opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="mb-1 mt-0.5 flex flex-col">
        {links.map((child) => {
          const isChildActive = active(child.target);
          return <Link key={child.target} to={child.target} onClick={() => { if (window.innerWidth < 1024) setIsOpen?.(false); }} className={`rounded-md py-2 pl-[41px] pr-3 text-[12.5px] no-underline transition-colors ${isChildActive ? "font-semibold text-[#4FC5B7]" : "text-white/55 hover:text-white"}`}>{child.label}</Link>;
        })}
      </div>}
    </div>;
  };
  const hasInventory = !locked("has_inventory");
  const hasReports = !locked("has_reports");
  const branchItems = [
    item(<FiGrid />, t("branch_admin.dashboard_overview", "Dashboard Overview"), "/branch-admin/dashboard"),
    item(<FiShoppingBag />, t("branch_admin.product", "Product"), "/branch-admin/products"),
    item(<FiUsers />, t("branch_admin.user_management", "User Management"), "/branch-admin/users"),
    group("inventory", <FiArchive />, t("branch_admin.inventory_management", "Inventory Management"), [
      hasInventory && { label: t("branch_admin.inventory_overview", "Inventory Overview"), target: "/branch-admin/inventory" },
      hasInventory && { label: t("branch_admin.supplier_directory", "Supplier Directory"), target: "/branch-admin/suppliers" },
      hasInventory && { label: t("branch_admin.add_inventory_item", "Add Inventory Item"), target: "/branch-admin/raw-ingredient" },
      hasInventory && { label: t("branch_admin.recipe_mapper", "Recipe Mapper"), target: "/branch-admin/recipe-mapper" },
      hasInventory && { label: t("branch_admin.waste_management", "Waste Management"), target: "/branch-admin/waste-management" },
      hasInventory && { label: t("branch_admin.return_management", "Return Management"), target: "/branch-admin/return-management" },
    ]),
    item(<FiLayout />, t("branch_admin.table_management", "Table Management"), "/branch-admin/tables"),
    group("statistics", <FiBarChart2 />, t("branch_admin.statistics", "Statistics"), [
      { label: t("branch_admin.sales_revenue", "Sales & Revenue"), target: "/branch-admin/sales-revenue" },
      { label: t("branch_admin.cashier_performance", "Cashier Performance"), target: "/branch-admin/cashier-performance" },
    ]),
    item(<FiCreditCard />, t("branch_admin.transactions", "Transactions"), "/branch-admin/transactions"),
    group("reports", <FiFileText />, t("branch_admin.reports", "Reports"), [
      hasReports && { label: t("branch_admin.sales_summary", "Sales Summary"), target: "/branch-admin/summary-sales" },
      hasReports && { label: t("branch_admin.product_sales", "Product Sales"), target: "/branch-admin/summary-productsales" },
      hasReports && { label: t("branch_admin.raw_material_stock_report", "Raw Material Stock Report"), target: "/branch-admin/raw-material-stock" },
      hasReports && { label: t("branch_admin.raw_material_consumption_report", "Raw Material Consumption Report"), target: "/branch-admin/raw-material-consumption" },
    ]),
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
      {(isCompanyAdmin || branchAdmin) && <button type="button" className="relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-white/[0.68] transition-colors hover:bg-white/[0.06] hover:text-white" onClick={() => toast.info("Coming soon", "The Settings page is not available yet.")}><span className="flex text-[17px] opacity-85"><FiSettings /></span><span className="flex-1">{t("company_admin.settings", "Settings")}</span></button>}
      {item(<FiLogOut />, t("company_admin.log_out", "Log Out"), "/logout", false, (event) => { event.preventDefault(); logout(); })}
    </div>
  </aside><ToastContainer toasts={toasts} removeToast={removeToast} /></>;
};

export default Slidebar;