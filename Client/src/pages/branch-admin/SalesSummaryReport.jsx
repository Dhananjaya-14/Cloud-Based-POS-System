import { useTranslation } from "react-i18next";
import React, { useEffect, useState, useMemo } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaArrowLeft,
  FaFileAlt,
  FaTruck,
  FaChartBar,
  FaTag,
  FaCheckCircle,
  FaRegClock,
  FaSyncAlt,
  FaRegCheckSquare,
  FaMoneyBillWave,
  FaCreditCard,
  FaGlobe,
} from "react-icons/fa";
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
    { key: "pay_date", label: t("reports.pay_date", "Pay Date"), header: "PAY DATE" },
    { key: "pay_time", label: t("reports.time", "Time"), header: "TIME" },
    { key: "pay_method", label: t("reports.payment_method", "Payment Method"), header: "PAYMENT METHOD" },
    { key: "total_cost", label: t("reports.subtotal", "Subtotal"), header: "SUBTOTAL" },
    { key: "tax", label: t("reports.tax", "Tax"), header: "TAX" },
    { key: "totalCostWtax", label: t("reports.grand_total", "Grand Total"), header: "GRAND TOTAL" },
  ];

  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [activeRange, setActiveRange] = useState({
    from: "",
    to: ""
  });
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

  const totalSubtotal = useMemo(() => {
    return rows.reduce((acc, row) => acc + (parseFloat(row.total_cost) || 0), 0);
  }, [rows]);

  const totalTax = useMemo(() => {
    return rows.reduce((acc, row) => acc + (parseFloat(row.tax) || 0), 0);
  }, [rows]);

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
      const response = await getSalesSummaryReport({
        b_id: user?.b_id,
        filterType: filters.filterType,
        fromDate: finalFromDate,
        toDate: finalToDate,
        columns: selectedColumns
      });
      setRows(response.data || []);
      setGrandTotal(response.grandTotal || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.b_id) {
      generateReport();
    }
  }, [user?.b_id]);

  useEffect(() => {
    let mounted = true;
    const loadBranch = async () => {
      const fromUser = user?.B_name ?? user?.b_name ?? user?.branchName ?? null;
      if (fromUser) {
        if (mounted) setBranchName(fromUser);
        return;
      }
      if (user?.b_id) {
        try {
          const res = await getBranchById(user.b_id);
          const branch = res?.data ?? res;
          if (mounted) setBranchName(branch?.B_name ?? branch?.b_name ?? "");
        } catch {
          if (mounted) setBranchName("");
        }
      } else {
        if (mounted) setBranchName("");
      }
    };
    loadBranch();
    return () => {
      mounted = false;
    };
  }, [user]);

  const formatDate = (val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }
      return String(val).split("T")[0];
    } catch {
      return String(val);
    }
  };

  const formatTime = (val) => {
    if (!val) return "";
    try {
      if (typeof val === "string" && val.includes("T")) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
        }
      }
      const parts = String(val).split(":");
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10);
        const minute = parts[1];
        const ampm = hour >= 12 ? "PM" : "AM";
        const h12 = hour % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${minute} ${ampm}`;
      }
      return String(val);
    } catch {
      return String(val);
    }
  };

  const renderPaymentMethod = (method) => {
    const m = String(method || "").toLowerCase().trim();
    if (m === "cash") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <FaMoneyBillWave size={10} className="text-emerald-600" />
          <span>Cash</span>
        </span>
      );
    }
    if (m === "card" || m === "credit card" || m === "debit card") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
          <FaCreditCard size={10} className="text-sky-600" />
          <span>Card</span>
        </span>
      );
    }
    if (m === "online" || m === "digital" || m === "bank") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
          <FaGlobe size={10} className="text-purple-600" />
          <span>Online</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span>{method || "Other"}</span>
      </span>
    );
  };

  // Excel export logic
  const exportExcel = () => {
const formattedRows = rows.map(row => {
      const dataRow = {};
      if (selectedColumns.includes("pay_date")) {
        dataRow["Date"] = row.pay_date ? row.pay_date.split("T")[0] : "";
      }
      if (selectedColumns.includes("pay_time")) {
        dataRow["Time"] = row.pay_time ? row.pay_time.includes("T") ? row.pay_time.split("T")[1].split(".")[0] : row.pay_time.slice(0, 8) : "";
      }
      if (selectedColumns.includes("pay_method")) {
        dataRow["Payment Method"] = row.pay_method;
      }
      if (selectedColumns.includes("total_cost")) {
        dataRow["Subtotal (Rs.)"] = row.total_cost ? parseFloat(row.total_cost) : 0.00;
      }
      if (selectedColumns.includes("tax")) {
        dataRow["Tax (Rs.)"] = row.tax ? parseFloat(row.tax) : 0.00;
      }
      if (selectedColumns.includes("totalCostWtax")) {
        dataRow["Grand Total (Rs.)"] = row.totalCostWtax ? parseFloat(row.totalCostWtax) : 0.00;
      }
      return dataRow;
    });
    if (formattedRows.length > 0) {
      const totalRow = {};
      const firstVisibleColumn = availableColumns.find(col => selectedColumns.includes(col.key));
      if (firstVisibleColumn) {
        let targetKey = "";
        if (firstVisibleColumn.key === "pay_date") targetKey = "Date";else if (firstVisibleColumn.key === "pay_time") targetKey = "Time";else if (firstVisibleColumn.key === "pay_method") targetKey = "Payment Method";else targetKey = firstVisibleColumn.label;
        totalRow[targetKey] = "TOTAL";
      }
      if (selectedColumns.includes("totalCostWtax")) {
        totalRow["Grand Total (Rs.)"] = parseFloat(grandTotal);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Summary Statement");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Sales_Summary_Report_${timestamp}.xlsx`);
  };
    const exportPDFJsPdf = () => {
    const doc = new jsPDF();
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text('Sales Summary Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Generated: ' + generatedDate + ' ' + generatedTime, 14, 28);
    
    const head = selectedColumns.map(col => availableColumns.find(c => c.key === col)?.label || col);
    const body = rows.map(row => {
        return selectedColumns.map(colKey => {
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
          } else if (['stock_qty', 'quantity'].includes(colKey) && val !== undefined && val !== null) {
            val = Number(val || 0).toFixed(2);
          }
          return val !== null && val !== undefined ? val : '';
        });
      });

    if (body.length > 0 && typeof grandTotal !== 'undefined') {
         const totalRow = Array(selectedColumns.length).fill('');
         
         let totalIndex = -1;
         for (let i = selectedColumns.length - 1; i >= 0; i--) {
           if (['total_sale', 'total_amount', 'amount', 'total_cost', 'totalCostWtax', 'subtotal', 'total_sales'].includes(selectedColumns[i])) {
             totalIndex = i;
             break;
           }
         }
         
         if (totalIndex !== -1) {
           totalRow[totalIndex - 1 >= 0 ? totalIndex - 1 : 0] = 'TOTAL';
           totalRow[totalIndex] = 'Rs. ' + Number(grandTotal).toFixed(2);
         } else {
           totalRow[0] = 'TOTAL';
           totalRow[selectedColumns.length - 1] = 'Rs. ' + Number(grandTotal).toFixed(2);
         }
         body.push(totalRow);
      }

    doc.line(14, 35, 196, 35);
    
    autoTable(doc, {
      startY: 42,
      head: [head],
      body: body,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 82, 168],
        fontSize: 10,
        align: 'center'
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });
    
    doc.save('Sales_Summary_Report_' + generatedDate + '.pdf');
  };

  const exportPDF = () => {
    if (i18n.language === 'en') {
      exportPDFJsPdf();
    } else {
      exportPDFHtml();
    }
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
      '<title>' + t('branch_admin.sales_summary_report', 'Sales Summary Report') + '<\/title>' +
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
      '<h2>' + t('branch_admin.sales_summary_report', 'Sales Summary Report') + '</h2>' +
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
  return (
    <div className="font-sans bg-[#FAF8F5] min-h-screen">
      <Sidebar />
      <div className="flex flex-col h-screen overflow-hidden" style={{ marginLeft: 240 }}>
        <Header
          title={t("branch_admin.analytical_report", "Analytical Report")}
          subtitle={branchName ? `${branchName} branch` : "Kandy branch"}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#FAF8F5]">
          <div className="w-full space-y-5 max-w-[1600px] mx-auto">
            {/* Header: Title and Export Controls Card */}
            <div className="bg-white rounded-2xl border border-[#E7E2D9] p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <FaFileAlt size={16} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-[#0B192C] tracking-tight leading-snug">
                      {t("branch_admin.sales_summary_report", "Sales Summary Report")}
                    </h1>
                    <p className="text-xs text-slate-400">
                      Every transaction, broken down by payment method
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={exportExcel}
                    className="inline-flex items-center gap-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <FaFileExcel size={13} />
                    <span>{t("branch_admin.export_excel", "Export Excel")}</span>
                  </button>
                  <button
                    onClick={exportPDF}
                    className="inline-flex items-center gap-1.5 bg-[#D32F2F] hover:bg-[#C62828] text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <FaFilePdf size={13} />
                    <span>{t("branch_admin.export_pdf", "Export PDF")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stat Cards Grid (4 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Transactions */}
              <div className="bg-white rounded-2xl border border-[#E7E2D9] p-4 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <FaTruck size={17} />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0B192C] leading-snug">{rows.length}</div>
                  <div className="text-[11px] text-slate-400 font-medium">Transactions</div>
                </div>
              </div>

              {/* Card 2: Total Subtotal */}
              <div className="bg-white rounded-2xl border border-[#E7E2D9] p-4 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 flex-shrink-0">
                  <FaChartBar size={17} />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0B192C] leading-snug">
                    Rs {totalSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Total Subtotal</div>
                </div>
              </div>

              {/* Card 3: Total Tax */}
              <div className="bg-white rounded-2xl border border-[#E7E2D9] p-4 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <FaTag size={17} />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0B192C] leading-snug">
                    Rs {totalTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Total Tax</div>
                </div>
              </div>

              {/* Card 4: Grand Total */}
              <div className="bg-white rounded-2xl border border-[#E7E2D9] p-4 flex items-center gap-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <FaCheckCircle size={17} />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0B192C] leading-snug">
                    Rs {Number(grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Grand Total</div>
                </div>
              </div>
            </div>

            {/* Interval Configuration Card */}
            <div className="bg-white rounded-2xl border border-[#E7E2D9] p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B192C]">
                <FaRegClock className="text-slate-400" />
                <span>{t("branch_admin.interval_configuration", "Interval Configuration")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, filterType: "daily" })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    filters.filterType === "daily"
                      ? "border-sky-400 bg-sky-50/50 text-sky-900 font-semibold"
                      : "border-[#E2DDD3] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    filters.filterType === "daily" ? "border-sky-500" : "border-slate-300"
                  }`}>
                    {filters.filterType === "daily" && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                  </span>
                  {t("branch_admin.daily_processing", "Daily Processing")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, filterType: "weekly" })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    filters.filterType === "weekly"
                      ? "border-sky-400 bg-sky-50/50 text-sky-900 font-semibold"
                      : "border-[#E2DDD3] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    filters.filterType === "weekly" ? "border-sky-500" : "border-slate-300"
                  }`}>
                    {filters.filterType === "weekly" && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                  </span>
                  {t("branch_admin.weekly_statement", "Weekly Statement")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, filterType: "monthly" })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    filters.filterType === "monthly"
                      ? "border-sky-400 bg-sky-50/50 text-sky-900 font-semibold"
                      : "border-[#E2DDD3] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    filters.filterType === "monthly" ? "border-sky-500" : "border-slate-300"
                  }`}>
                    {filters.filterType === "monthly" && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                  </span>
                  {t("branch_admin.monthly_statement", "Monthly Statement")}
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, filterType: "custom" })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    filters.filterType === "custom"
                      ? "border-sky-400 bg-sky-50/50 text-sky-900 font-semibold"
                      : "border-[#E2DDD3] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    filters.filterType === "custom" ? "border-sky-500" : "border-slate-300"
                  }`}>
                    {filters.filterType === "custom" && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                  </span>
                  {t("branch_admin.custom_date_range", "Custom Date Range")}
                </button>

                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0B192C] via-[#0D2B4D] to-[#0284C7] hover:opacity-95 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-70 ml-1"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FaSyncAlt size={10} className="text-cyan-300" />
                  )}
                  <span>{loading ? t("branch_admin.processing", "Processing...") : t("buttons.generate_report", "Generate Report")}</span>
                </button>
              </div>

              {filters.filterType === "weekly" && (
                <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t("branch_admin.month", "Month")}:</label>
                    <input type="month" value={filters.selectedMonth} onChange={e => setFilters({ ...filters, selectedMonth: e.target.value })} className="border border-[#E2DDD3] rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t("branch_admin.week", "Week")}:</label>
                    <select value={filters.selectedWeek} onChange={e => setFilters({ ...filters, selectedWeek: e.target.value })} className="border border-[#E2DDD3] rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none">
                      <option value="1">Week 1</option>
                      <option value="2">Week 2</option>
                      <option value="3">Week 3</option>
                      <option value="4">Week 4</option>
                      <option value="5">Week 5</option>
                    </select>
                  </div>
                </div>
              )}

              {filters.filterType === "monthly" && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase">{t("branch_admin.select_operational_month", "Select Month")}:</label>
                  <input type="month" value={filters.selectedMonth} onChange={e => setFilters({ ...filters, selectedMonth: e.target.value })} className="border border-[#E2DDD3] rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none" />
                </div>
              )}

              {filters.filterType === "custom" && (
                <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t("branch_admin.from_date", "From")}:</label>
                    <input type="date" value={filters.fromDate} onChange={e => setFilters({ ...filters, fromDate: e.target.value })} className="border border-[#E2DDD3] rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t("branch_admin.to_date", "To")}:</label>
                    <input type="date" value={filters.toDate} onChange={e => setFilters({ ...filters, toDate: e.target.value })} className="border border-[#E2DDD3] rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Visible Data Fields Card */}
            <div className="bg-white rounded-2xl border border-[#E7E2D9] p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B192C]">
                <FaRegCheckSquare className="text-slate-400" />
                <span>{t("branch_admin.visible_data_fields", "Visible Data Fields")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {availableColumns.map(col => {
                  const isChecked = selectedColumns.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-sky-50/70 border-sky-300 text-sky-900 font-semibold"
                          : "bg-white border-[#E2DDD3] text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-0 border-slate-300 cursor-pointer"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                          } else {
                            setSelectedColumns([...selectedColumns, col.key]);
                          }
                        }}
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Report Table Card */}
            <div className="bg-white rounded-2xl border border-[#E7E2D9] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAF8F5] border-b border-[#EAE5DC]">
                    <tr>
                      {availableColumns
                        .filter(col => selectedColumns.includes(col.key))
                        .map(col => (
                          <th
                            key={col.key}
                            className="py-3.5 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                          >
                            {col.header || col.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE4]">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={availableColumns.filter(col => selectedColumns.includes(col.key)).length}
                          className="py-16 text-center text-slate-400 text-sm font-medium"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#0B192C] rounded-full animate-spin" />
                            <span>{t("branch_admin.please_wait", "Loading sales data...")}</span>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={availableColumns.filter(col => selectedColumns.includes(col.key)).length}
                          className="text-center py-20 text-slate-400 font-medium text-xs"
                        >
                          {t("branch_admin.no_matching_sales_data_captured_adjust_y", "No matching sales data captured. Adjust your filters and reload.")}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-[#FAF8F5]/60 transition-colors">
                          {availableColumns
                            .filter(col => selectedColumns.includes(col.key))
                            .map(col => {
                              const cellValue = row[col.key];

                              if (col.key === "total_cost" || col.key === "tax" || col.key === "totalCostWtax") {
                                return (
                                  <td key={col.key} className="py-3.5 px-6 text-xs font-semibold text-slate-800 whitespace-nowrap">
                                    Rs {Number(cellValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                );
                              }

                              if (col.key === "pay_date") {
                                return (
                                  <td key={col.key} className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                                    {formatDate(cellValue)}
                                  </td>
                                );
                              }

                              if (col.key === "pay_time") {
                                return (
                                  <td key={col.key} className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                                    {formatTime(cellValue)}
                                  </td>
                                );
                              }

                              if (col.key === "pay_method") {
                                return (
                                  <td key={col.key} className="py-3.5 px-6 text-xs whitespace-nowrap">
                                    {renderPaymentMethod(cellValue)}
                                  </td>
                                );
                              }

                              return (
                                <td key={col.key} className="py-3.5 px-6 text-xs text-slate-600">
                                  {String(cellValue ?? "")}
                                </td>
                              );
                            })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Footer */}
              <div className="bg-[#FAF8F5] border-t border-[#EAE5DC] px-6 py-4 flex justify-end items-center gap-6">
                <span className="text-sm font-bold text-[#0B192C]">
                  {t("branch_admin.grand_total", "Grand Total")}
                </span>
                <span className="text-base font-bold text-emerald-600">
                  Rs {Number(grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Back Button positioned below report on the lower right */}
            <div className="flex justify-end pt-2 pb-6">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-1.5 bg-[#0B192C] hover:bg-[#14263f] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <FaArrowLeft size={10} />
                <span>{t("branch_admin.back", "Back")}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}