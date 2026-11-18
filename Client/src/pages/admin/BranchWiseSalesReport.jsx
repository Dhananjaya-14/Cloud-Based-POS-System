import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getBranchWiseSalesReport } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../layout/header";
import Sidebar from "../../layout/slidebar";

/* ===== Design components (Branch Sales Report redesign) ===== */
const SR_INPUT = "rounded-[10px] border-[1.5px] border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#14A6E0]";
const SR_STAT_TONES = {
  navy: "bg-[#E7ECF2] text-[#071E38]",
  blue: "bg-[#EAF6FD] text-[#14A6E0]",
  amber: "bg-[#FFF6E6] text-[#F59E0B]",
  green: "bg-[#EAF9EC] text-[#3CAE49]"
};
const SrTrendIcon = ({ size = 19 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V13L10 7L14 11L20 5" /><path d="M15 5H20V10" /></svg>;
const SrFileIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>;
const SrBranchIcon = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9H21M9 21V9" /></svg>;
const SrTruckIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="10" rx="1.5" /><path d="M17 10H20.5L22 13V17H17" /><circle cx="7" cy="19" r="1.7" /><circle cx="18.5" cy="19" r="1.7" /></svg>;
const SrBoxIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7L12 3L4 7L12 11L20 7Z" /><path d="M4 7V17L12 21L20 17V7" /></svg>;
const SrBarsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>;
const SrClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7V12L15 14" /></svg>;
const SrCheckSquareIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12L11 15L16 9" /></svg>;
const SrRefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12A9 9 0 103.5 16.5M21 12V6M21 12H15" /></svg>;

function SrStatCard({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-[15px] rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-[18px] shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${SR_STAT_TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate font-space text-xl font-bold leading-tight text-[#071E38]">{value}</div>
        <div className="text-xs font-semibold text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}

function SrField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9CA3AF]">{label}</label>
      {children}
    </div>
  );
}
/* ===== End of design components ===== */

export default function BranchWiseSalesReport() {
  const { t, i18n } = useTranslation();

  const availableColumns = [
    { key: "report_date", label: t("reports.date", "Date") },
    { key: "branch_name", label: t("reports.branch_name", "Branch Name") },
    { key: "branch_address", label: t("reports.branch_address", "Branch Address") },
    { key: "total_orders", label: t("reports.total_orders", "Total Orders") },
    { key: "total_products", label: t("reports.sold_products", "Sold Products") },
    { key: "total_sales", label: t("reports.total_sales", "Total Sales") },
  ];
const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeRange, setActiveRange] = useState({ from: "", to: "" });
  const [userFName, setUserFName] = useState("");
  const [userLName, setUserLName] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const currentMonthString = new Date().toISOString().substring(0, 7);
  const [filters, setFilters] = useState({
    filterType: "daily",
    fromDate: today,
    toDate: today,
    selectedMonth: currentMonthString,
    selectedWeek: "1"
  });
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map(col => col.key));
  useEffect(() => {
    if (user) {
      const ufirstName = user?.u_fname;
      const ulastName = user?.u_lname;
      setUserFName(ufirstName);
      setUserLName(ulastName);
    }
  }, [user]);
  const generateReport = async () => {
    try {
      setLoading(true);
      let finalFromDate = filters.fromDate;
      let finalToDate = filters.toDate;
      if (filters.filterType === "daily") {
        finalFromDate = today;
        finalToDate = today;
      }
      if (filters.filterType === "weekly") {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        const week = Number(filters.selectedWeek);
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDay = (week - 1) * 7 + 1;
        let endDay = startDay + 6;
        if (week === 5 || endDay > daysInMonth) {
          endDay = daysInMonth;
        }
        finalFromDate = `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
        finalToDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      }
      if (filters.filterType === "monthly") {
        const [year, month] = filters.selectedMonth.split("-");
        finalFromDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate().toString().padStart(2, "0");
        finalToDate = `${year}-${month}-${lastDay}`;
      }
      setActiveRange({
        from: finalFromDate,
        to: finalToDate
      });
      const response = await getBranchWiseSalesReport({
        com_id: user?.com_id,
        filterType: filters.filterType,
        fromDate: finalFromDate,
        toDate: finalToDate,
        columns: selectedColumns
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
  const exportExcel = () => {
const formattedRows = rows.map(row => {
      const dataRow = {};
      if (selectedColumns.includes("report_date")) {
        dataRow["Date"] = row.report_date ? row.report_date.split("T")[0] : "";
      }
      if (selectedColumns.includes("branch_name")) {
        dataRow["Branch Name"] = row.branch_name;
      }
      if (selectedColumns.includes("branch_address")) {
        dataRow["Branch Address"] = row.branch_address;
      }
      if (selectedColumns.includes("total_orders")) {
        dataRow["Total Orders"] = row.total_orders;
      }
      if (selectedColumns.includes("total_products")) {
        dataRow["Sold Products"] = row.total_products;
      }
      if (selectedColumns.includes("total_sales")) {
        dataRow["Total Sales (Rs.)"] = row.total_sales ? parseFloat(row.total_sales) : 0.00;
      }
      return dataRow;
    });
    if (formattedRows.length > 0) {
      const totalRow = {};
      const firstVisibleColumn = availableColumns.find(col => selectedColumns.includes(col.key));
      if (firstVisibleColumn) {
        totalRow[firstVisibleColumn.label] = "TOTAL";
      }
      if (selectedColumns.includes("total_sales")) {
        totalRow["Total Sales (Rs.)"] = parseFloat(grandTotal);
      }
      formattedRows.push(totalRow);
    }
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const maxColumnWidths = [];
    formattedRows.forEach(row => {
      Object.keys(row).forEach((key, colIndex) => {
        const cellValue = row[key] ? row[key].toString() : "";
        const currentLength = Math.max(key.length, cellValue.length);
        maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, currentLength + 3);
      });
    });
    worksheet["!cols"] = maxColumnWidths.map(w => ({
      wch: w
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Branch Sales Summary");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Branch_Wise_Sales_Report_${timestamp}.xlsx`);
  };
  const exportPDFJsPdf = () => {
const doc = new jsPDF();
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text("Branch Sales Summary", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${generatedDate} ${generatedTime}`, 14, 28);
    doc.text(`User: ${userFName || " "}  ${userLName}`, 14, 34);
    doc.line(14, 35, 196, 35);
    let filterLabel = "Daily";
    if (filters.filterType === "weekly") {
      filterLabel = `Week: ${activeRange.from} to ${activeRange.to}`;
    }
    if (filters.filterType === "monthly") {
      filterLabel = `Month: ${filters.selectedMonth}`;
    }
    if (filters.filterType === "custom") {
      filterLabel = `${filters.fromDate} to ${filters.toDate}`;
    }
    doc.setFontSize(11);
    doc.text(`Filter: ${filterLabel}`, 14, 44);
    doc.text(`Records: ${rows.length}`, 175, 44);
    const visibleColumns = availableColumns.filter(col => selectedColumns.includes(col.key));
    autoTable(doc, {
      startY: 52,
      head: [visibleColumns.map(col => col.label)],
      body: rows.map(row => visibleColumns.map(col => {
        if (col.key === "total_sales") {
          return `Rs. ${Number(row[col.key] || 0).toFixed(2)}`;
        }
        if (col.key === "report_date" && row[col.key]) {
          return row[col.key].includes("T") ? row[col.key].split("T")[0] : row[col.key];
        }
        return row[col.key] ?? "";
      })),
      theme: "striped",
      headStyles: {
        fillColor: [0, 82, 168],
        fontSize: 10,
        align: "center"
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(240, 248, 255);
    doc.rect(135, finalY - 6, 70, 12, "F");
    doc.setFontSize(11);
    doc.setTextColor(0, 128, 0);
    doc.text(`Total: Rs. ${Number(grandTotal).toFixed(2)}`, 155, finalY + 2);
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${pageCount}`, 170, 290);
    }
    doc.save(`Branch_Wise_Sales_Report_${generatedDate}.pdf`);
  };
    const exportPDFHtml = () => {
    const printWindow = window.open('', '_blank');
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();

    const headers = availableColumns
      .filter(col => selectedColumns.includes(col.key))
      .map(col => col.label);

    const bodyHtml = rows.map(row => {
      return '<tr>' + selectedColumns.map(colKey => {
        let val = row[colKey];
        if (['unit_price','total_sale','total_amount','amount','total_cost','tax','totalCostWtax','subtotal','total_sales'].includes(colKey)) {
          val = 'Rs. ' + Number(val || 0).toFixed(2);
        } else if (['pay_date', 'date', 'order_date', 'report_date'].includes(colKey) && val) {
          val = String(val).split('T')[0];
        } else if (['pay_time', 'order_time'].includes(colKey) && val) {
          if (String(val).includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              val = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
              val = String(val).split('T')[1].split('.')[0];
            }
          } else {
            val = String(val).split('.')[0];
          }
        } else if (['stock_qty', 'quantity'].includes(colKey) && val !== undefined) {
          val = Number(val || 0).toFixed(2);
        }
        return '<td>' + (val !== null && val !== undefined ? val : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    const headerHtml = headers.map(h => '<th>' + h + '</th>').join('');

    printWindow.document.write('<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '<meta charset="UTF-8" />' +
      '<title>' + t('branch_admin.branch_wise_sales_report', 'Branch Wise Sales Report') + '<\/title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala&family=Noto+Sans+Tamil&display=swap" rel="stylesheet" />' +
      '<style>' +
      '@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } @page { size: auto; margin: 5mm; } }' +
      'body { font-family: \'Noto Sans Sinhala\', \'Noto Sans Tamil\', Arial, sans-serif; padding: 0; margin: 0; box-sizing: border-box; width: 100%; max-width: 100%; }' +
      'h2 { color: #0052A8; margin-top: 0; }' +
      'p { margin: 4px 0; font-size: 13px; }' +
      'table { width: 100% !important; border-collapse: collapse; margin-top: 20px; font-size: 12px; table-layout: auto; }' +
      'th { background-color: #0052A8 !important; color: #fff !important; padding: 10px 8px; text-align: left; border: 1px solid #0052A8; font-weight: bold; }' +
      'td { border: 1px solid #ddd; padding: 8px; }' +
      'tr:nth-child(even) td { background-color: #f9fafb !important; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<h2>' + t('branch_admin.branch_wise_sales_report', 'Branch Wise Sales Report') + '</h2>' +
      '<p><strong>' + t('reports.generated', 'Generated') + ':</strong> ' + generatedDate + ' ' + generatedTime + '</p>' +
      '<p><strong>' + t('reports.branch', 'Branch') + ':</strong> ' + (branchName || t('reports.current_branch', 'Current Branch')) + '</p>' +
      '<table>' +
      '<thead><tr>' + headerHtml + '</tr></thead>' +
      
      '<tbody>' + bodyHtml + '</tbody>' +
      (function() {
          if (rows.length === 0 || typeof grandTotal === 'undefined') return '';
          
          let tIdx = -1;
          for (let i = selectedColumns.length - 1; i >= 0; i--) {
            if (['total_sale', 'total_amount', 'amount', 'total_cost', 'totalCostWtax', 'subtotal', 'total_sales'].includes(selectedColumns[i])) {
              tIdx = i;
              break;
            }
          }
          
          if (tIdx === -1) tIdx = selectedColumns.length - 1;
          
          let rowHtml = '<tfoot><tr>';
          for (let i = 0; i < selectedColumns.length; i++) {
            if (i === tIdx - 1) {
               rowHtml += '<td style="text-align:right; font-weight:bold;">TOTAL</td>';
            } else if (i === tIdx) {
               rowHtml += '<td style="font-weight:bold;">Rs. ' + Number(grandTotal).toFixed(2) + '</td>';
            } else if (i < tIdx - 1) {
               rowHtml += '<td></td>';
            } else if (i > tIdx) {
               rowHtml += '<td></td>';
            }
          }
          rowHtml += '</tr></tfoot>';
          return rowHtml;
        })() +
  
      '</table>' +
      '<script>document.fonts.ready.then(function(){ window.print(); });<\/script>' +
      '</body>' +
      '</html>');
    printWindow.document.close();
  };;

  const exportPDF = () => {
    if (i18n.language === "en") {
      exportPDFJsPdf();
    } else {
      exportPDFHtml();
    }
  };

// Summary numbers for the stat cards (from the generated report rows)
  const branchCount = new Set(rows.map(row => row.branch_name ?? row.branch_id)).size;
  const totalOrdersSum = rows.reduce((sum, row) => sum + Number(row.total_orders || 0), 0);
  const productsSoldSum = rows.reduce((sum, row) => sum + Number(row.total_products || 0), 0);
  const visibleColumns = availableColumns.filter(col => selectedColumns.includes(col.key));
  const intervalOptions = [
    { value: "daily", label: t("reports.daily_overview", "Daily Overview") },
    { value: "weekly", label: t("reports.weekly_statement", "Weekly Statement") },
    { value: "monthly", label: t("reports.monthly_statement", "Monthly Statement") },
    { value: "custom", label: t("reports.custom_range", "Custom Range") }
  ];
  const toggleColumn = key => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter(c => c !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  return <div className="flex min-h-screen w-full bg-[#F3F4F6] text-[#111827] antialiased">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col" style={{
      marginLeft: 240
    }}>
        <Header title={t("company_admin.analytical_report", "Analytical Report")} />

        <main className="flex-1 px-8 pb-10 pt-7">
          {/* Page heading + export buttons */}
          <div className="mb-[22px] flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-[#EAF9EC] text-[#071E38]"><SrTrendIcon size={19} /></div>
              <div>
                <h2 className="font-space text-[19px] font-bold text-[#071E38]">{t("company_admin.branch_sales_report", "Branch Sales Report")}</h2>
                <p className="mt-0.5 text-xs text-[#6B7280]">{t("company_admin.branch_sales_report_subtitle", "Compare performance across every branch")}</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={exportExcel} className="inline-flex items-center gap-[7px] rounded-[9px] bg-[#3CAE49] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_6px_14px_rgba(60,174,73,0.25)] hover:brightness-95">
                <SrFileIcon />{t("company_admin.export_excel", "Export Excel")}
              </button>
              <button type="button" onClick={exportPDF} className="inline-flex items-center gap-[7px] rounded-[9px] bg-[#D9435B] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_6px_14px_rgba(217,67,91,0.25)] hover:brightness-95">
                <SrFileIcon />{t("company_admin.export_pdf", "Export PDF")}
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mb-[22px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SrStatCard tone="navy" icon={<SrBranchIcon size={20} />} value={branchCount} label={t("company_admin.branches", "Branches")} />
            <SrStatCard tone="blue" icon={<SrTruckIcon />} value={totalOrdersSum} label={t("reports.total_orders", "Total Orders")} />
            <SrStatCard tone="amber" icon={<SrBoxIcon />} value={productsSoldSum} label={t("company_admin.products_sold", "Products Sold")} />
            <SrStatCard tone="green" icon={<SrBarsIcon />} value={`Rs ${Number(grandTotal || 0).toLocaleString()}`} label={t("company_admin.grand_total_sales", "Grand Total Sales")} />
          </div>

          {/* Interval configuration */}
          <div className="mb-[18px] rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
            <div className="flex items-center gap-[9px] px-[22px] pb-1 pt-[18px] text-[#14A6E0]">
              <SrClockIcon />
              <h3 className="text-sm font-bold text-[#071E38]">{t("company_admin.interval_configuration", "Interval Configuration")}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 px-[22px] pb-[22px] pt-4">
              {intervalOptions.map(option => {
              const isOn = filters.filterType === option.value;
              return <button key={option.value} type="button" onClick={() => setFilters({
                ...filters,
                filterType: option.value
              })} className={`flex items-center gap-[9px] rounded-[10px] border-[1.5px] px-[15px] py-2.5 text-[12.5px] font-semibold ${isOn ? "border-[#14A6E0]/35 bg-[#EAF6FD] text-[#071E38]" : "border-transparent bg-[#F3F4F6] text-[#6B7280]"}`}>
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${isOn ? "border-[#14A6E0]" : "border-[#9CA3AF]"}`}>
                      {isOn && <span className="h-2 w-2 rounded-full bg-[#14A6E0]" />}
                    </span>
                    {option.label}
                  </button>;
            })}
              <button type="button" onClick={generateReport} disabled={loading} className="ml-1 inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#071E38] to-[#14A6E0] px-5 py-[11px] text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(20,166,224,0.26)] disabled:cursor-not-allowed disabled:opacity-60">
                <SrRefreshIcon />
                {loading ? t("buttons.processing", "Processing...") : t("buttons.generate_report", "Generate Report")}
              </button>
            </div>

            {/* Extra inputs for weekly / monthly / custom */}
            {filters.filterType === "weekly" && <div className="flex flex-wrap items-end gap-4 px-[22px] pb-[22px]">
                <SrField label={t("company_admin.month", "Month")}>
                  <input type="month" value={filters.selectedMonth} onChange={e => setFilters({
                ...filters,
                selectedMonth: e.target.value
              })} className={SR_INPUT} />
                </SrField>
                <SrField label={t("company_admin.week", "Week")}>
                  <select value={filters.selectedWeek} onChange={e => setFilters({
                ...filters,
                selectedWeek: e.target.value
              })} className={SR_INPUT}>
                    {["1", "2", "3", "4", "5"].map(w => <option key={w} value={w}>{t("company_admin.week", "Week")} {w}</option>)}
                  </select>
                </SrField>
              </div>}
            {filters.filterType === "monthly" && <div className="flex flex-wrap items-end gap-4 px-[22px] pb-[22px]">
                <SrField label={t("company_admin.select_month", "Select Month")}>
                  <input type="month" value={filters.selectedMonth} onChange={e => setFilters({
                ...filters,
                selectedMonth: e.target.value
              })} className={SR_INPUT} />
                </SrField>
              </div>}
            {filters.filterType === "custom" && <div className="flex flex-wrap items-end gap-4 px-[22px] pb-[22px]">
                <SrField label={t("company_admin.from_date", "From Date")}>
                  <input type="date" value={filters.fromDate} onChange={e => setFilters({
                ...filters,
                fromDate: e.target.value
              })} className={SR_INPUT} />
                </SrField>
                <SrField label={t("company_admin.to_date", "To Date")}>
                  <input type="date" value={filters.toDate} onChange={e => setFilters({
                ...filters,
                toDate: e.target.value
              })} className={SR_INPUT} />
                </SrField>
              </div>}
          </div>

          {/* Visible columns */}
          <div className="mb-[18px] rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.03)]">
            <div className="flex items-center gap-[9px] px-[22px] pb-1 pt-[18px] text-[#14A6E0]">
              <SrCheckSquareIcon />
              <h3 className="text-sm font-bold text-[#071E38]">{t("company_admin.visible_columns", "Visible Columns")}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 px-[22px] pb-[22px] pt-3.5">
              {availableColumns.map(col => {
              const isOn = selectedColumns.includes(col.key);
              return <button key={col.key} type="button" onClick={() => toggleColumn(col.key)} aria-pressed={isOn} className={`flex items-center gap-[9px] rounded-[10px] border-[1.5px] px-3.5 py-[9px] text-[12.5px] font-semibold ${isOn ? "border-[#14A6E0]/35 bg-[#EAF6FD] text-[#071E38]" : "border-transparent bg-[#F3F4F6] text-[#111827]"}`}>
                    <span className={`flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-[5px] ${isOn ? "bg-[#14A6E0]" : "border-2 border-[#9CA3AF] bg-white"}`}>
                      {isOn && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                    </span>
                    {col.label}
                  </button>;
            })}
            </div>
          </div>

          {/* Report table */}
          {loading ? <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#14A6E0]" />
              <p className="text-sm font-semibold text-[#6B7280]">{t("company_admin.compiling_regional_analytics", "Compiling Regional Analytics...")}</p>
            </div> : <div className="mb-5 overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(7,30,56,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead>
                    <tr>
                      {visibleColumns.map(col => <th key={col.key} className="border-b border-[#E5E7EB] bg-[#FAFAFB] px-[22px] py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#9CA3AF]">{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? <tr>
                        <td colSpan={Math.max(1, visibleColumns.length)} className="px-[22px] py-16 text-center text-sm text-[#9CA3AF]">{t("company_admin.no_matching_branch_sales_statements_foun", "No matching branch sales statements found. Adjust filters and reload.")}</td>
                      </tr> : rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[#E5E7EB] hover:bg-[#FAFBFC]">
                          {visibleColumns.map(col => {
                    const cellValue = row[col.key];
                    if (col.key === "report_date") {
                      return <td key={col.key} className="px-[22px] py-3.5 text-[13.5px] tabular-nums text-[#6B7280]">{cellValue ? new Date(cellValue).toLocaleDateString("en-CA") : ""}</td>;
                    }
                    if (col.key === "branch_name") {
                      return <td key={col.key} className="px-[22px] py-3.5">
                                  <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#071E38]">
                                    <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-[#EAF9EC] text-[#3CAE49]"><SrBranchIcon size={14} /></span>
                                    {String(cellValue ?? "")}
                                  </div>
                                </td>;
                    }
                    if (col.key === "branch_address") {
                      return <td key={col.key} className="px-[22px] py-3.5 text-[13.5px] text-[#6B7280]">{String(cellValue ?? "")}</td>;
                    }
                    if (col.key === "total_sales") {
                      return <td key={col.key} className="px-[22px] py-3.5 font-space text-[13.5px] font-bold text-[#071E38]">Rs {Number(cellValue || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</td>;
                    }
                    return <td key={col.key} className="px-[22px] py-3.5 text-[13.5px] font-semibold tabular-nums">{String(cellValue ?? "")}</td>;
                  })}
                        </tr>)}
                  </tbody>
                  {visibleColumns.length > 0 && <tfoot>
                      <tr className="border-t border-[#E5E7EB] bg-[#FAFAFB]">
                        {visibleColumns.length > 1 && <td colSpan={visibleColumns.length - 1} className="px-[22px] py-[18px] text-right text-[13.5px] font-bold text-[#071E38]">{t("company_admin.grand_total", "Grand Total")}</td>}
                        <td className="px-[22px] py-[18px] font-space text-base font-bold text-[#3CAE49]">Rs {Number(grandTotal || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</td>
                      </tr>
                    </tfoot>}
                </table>
              </div>
            </div>}

          {/* Back button */}
          <div className="flex justify-end">
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-[10px] bg-[#071E38] px-5 py-[11px] text-[13px] font-bold text-white hover:bg-[#0D2B4D]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 12H5M12 19L5 12L12 5" /></svg>
              {t("company_admin.back", "Back")}
            </button>
          </div>
        </main>
      </div>
    </div>;
}