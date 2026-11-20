import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSalesSummaryReport, getBranchById } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../layout/header";
import Sidebar from "../../layout/slidebar";

export default function SalesSummaryReport() {
  const { t, i18n } = useTranslation();

  const availableColumns = [
    { key: "pay_date",       label: t("reports.pay_date",        "Pay Date")        },
    { key: "pay_time",       label: t("reports.time",            "Time")            },
    { key: "pay_method",     label: t("reports.payment_method",  "Payment Method")  },
    { key: "total_cost",     label: t("reports.subtotal",        "Subtotal")        },
    { key: "tax",            label: t("reports.tax",             "Tax")             },
    { key: "totalCostWtax",  label: t("reports.grand_total",     "Grand Total")     },
  ];

  const { user } = useAuth();
  const navigate = useNavigate();

  const [rows,            setRows]            = useState([]);
  const [grandTotal,      setGrandTotal]      = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [branchName,      setBranchName]      = useState("");
  const [activeRange,     setActiveRange]     = useState({ from: "", to: "" });

  const today              = new Date().toISOString().split("T")[0];
  const currentMonthString = new Date().toISOString().substring(0, 7);

  const [filters, setFilters] = useState({
    filterType:    "daily",
    fromDate:      today,
    toDate:        today,
    selectedMonth: currentMonthString,
    selectedWeek:  "1",
  });

  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map(col => col.key)
  );

  // ── Generate report ────────────────────────────────────────────────────────
  const generateReport = async () => {
    try {
      setLoading(true);
      let finalFromDate = filters.fromDate;
      let finalToDate   = filters.toDate;

      if (filters.filterType === "daily") {
        finalFromDate = today;
        finalToDate   = today;
      }
      if (filters.filterType === "weekly") {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        const week          = Number(filters.selectedWeek);
        const daysInMonth   = new Date(year, month, 0).getDate();
        const startDay      = (week - 1) * 7 + 1;
        let   endDay        = startDay + 6;
        if (week === 5 || endDay > daysInMonth) endDay = daysInMonth;
        finalFromDate = `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
        finalToDate   = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      }
      if (filters.filterType === "monthly") {
        const [year, month] = filters.selectedMonth.split("-");
        finalFromDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate().toString().padStart(2, "0");
        finalToDate   = `${year}-${month}-${lastDay}`;
      }

      setActiveRange({ from: finalFromDate, to: finalToDate });

      const response = await getSalesSummaryReport({
        b_id:       user?.b_id,
        filterType: filters.filterType,
        fromDate:   finalFromDate,
        toDate:     finalToDate,
        columns:    selectedColumns,
      });

      setRows(response.data || []);
      setGrandTotal(response.grandTotal || 0);
    } catch (error) {
      console.error(error);
      alert("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // ── Load branch name ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadBranch = async () => {
      const fromUser = user?.B_name ?? user?.b_name ?? user?.branchName ?? null;
      if (fromUser) { if (mounted) setBranchName(fromUser); return; }
      if (user?.b_id) {
        try {
          const res    = await getBranchById(user.b_id);
          const branch = res?.data ?? res;
          if (mounted) setBranchName(branch?.B_name ?? branch?.b_name ?? "");
        } catch { if (mounted) setBranchName(""); }
      } else { if (mounted) setBranchName(""); }
    };
    loadBranch();
    return () => { mounted = false; };
  }, [user]);

  // ── Excel export ───────────────────────────────────────────────────────────
  const exportExcel = () => {
    const formattedRows = rows.map(row => {
      const dataRow = {};
      if (selectedColumns.includes("pay_date"))      dataRow["Date"]               = row.pay_date ? row.pay_date.split("T")[0] : "";
      if (selectedColumns.includes("pay_time"))      dataRow["Time"]               = row.pay_time ? (row.pay_time.includes("T") ? row.pay_time.split("T")[1].split(".")[0] : row.pay_time.slice(0, 8)) : "";
      if (selectedColumns.includes("pay_method"))    dataRow["Payment Method"]     = row.pay_method;
      if (selectedColumns.includes("total_cost"))    dataRow["Subtotal (Rs.)"]     = row.total_cost    ? parseFloat(row.total_cost)    : 0;
      if (selectedColumns.includes("tax"))           dataRow["Tax (Rs.)"]          = row.tax           ? parseFloat(row.tax)           : 0;
      if (selectedColumns.includes("totalCostWtax")) dataRow["Grand Total (Rs.)"]  = row.totalCostWtax ? parseFloat(row.totalCostWtax) : 0;
      return dataRow;
    });

    if (formattedRows.length > 0) {
      const totalRow = {};
      const first = availableColumns.find(col => selectedColumns.includes(col.key));
      if (first) {
        const keyMap = { pay_date: "Date", pay_time: "Time", pay_method: "Payment Method" };
        totalRow[keyMap[first.key] || first.label] = "TOTAL";
      }
      if (selectedColumns.includes("totalCostWtax")) totalRow["Grand Total (Rs.)"] = parseFloat(grandTotal);
      formattedRows.push(totalRow);
    }

    const worksheet        = XLSX.utils.json_to_sheet(formattedRows);
    const maxColumnWidths  = [];
    formattedRows.forEach(row => {
      Object.keys(row).forEach((key, colIndex) => {
        const cellValue = row[key] ? row[key].toString() : "";
        maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, Math.max(key.length, cellValue.length) + 3);
      });
    });
    worksheet["!cols"] = maxColumnWidths.map(w => ({ wch: w }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Summary Statement");
    XLSX.writeFile(workbook, `Sales_Summary_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ── PDF helpers ────────────────────────────────────────────────────────────
  const exportPDFJsPdf = () => {
    const doc  = new jsPDF();
    const now  = new Date();
    doc.setFontSize(22); doc.setTextColor(0, 82, 168);
    doc.text("Sales Summary Report", 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 28);
    const head = selectedColumns.map(col => availableColumns.find(c => c.key === col)?.label || col);
    const body = rows.map(row => selectedColumns.map(colKey => {
      let val = row[colKey];
      if (["unit_price","total_sale","total_amount","amount","total_cost","tax","totalCostWtax","subtotal","total_sales"].includes(colKey)) val = "Rs. " + Number(val || 0).toFixed(2);
      else if (["pay_date","date","order_date","report_date"].includes(colKey) && val) val = String(val).split("T")[0];
      else if (["pay_time","order_time"].includes(colKey) && val) {
        if (String(val).includes("T")) {
          const d = new Date(val);
          val = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(val).split("T")[1].split(".")[0];
        } else { val = String(val).split(".")[0]; }
      }
      return val !== null && val !== undefined ? val : "";
    }));
    if (body.length > 0) {
      const totalRow = Array(selectedColumns.length).fill("");
      let tIdx = -1;
      for (let i = selectedColumns.length - 1; i >= 0; i--) {
        if (["total_sale","total_amount","amount","total_cost","totalCostWtax","subtotal","total_sales"].includes(selectedColumns[i])) { tIdx = i; break; }
      }
      if (tIdx !== -1) { totalRow[tIdx - 1 >= 0 ? tIdx - 1 : 0] = "TOTAL"; totalRow[tIdx] = "Rs. " + Number(grandTotal).toFixed(2); }
      else { totalRow[0] = "TOTAL"; totalRow[selectedColumns.length - 1] = "Rs. " + Number(grandTotal).toFixed(2); }
      body.push(totalRow);
    }
    doc.line(14, 35, 196, 35);
    autoTable(doc, { startY: 42, head: [head], body, theme: "striped", headStyles: { fillColor: [0, 82, 168], fontSize: 10, align: "center" }, bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: [245, 247, 250] } });
    doc.save(`Sales_Summary_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  const exportPDFHtml = () => {
    const printWindow  = window.open("", "_blank");
    const now          = new Date();
    const headers      = availableColumns.filter(col => selectedColumns.includes(col.key)).map(col => col.label);
    const bodyHtml     = rows.map(row => "<tr>" + selectedColumns.map(colKey => {
      let val = row[colKey];
      if (["unit_price","total_sale","total_amount","amount","total_cost","tax","totalCostWtax","subtotal","total_sales"].includes(colKey)) val = "Rs. " + Number(val || 0).toFixed(2);
      else if (["pay_date","date","order_date","report_date"].includes(colKey) && val) val = String(val).split("T")[0];
      else if (["pay_time","order_time"].includes(colKey) && val) {
        if (String(val).includes("T")) { const d = new Date(val); val = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(val).split("T")[1].split(".")[0]; }
        else { val = String(val).split(".")[0]; }
      }
      return "<td>" + (val !== null && val !== undefined ? val : "") + "</td>";
    }).join("") + "</tr>").join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Sales Summary Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala&family=Noto+Sans+Tamil&display=swap" rel="stylesheet"/>
      <style>@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@page{size:auto;margin:5mm}}
      body{font-family:'Noto Sans Sinhala','Noto Sans Tamil',Arial,sans-serif;padding:0;margin:0}
      h2{color:#0052A8}table{width:100%!important;border-collapse:collapse;margin-top:20px;font-size:12px}
      th{background-color:#0052A8!important;color:#fff!important;padding:10px 8px;text-align:left;border:1px solid #0052A8;font-weight:bold}
      td{border:1px solid #ddd;padding:8px}tr:nth-child(even) td{background-color:#f9fafb!important}</style></head>
      <body><h2>Sales Summary Report</h2><p><strong>Generated:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
      <p><strong>Branch:</strong> ${branchName || "Current Branch"}</p>
      <table><thead><tr>${headers.map(h => "<th>" + h + "</th>").join("")}</tr></thead>
      <tbody>${bodyHtml}</tbody></table>
      <script>document.fonts.ready.then(function(){window.print();});<\/script></body></html>`);
    printWindow.document.close();
  };

  const exportPDF = () => (i18n.language === "en" ? exportPDFJsPdf() : exportPDFHtml());

  // ── Stat counts ────────────────────────────────────────────────────────────
  const totalOrders = rows.length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen flex bg-[#F3F7FB] text-slate-800 antialiased">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{ marginLeft: 240 }}>
        <Header title={t("branch_admin.analytical_report", "Analytical Report")} />

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
              <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-space text-xl font-bold text-slate-900">
                {t("branch_admin.sales_summary_report", "Sales Summary Report")}
              </h1>
              {branchName && <p className="font-inter text-sm text-slate-500">{branchName}</p>}
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2.5 shrink-0">
            <button onClick={exportExcel} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all">
              <FaFileExcel className="text-base" />{t("branch_admin.export_excel", "Export Excel")}
            </button>
            <button onClick={exportPDF} className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all">
              <FaFilePdf className="text-base" />{t("branch_admin.export_pdf", "Export PDF")}
            </button>
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <div className="px-6 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Orders */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-space text-2xl font-bold text-slate-900">{totalOrders}</p>
              <p className="font-inter text-xs text-slate-500">Total Orders</p>
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 shrink-0">
              <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-space text-xl font-bold text-slate-900">
                Rs {Number(grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="font-inter text-xs text-slate-500">Grand Total Sales</p>
            </div>
          </div>

          {/* From date */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 shrink-0">
              <svg className="h-5 w-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-space text-sm font-bold text-slate-900">{activeRange.from || "—"}</p>
              <p className="font-inter text-xs text-slate-500">Report From Date</p>
            </div>
          </div>

          {/* Interval */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 shrink-0">
              <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <div>
              <p className="font-space text-sm font-bold text-slate-900 capitalize">
                {filters.filterType === "daily" ? "Daily" : filters.filterType === "weekly" ? "Weekly" : filters.filterType === "monthly" ? "Monthly" : "Custom"}
              </p>
              <p className="font-inter text-xs text-slate-500">Report Interval</p>
            </div>
          </div>
        </div>

        {/* ── Interval Configuration ─────────────────────────────────────── */}
        <div className="mx-6 mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-4 w-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <h3 className="font-space font-semibold text-slate-800 text-sm">
              {t("branch_admin.interval_configuration", "Interval Configuration")}
            </h3>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {[
              { value: "daily",   label: t("branch_admin.daily_processing",  "Daily Overview")   },
              { value: "weekly",  label: t("branch_admin.weekly_statement",   "Weekly Statement") },
              { value: "monthly", label: t("branch_admin.monthly_statement",  "Monthly Statement") },
              { value: "custom",  label: t("branch_admin.custom_date_range",  "Custom Range")     },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 font-inter text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="radio"
                  className="w-4 h-4 accent-teal-600"
                  checked={filters.filterType === opt.value}
                  onChange={() => setFilters({ ...filters, filterType: opt.value })}
                />
                {opt.label}
              </label>
            ))}

            <button
              onClick={generateReport}
              disabled={loading}
              className={`ml-auto inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all
                ${loading ? "bg-teal-300 text-white cursor-not-allowed" : "bg-[#0D2236] hover:bg-[#1a3a56] text-white active:scale-[0.98] cursor-pointer"}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("branch_admin.processing", "Processing...")}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t("buttons.generate_report", "Generate Report")}
                </>
              )}
            </button>
          </div>

          {/* Weekly pickers */}
          {filters.filterType === "weekly" && (
            <div className="flex gap-4 items-end mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</label>
                <input type="month" value={filters.selectedMonth}
                  onChange={e => setFilters({ ...filters, selectedMonth: e.target.value })}
                  className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-inter" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wider">Week</label>
                <select value={filters.selectedWeek}
                  onChange={e => setFilters({ ...filters, selectedWeek: e.target.value })}
                  className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-inter">
                  {["1","2","3","4","5"].map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Monthly picker */}
          {filters.filterType === "monthly" && (
            <div className="flex flex-col gap-1.5 max-w-xs mt-4 pt-4 border-t border-slate-100">
              <label className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Month</label>
              <input type="month" value={filters.selectedMonth}
                onChange={e => setFilters({ ...filters, selectedMonth: e.target.value })}
                className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          )}

          {/* Custom date pickers */}
          {filters.filterType === "custom" && (
            <div className="flex gap-4 items-end mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
                <input type="date" value={filters.fromDate}
                  onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                  className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
                <input type="date" value={filters.toDate}
                  onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                  className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </div>
          )}
        </div>

        {/* ── Visible Columns ────────────────────────────────────────────── */}
        <div className="mx-6 mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-4 w-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="font-space font-semibold text-slate-800 text-sm">
              {t("branch_admin.visible_data_fields", "Visible Columns")}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map(col => {
              const isChecked = selectedColumns.includes(col.key);
              return (
                <label key={col.key} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-inter font-medium cursor-pointer transition-all select-none
                  ${isChecked ? "bg-teal-500 border-teal-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <input type="checkbox" className="hidden" checked={isChecked} onChange={() => {
                    if (isChecked) setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                    else setSelectedColumns([...selectedColumns, col.key]);
                  }} />
                  {isChecked && (
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {col.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Data Table ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="mx-6 flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center gap-1.5 h-6">
              <div className="w-3 h-3 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 bg-teal-400 rounded-full animate-bounce" />
            </div>
            <span className="font-inter text-sm font-semibold text-teal-600/70 tracking-wide">
              {t("branch_admin.please_wait", "Please wait...")}
            </span>
          </div>
        ) : (
          <div className="mx-6 mb-20 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {availableColumns
                      .filter(col => selectedColumns.includes(col.key))
                      .map(col => (
                        <th key={col.key} className="font-inter px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                          {col.label}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={availableColumns.filter(c => selectedColumns.includes(c.key)).length}
                        className="font-inter text-center py-14 text-slate-400 text-sm"
                      >
                        {t("branch_admin.no_matching_sales_data_captured_adjust_y",
                          "No matching sales data captured. Adjust your filters and reload.")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50/60 transition-colors">
                        {availableColumns
                          .filter(col => selectedColumns.includes(col.key))
                          .map(col => {
                            const cellValue = row[col.key];

                            // Money columns
                            if (["total_cost","tax","total_cost_with_tax","totalCostWtax"].includes(col.key)) {
                              return (
                                <td key={col.key} className="px-5 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-50">
                                      <svg className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
                                      </svg>
                                    </span>
                                    <span className="font-space font-semibold text-slate-800">
                                      Rs.{Number(cellValue || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // Date
                            if (col.key === "pay_date" && cellValue) {
                              return (
                                <td key={col.key} className="px-5 py-4 font-inter text-slate-600">
                                  {new Date(cellValue).toLocaleDateString("en-CA")}
                                </td>
                              );
                            }

                            // Time
                            if (col.key === "pay_time" && cellValue) {
                              return (
                                <td key={col.key} className="px-5 py-4 font-inter text-slate-600">
                                  {cellValue.split(".")[0]}
                                </td>
                              );
                            }

                            // Payment method pill
                            if (col.key === "pay_method" && cellValue) {
                              const m     = String(cellValue).toLowerCase();
                              const color = m.includes("cash") ? "bg-green-50 text-green-700"
                                          : m.includes("card") ? "bg-blue-50 text-blue-700"
                                          : "bg-violet-50 text-violet-700";
                              return (
                                <td key={col.key} className="px-5 py-4">
                                  <span className={`font-inter inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
                                    {cellValue}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td key={col.key} className="px-5 py-4 font-inter text-slate-600">
                                {String(cellValue ?? "")}
                              </td>
                            );
                          })}
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Grand total footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={availableColumns.filter(c => selectedColumns.includes(c.key)).length - 1}
                      className="px-5 py-4 text-right font-space font-bold text-slate-700"
                    >
                      {t("branch_admin.grand_total", "Grand Total")}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-space font-bold text-emerald-600 text-base">
                        Rs.{Number(grandTotal).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 group border border-slate-700 cursor-pointer"
        >
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
          {t("branch_admin.back", "Back")}
        </button>
      </div>
    </div>
  );
}
