import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSalesSummaryReport } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../components/branch-admin/Header";
import Sidebar from "../../components/branch-admin/Sidebar";

const availableColumns = [
  { key: "pay_date", label: "Pay Date" },
  { key: "pay_method", label: "Payment Method" },
  { key: "cust_name", label: "Customer Name" },
  { key: "total_cost", label: "Total Cost" },
  { key: "tax", label: "Tax" },
  { key: "totalCostWtax", label: "Total Cost With Tax" },
];

export default function SalesSummaryReport() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Track computed active ranges for the Excel/PDF headers to avoid scoping crashes
  const [activeRange, setActiveRange] = useState({ from: "", to: "" });

  const today = new Date().toISOString().split("T")[0];
  const currentMonthString = new Date().toISOString().substring(0, 7);

  const [filters, setFilters] = useState({
    filterType: "daily",
    fromDate: today,
    toDate: today,
    selectedMonth: currentMonthString,
    selectedWeek: "1",
  });
  
  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map((col) => col.key)
  );

  const generateReport = async () => {
    try {
      setLoading(true);

      let finalFromDate = filters.fromDate;
      let finalToDate = filters.toDate;

      // 1. DAILY INTERVAL
      if (filters.filterType === "daily") {
        finalFromDate = today;
        finalToDate = today;
      }

      // 2. WEEKLY INTERVAL
      if (filters.filterType === "weekly") {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        const week = Number(filters.selectedWeek);


        const daysInMonth = new Date(year, month, 0).getDate();
        const startDay = (week - 1) * 7 + 1;
        const endDay = startDay + 6;

        if (week === 5 || endDay > daysInMonth) {
          endDay = daysInMonth;
        }

        finalFromDate = `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
        finalToDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      }

      // 3. MONTHLY INTERVAL
      if (filters.filterType === "monthly") {
        const [year, month] = filters.selectedMonth.split("-");
        finalFromDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate().toString().padStart(2, "0");
        finalToDate = `${year}-${month}-${lastDay}`;
      }

      setActiveRange({ from: finalFromDate, to: finalToDate });

      const response = await getSalesSummaryReport({
        b_id: user?.b_id,
        filterType: filters.filterType,
        fromDate: finalFromDate,
        toDate: finalToDate,
        columns: selectedColumns,
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

  // Excel export logic
  const exportExcel = () => {
    const formattedRows = rows.map((row) => {
      const dataRow = {};
      
      if (selectedColumns.includes("pay_date")) {
        dataRow["Payment Date"] = row.pay_date;
      }
      if (selectedColumns.includes("pay_method")) {
        dataRow["Payment Method"] = row.pay_method;
      }
      if (selectedColumns.includes("cust_name")) {
        dataRow["Customer Name"] = row.cust_name;
      }
      if (selectedColumns.includes("total_cost")) {
        dataRow["Total Cost (Rs.)"] = row.total_cost ? parseFloat(row.total_cost) : 0.00;
      }
      if (selectedColumns.includes("tax")) {
        dataRow["Tax (Rs.)"] = row.tax ? parseFloat(row.tax) : 0.00;
      }
      if (selectedColumns.includes("totalCostWtax")) {
        dataRow["Total Cost With Tax (Rs.)"] = row.totalCostWtax ? parseFloat(row.totalCostWtax) : 0.00;
      }
      return dataRow;
    });

    if (formattedRows.length > 0) {
      const totalRow = {};
      const firstVisibleColumn = availableColumns.find(col => selectedColumns.includes(col.key));
      
      if (firstVisibleColumn) {
        totalRow[availableColumns.find(col => col.key === firstVisibleColumn.key).label] = "GRAND TOTAL";
      }
      
      if (selectedColumns.includes("totalCostWtax")) {
        totalRow["Total Cost With Tax (Rs.)"] = parseFloat(grandTotal);
      }
      
      formattedRows.push(totalRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const maxColumnWidths = [];
    formattedRows.forEach((row) => {
      Object.keys(row).forEach((key, colIndex) => {
        const cellValue = row[key] ? row[key].toString() : "";
        const currentLength = Math.max(key.length, cellValue.length);
        maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, currentLength + 3);
      });
    });
    
    worksheet["!cols"] = maxColumnWidths.map(w => ({ wch: w }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Summary Statement");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Sales_Summary_Report_${timestamp}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    
    // HEADER
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text("Sales Summary Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${generatedDate} ${generatedTime}`, 14, 28);
    doc.text(`Branch: ${user?.b_name || "Current Branch"}`, 14, 34);
    doc.line(14, 38, 196, 38);

    // FILTER INFO - Safely reading from state instead of crashed block scope references
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
    doc.text(`Filter: ${filterLabel}`, 14, 46);
    doc.text(`Records: ${rows.length}`, 140, 46);

    // TABLE
    autoTable(doc, {
      startY: 55,
      head: [
        availableColumns
          .filter((col) => selectedColumns.includes(col.key))
          .map((col) => col.label),
      ],
      body: rows.map((row) =>
        selectedColumns.map((col) => {
          if (col === "total_cost" || col === "tax" || col === "totalCostWtax") {
            return `Rs. ${Number(row[col] || 0).toFixed(2)}`;
          }
          if (col === "pay_time") {
            return row[col]?.slice(0, 8);
          }
          return row[col] ?? "";
        })
      ),
      theme: "striped",
      headStyles: {
        fillColor: [0, 82, 168],
        fontSize: 10,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
    
    const finalY = doc.lastAutoTable.finalY + 12;

    // GRAND TOTAL BOX
    doc.setFillColor(240, 248, 255);
    doc.rect(120, finalY - 6, 70, 12, "F");
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.text(`Grand Total: Rs. ${Number(grandTotal).toFixed(2)}`, 125, finalY + 2);

    // FOOTER
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${pageCount}`, 170, 290);
    }
    doc.save(`Sales_Report_${generatedDate}.pdf`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{ marginLeft: 240 }}>
        <Header title="Analytical Report" />

        <h1 className="text-2xl px-5 py-2 font-bold tracking-tight text-gray-600 ">
          Sales Summary Report
        </h1>

        {/* Export Buttons */}
        <div className="absolute top-18 right-6 flex gap-2.5 ">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150"
          >
            <FaFileExcel className="text-base" />
            Export Excel
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150"
          >
            <FaFilePdf className="text-base" />
            Export PDF
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold text-gray-800 text-base mb-3">Interval Configuration</h3>
          <div className="flex flex-wrap gap-6 items-center border-b border-gray-100 pb-4 mb-4">
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={filters.filterType === "daily"}
                onChange={() => setFilters({ ...filters, filterType: "daily" })}
              />
              Daily Processing
            </label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                checked={filters.filterType === "weekly"}
                onChange={() => setFilters({ ...filters, filterType: "weekly" })}
              />
              Weekly Statement
            </label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={filters.filterType === "monthly"}
                onChange={() => setFilters({ ...filters, filterType: "monthly" })}
              />
              Monthly Statement
            </label>
            <label className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={filters.filterType === "custom"}
                onChange={() => setFilters({ ...filters, filterType: "custom" })}
              />
              Custom Date Range
            </label>
          </div>

          {filters.filterType === "weekly" && (
            <div className="flex gap-4 items-end mt-2 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month</label>
                <input
                  type="month"
                  value={filters.selectedMonth}
                  onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Week</label>
                <select
                  value={filters.selectedWeek}
                  onChange={(e) => setFilters({ ...filters, selectedWeek: e.target.value })}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
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
            <div className="flex flex-col gap-1.5 max-w-xs animate-fadeIn">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Operational Month</label>
              <input
                type="month"
                value={filters.selectedMonth}
                onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })}
                className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          )}

          {filters.filterType === "custom" && (
            <div className="flex gap-4 items-center mt-2 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={loading}
            className={`mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150
              ${loading 
                ? "bg-blue-400 text-blue-100 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>

        {/* Columns Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-800 text-base mb-3">Visible Data Fields</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {availableColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  checked={selectedColumns.includes(col.key)}
                  onChange={() => {
                    if (selectedColumns.includes(col.key)) {
                      setSelectedColumns(selectedColumns.filter((c) => c !== col.key));
                    } else {
                      setSelectedColumns([...selectedColumns, col.key]);
                    }
                  }}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
        
        {/* Table & Data Handling */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto bg-white rounded-lg shadow mb-6">
            <table className="w-full min-w-max">
              <thead className="bg-gray-100">
                <tr>
                  {/* Filter headers properly */}
                  {availableColumns
                    .filter((col) => selectedColumns.includes(col.key))
                    .map((col) => (
                      <th key={col.key} className="p-3 text-left font-semibold text-sm text-gray-700">
                        {col.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={availableColumns.filter((col) => selectedColumns.includes(col.key)).length} 
                      className="text-center py-12 text-gray-400 font-medium"
                    >
                      No matching sales data captured. Adjust your filters and reload.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                      {/* ALWAYS map row elements using the active available headers list to prevent shifting */}
                      {availableColumns
                        .filter((col) => selectedColumns.includes(col.key))
                        .map((col) => {
                          const cellValue = row[col.key];

                          // Format currency columns safely
                          if (col.key === "total_cost" || col.key === "tax" || col.key === "total_cost_with_tax" || col.key === "totalCostWtax") {
                            return (
                              <td key={col.key} className="p-4 text-sm text-gray-600">
                                Rs. {Number(cellValue || 0).toFixed(2)}
                              </td>
                            );
                          }

                          // Format clean date strings if it's an ISO string from DB
                          if (col.key === "pay_date" && cellValue) {
                            return (
                              <td key={col.key} className="p-4 text-sm text-gray-600">
                                {cellValue.includes("T") ? cellValue.split("T")[0] : cellValue}
                              </td>
                            );
                          }

                          // Default text columns
                          return (
                            <td key={col.key} className="p-4 text-sm text-gray-600">
                              {String(cellValue ?? "")}
                            </td>
                          );
                        })}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-sm text-gray-700">
                  <td 
                    colSpan={availableColumns.filter((col) => selectedColumns.includes(col.key)).length - 1} 
                    className="p-4 text-right"
                  >
                    Grand Total
                  </td>
                  <td className="p-4 text-green-600 text-base">
                    Rs. {Number(grandTotal).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <button
          onClick={() => window.history.back()}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 group border border-slate-700 cursor-pointer"
        >
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>
    </div>
  );
}