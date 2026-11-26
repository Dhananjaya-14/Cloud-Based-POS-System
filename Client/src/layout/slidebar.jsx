import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBox, FaBoxOpen, FaChartBar, FaChartLine, FaClipboardList, FaCodeBranch, FaExchangeAlt, FaFileAlt, FaLock, FaMoneyBill, FaSignOutAlt, FaStore, FaTable, FaTag, FaTachometerAlt, FaTrashAlt, FaTruck, FaUndo, FaUsers, FaWifi, FaChevronDown, FaChevronUp, FaCog, FaSignInAlt } from "react-icons/fa";
import { PiInvoiceBold } from "react-icons/pi";
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
    const isCurrent = active(target);
    const content = (
      <>
        <span className="text-base flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        {disabled && <FaLock size={12} />}
      </>
    );
    if (disabled) {
      return (
        <button
          type="button"
          key={label}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[#4B5A6E] opacity-60"
          onClick={() => toast.info("Upgrade Required", `Your current package doesn't include ${label}.`)}
        >
          {content}
        </button>
      );
    }
    return (
      <Link
        key={label}
        to={target}
        onClick={(event) => {
          if (window.innerWidth < 1024) setIsOpen?.(false);
          onClick?.(event);
        }}
        className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition-colors ${
          isCurrent
            ? "bg-[#0E3B5C] text-white font-medium"
            : "text-[#8B9BB4] hover:bg-[#112A3C] hover:text-white"
        }`}
      >
        {content}
      </Link>
    );
  };
  const section = (label) => <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#5A6D85]">{label}</div>;
  const inventoryPaths = [
    "/branch-admin/inventory",
    "/branch-admin/raw-ingredient",
    "/branch-admin/suppliers",
    "/branch-admin/waste-management",
    "/branch-admin/return-management",
    "/branch-admin/recipe-mapper",
  ];
  const isInventoryActive = inventoryPaths.some((target) => active(target));
  const [inventoryOpen, setInventoryOpen] = useState(isInventoryActive);

  const inventorySubItems = [
    { label: "Inventory", target: "/branch-admin/inventory" },
    { label: "Add Inventory Item", target: "/branch-admin/raw-ingredient" },
    { label: "Supplier Directory", target: "/branch-admin/suppliers" },
    { label: "Waste Management", target: "/branch-admin/waste-management" },
    { label: "Return Management", target: "/branch-admin/return-management" },
    { label: "Recipe Mapper", target: "/branch-admin/recipe-mapper" },
  ];

  const branchInventoryAccordion = !locked("has_inventory") && (
    <div key="inventory-group" className="mb-1">
      <button
        type="button"
        onClick={() => setInventoryOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer ${
          isInventoryActive
            ? "bg-[#112A3C] text-white font-medium"
            : "text-[#8B9BB4] hover:bg-[#112A3C] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-base"><FaClipboardList /></span>
          <span className="text-sm font-medium">InventoryManagement</span>
        </div>
        <span className="text-xs text-gray-400">
          {inventoryOpen ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
        </span>
      </button>
      {inventoryOpen && (
        <div className="mt-1 flex flex-col space-y-1 pl-9 pr-2">
          {inventorySubItems.map((sub) => {
            const isSubActive = active(sub.target);
            return (
              <Link
                key={sub.target}
                to={sub.target}
                onClick={(event) => {
                  if (window.innerWidth < 1024) setIsOpen?.(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors no-underline block ${
                  isSubActive
                    ? "bg-[#16364f] text-white font-bold"
                    : "text-[#8B9BB4] hover:bg-white/5 hover:text-white"
                }`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  const branchItems = [
    item(<FaTachometerAlt />, t("branch_admin.dashboard_overview", "Dashboard Overview"), "/branch-admin/dashboard"),
    item(<FaBoxOpen />, t("branch_admin.product", "Product"), "/branch-admin/products"),
    item(<FaUsers />, t("branch_admin.user_management", "User Management"), "/branch-admin/users"),
    branchInventoryAccordion,
    item(<FaTable />, t("branch_admin.table_management", "Table Management"), "/branch-admin/tables"),
    item(<FaExchangeAlt />, t("branch_admin.transactions", "Transactions"), "/branch-admin/transactions"),
    item(<FaChartLine />, t("branch_admin.sales_revenue", "Sales & Revenue"), "/branch-admin/sales-revenue"),
    item(<FaChartBar />, t("branch_admin.cashier_performance", "Cashier Performance"), "/branch-admin/cashier-performance"),
    !locked("has_inventory") && item(<FaSignInAlt />, t("branch_admin.return_management", "Return Management"), "/branch-admin/return-management"),
    !locked("has_reports") && item(<FaFileAlt />, t("branch_admin.sales_summary", "Sales summary"), "/branch-admin/summary-sales"),
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
    <div className="space-y-1">
      {branchAdmin && item(<FaCog />, t("branch_admin.settings", "Settings"), "/branch-admin/settings")}
      {item(<FaSignOutAlt />, t("company_admin.log_out", "Log Out"), "/logout", false, (event) => { event.preventDefault(); logout(); })}
    </div>
  </aside><ToastContainer toasts={toasts} removeToast={removeToast} /></>;
};

export default Slidebar;
