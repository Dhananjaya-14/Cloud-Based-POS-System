import { useTranslation } from "react-i18next";
import React from "react";

const BranchIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></svg>;
const RevenueIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>;
const OrdersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
const UpArrow = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 17L17 7M7 7h10v10" /></svg>;
const DownArrow = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 7L7 17M17 17H7V7" /></svg>;

function KpiCard({ icon, iconClass, label, value, children }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-[#E7E3D8] bg-white p-[22px]">
      <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] ${iconClass}`}>{icon}</div>
      <div className="text-[13px] font-medium text-[#5B6470]">{label}</div>
      <div className="font-space text-[26px] font-bold leading-none text-[#071E38]">{value}</div>
      <div className="flex items-center gap-1 text-[12.5px] font-semibold">{children}</div>
    </div>
  );
}

export default function OverviewCards({ overview = {} }) {
  const { t } = useTranslation();
  const { totalBranches = 0, totalRevenue = 0, totalOrders = 0 } = overview;
  const revenueText = Number(totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vsLastMonth = t("company_admin.vs_last_month", "vs last month");

  return (
    <div className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-3">
      <KpiCard icon={<BranchIcon />} iconClass="bg-[#E0654F]/10 text-[#E0654F]" label={t("company_admin.total_branches", "Total Branches")} value={totalBranches}>
        <span className="font-normal text-[#5B6470]">{t("company_admin.across_all_regions", "Across all regions")}</span>
      </KpiCard>

      <KpiCard icon={<RevenueIcon />} iconClass="bg-[#0F9B8E]/10 text-[#0F9B8E]" label={t("company_admin.total_revenue", "Total Revenue")} value={`${t("company_admin.rs", "Rs")} ${revenueText}`}>
        {/* Trend placeholder: real month-on-month data is not available yet */}
        <span className="flex items-center gap-1 text-[#0F9B8E]"><UpArrow />+12.5%</span>
        <span className="font-normal text-[#5B6470]">{vsLastMonth}</span>
      </KpiCard>

      <KpiCard icon={<OrdersIcon />} iconClass="bg-[#D9A15C]/15 text-[#D9A15C]" label={t("company_admin.total_orders", "Total Orders")} value={totalOrders}>
        {/* Trend placeholder: real month-on-month data is not available yet */}
        <span className="flex items-center gap-1 text-[#E0654F]"><DownArrow />-2.1%</span>
        <span className="font-normal text-[#5B6470]">{vsLastMonth}</span>
      </KpiCard>
    </div>
  );
}