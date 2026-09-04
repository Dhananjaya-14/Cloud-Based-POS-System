import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRawMaterialConsumptionReport, getBranchById } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../components/branch-admin/Header";
import Sidebar from "../../components/branch-admin/Sidebar";

export default function RawMaterialConsumptionReport() {
  const { t, i18n } = useTranslation();

  const availableColumns = [{
    key: "report_date",
    label: t("reports.date", "Date")
  }, {
    key: "rm_name",
    label: t("reports.raw_material_name", "Raw Material Name")
  }, {
    key: "unit",
    label: t("reports.unit", "Unit")
  }, {
    key: "quantity",
    label: t("reports.quantity_consumed", "Quantity Consumed")
  }, {
    key: "unit_cost",
    label: t("reports.unit_cost", "Unit Cost")
  }, {
    key: "total_cost",
    label: t("reports.total_cost", "Total Cost")
  }];
const {
    user
  } = useAuth();
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
        if (endDay > daysInMonth) {
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
      const orderedColumns = availableColumns.filter(col => selectedColumns.includes(col.key)).map(col => col.key);
      const response = await getRawMaterialConsumptionReport({
        b_id: user?.b_id,
        filterType: filters.filterType,
        fromDate: finalFromDate,
        toDate: finalToDate,
        columns: orderedColumns
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

  // Excel export logic
  const exportExcel = () => {
const formattedRows = rows.map(row => {
      const dataRow = {};
      if (selectedColumns.includes("report_date")) {
        dataRow["Date"] = row.report_date ? row.report_date.split("T")[0] : "";
      }
      if (selectedColumns.includes("rm_name")) {
        dataRow["Raw Material"] = row.rm_name;
      }
      if (selectedColumns.includes("unit")) {
        dataRow["Unit"] = row.unit;
      }
      if (selectedColumns.includes("quantity")) {
        dataRow["Quantity Consumed"] = Number(row.quantity || 0).toFixed(2);
      }
      if (selectedColumns.includes("unit_cost")) {
        dataRow["Unit Cost (Rs.)"] = Number(row.unit_cost || 0).toFixed(2);
      }
      if (selectedColumns.includes("total_cost")) {
        dataRow["Total Cost (Rs.)"] = Number(row.total_cost || 0).toFixed(2);
      }
      return dataRow;
    });
    if (formattedRows.length > 0) {
      const totalRow = {};
      const firstVisibleColumn = availableColumns.find(col => selectedColumns.includes(col.key));
      if (firstVisibleColumn) {
        totalRow[availableColumns.find(col => col.key === firstVisibleColumn.key).label] = "TOTAL";
      }
      if (selectedColumns.includes("total_cost")) {
        totalRow["Total Cost (Rs.)"] = Number(grandTotal).toFixed(2);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Raw Material Consumption Report");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Raw_Material_Consumption_Report_${timestamp}.xlsx`);
  };
    const exportPDFJsPdf = () => {
    const doc = new jsPDF();
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text('Raw Material Consumption Report', 14, 20);
    
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
    
    doc.save('Raw_Material_Consumption_Report_' + generatedDate + '.pdf');
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
      '<title>' + t('branch_admin.raw_material_consumption_report', 'Raw Material Consumption Report') + '<\/title>' +
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
      '<h2>' + t('branch_admin.raw_material_consumption_report', 'Raw Material Consumption Report') + '</h2>' +
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
  return <div className="w-full min-h-screen flex bg-slate-50 text-slate-800 antialiased overflow-visible">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{
      marginLeft: 240
    }}>
        <Header title={t("branch_admin.analytical_report", "Analytical Report")} />
        <h1 className="text-2xl px-5 py-2 font-bold tracking-tight text-gray-600 ">{t("branch_admin.raw_material_consumption_report", "Raw Material Consumption Report")}</h1>
        {/* Export Buttons */}
        <div className="absolute top-18 right-6 flex gap-2.5 ">
          <button onClick={exportExcel} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150">
            <FaFileExcel className="text-base" />{t("branch_admin.export_excel", "Export Excel")}</button>
          <button onClick={exportPDF} className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150">
            <FaFilePdf className="text-base" />{t("branch_admin.export_pdf", "Export PDF")}</button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold text-gray-800 text-base mb-3">{t("branch_admin.interval_configuration", "Interval Configuration")}</h3>
          <div className="flex flex-wrap gap-6 items-center border-b border-gray-100 pb-4 mb-4">
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input type="radio" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" checked={filters.filterType === "daily"} onChange={() => setFilters({
              ...filters,
              filterType: "daily"
            })} />{t("branch_admin.daily_processing", "Daily Processing")}</label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input type="radio" checked={filters.filterType === "weekly"} onChange={() => setFilters({
              ...filters,
              filterType: "weekly"
            })} />{t("branch_admin.weekly_statement", "Weekly Statement")}</label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input type="radio" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" checked={filters.filterType === "monthly"} onChange={() => setFilters({
              ...filters,
              filterType: "monthly"
            })} />{t("branch_admin.monthly_statement", "Monthly Statement")}</label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input type="radio" className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" checked={filters.filterType === "custom"} onChange={() => setFilters({
              ...filters,
              filterType: "custom"
            })} />{t("branch_admin.custom_date_range", "Custom Date Range")}</label>
          </div>

          {filters.filterType === "weekly" && <div className="flex gap-4 items-end mt-2 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("branch_admin.month", "Month")}</label>
                <input type="month" value={filters.selectedMonth} onChange={e => setFilters({
              ...filters,
              selectedMonth: e.target.value
            })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("branch_admin.week", "Week")}</label>
                <select value={filters.selectedWeek} onChange={e => setFilters({
              ...filters,
              selectedWeek: e.target.value
            })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <option value="1">{t("branch_admin.week_1", "Week 1")}</option>
                  <option value="2">{t("branch_admin.week_2", "Week 2")}</option>
                  <option value="3">{t("branch_admin.week_3", "Week 3")}</option>
                  <option value="4">{t("branch_admin.week_4", "Week 4")}</option>
                  <option value="5">{t("branch_admin.week_5", "Week 5")}</option>
                </select>
              </div>
            </div>}

          {filters.filterType === "monthly" && <div className="flex flex-col gap-1.5 max-w-xs animate-fadeIn">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("branch_admin.select_operational_month", "Select Operational Month")}</label>
              <input type="month" value={filters.selectedMonth} onChange={e => setFilters({
            ...filters,
            selectedMonth: e.target.value
          })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
            </div>}

          {filters.filterType === "custom" && <div className="flex gap-4 items-center mt-2 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("branch_admin.from_date", "From Date")}</label>
                <input type="date" value={filters.fromDate} onChange={e => setFilters({
              ...filters,
              fromDate: e.target.value
            })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("branch_admin.to_date", "To Date")}</label>
                <input type="date" value={filters.toDate} onChange={e => setFilters({
              ...filters,
              toDate: e.target.value
            })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>
            </div>}

          <button onClick={generateReport} disabled={loading} className={`mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150
              ${loading ? "bg-blue-400 text-blue-100 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"}`}>
            {loading ? <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>{t("branch_admin.processing", t("buttons.processing", "Processing..."))}</> : t("buttons.generate_report", "Generate Report")}
          </button>
        </div>

        {/* Columns Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-800 text-base mb-3">{t("branch_admin.visible_data_fields", "Visible Data Fields")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {availableColumns.map(col => <label key={col.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" checked={selectedColumns.includes(col.key)} onChange={() => {
              if (selectedColumns.includes(col.key)) {
                setSelectedColumns(selectedColumns.filter(c => c !== col.key));
              } else {
                setSelectedColumns([...selectedColumns, col.key]);
              }
            }} />
                {col.label}
              </label>)}
          </div>
        </div>

        {/* Table & Data Handling */}
        {loading ? <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center gap-1.5 h-6">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[14px] font-semibold text-blue-600/70 tracking-wide">{t("branch_admin.please_wait", "Please wait...")}</span>
          </div> : <div className="w-full overflow-x-auto bg-white rounded-lg shadow mb-6">
            <table className="w-full min-w-max">
              <thead className="bg-gray-100">
                <tr>
                  {availableColumns.filter(col => selectedColumns.includes(col.key)).map(col => <th key={col.key} className="p-3 text-left font-semibold text-sm text-gray-700">
                        {col.label}
                      </th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr>
                    <td colSpan={availableColumns.filter(col => selectedColumns.includes(col.key)).length} className="text-center py-12 text-gray-400 font-medium">{t("branch_admin.no_matching_consumption_data_captured_ad", "No matching consumption data captured. Adjust your filters and reload.")}</td>
                  </tr> : rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                      {availableColumns.filter(col => selectedColumns.includes(col.key)).map(col => {
                const cellValue = row[col.key];
                if (col.key === "quantity") {
                  return <td key={col.key} className="p-4 text-sm text-gray-600">
                                {Number(cellValue || 0).toFixed(2)}
                              </td>;
                }
                if (col.key === "unit_cost" || col.key === "total_cost") {
                  return <td key={col.key} className="p-4 text-sm text-gray-600">{t("branch_admin.rs", "Rs.")}{Number(cellValue || 0).toFixed(2)}
                              </td>;
                }
                if (col.key === "report_date") {
                  return <td key={col.key} className="p-4 text-sm text-gray-600">
                                {cellValue?.includes("T") ? cellValue.split("T")[0] : cellValue}
                              </td>;
                }
                return <td key={col.key} className="p-4 text-sm text-gray-600">
                              {String(cellValue ?? "")}
                            </td>;
              })}
                    </tr>)}
              </tbody>
              {rows.length > 0 && <tfoot>
                  <tr className="bg-gray-50 font-bold text-sm text-gray-700">
                    <td colSpan={availableColumns.filter(col => selectedColumns.includes(col.key)).length - 1} className="p-4 text-right">{t("branch_admin.grand_total", "Grand Total")}</td>
                    <td className="p-4 text-green-600 text-base">{t("branch_admin.rs", "Rs.")}{Number(grandTotal).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>}
            </table>
          </div>}

        <button onClick={() => window.history.back()} className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 group border border-slate-700 cursor-pointer">
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />{t("branch_admin.back", "Back")}</button>
      </div>
    </div>;
}