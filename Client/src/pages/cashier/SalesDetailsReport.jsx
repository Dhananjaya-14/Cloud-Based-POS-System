import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import CashierHeader from "../../components/cashier/Header";
import { useAuth } from "../../context/AuthContext";
import { getSalesDetailsReport, getBranchById } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


const availableColumns = [
  { key: "invoice_no", label: "Invoice No" },
  { key: "order_date", label: "Date" },
  { key: "order_time", label: "Time" },
  { key: "customer_name", label: "Customer" },
  { key: "order_type", label: "Order Type" },
  { key: "payment_method", label: "Payment Method" },
  { key: "subtotal", label: "Sales Amount" },
];

export default function SalesDetailsReport() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState("");
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

      setActiveRange({ from: finalFromDate, to: finalToDate });

      const response = await getSalesDetailsReport({
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

  const exportExcel = () => {
    const formattedRows = rows.map((row) => {
      const dataRow = {};
      
      if (selectedColumns.includes("invoice_no")) dataRow["Invoice No"] = row.invoice_no;
      if (selectedColumns.includes("order_date")) dataRow["Date"] = row.order_date ? row.order_date.split("T")[0] : "";
      if (selectedColumns.includes("order_time")) dataRow["Time"] = row.order_time;
      if (selectedColumns.includes("customer_name")) dataRow["Customer"] = row.customer_name;
      if (selectedColumns.includes("order_type")) dataRow["Order Type"] = row.order_type;
      if (selectedColumns.includes("payment_method")) dataRow["Payment Method"] = row.payment_method;
      if (selectedColumns.includes("subtotal")) dataRow["Sales Amount (Rs.)"] = row.subtotal ? parseFloat(row.subtotal) : 0.00;
      
      return dataRow;
    });

    if (formattedRows.length > 0) {
      const totalRow = {};
      const firstVisibleColumn = availableColumns.find(col => selectedColumns.includes(col.key));
      
      if (firstVisibleColumn) {
        totalRow[firstVisibleColumn.label] = "GRAND TOTAL";
      }
      if (selectedColumns.includes("subtotal")) {
        totalRow["Sales Amount (Rs.)"] = parseFloat(grandTotal);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Details Statement");
    XLSX.writeFile(workbook, `Sales_Details_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const reportDate = new Date();
    
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text("Sales Details Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${reportDate.toLocaleDateString()} ${reportDate.toLocaleTimeString()}`, 14, 28);
    doc.text(`Branch: ${branchName || "Current Branch"}`, 14, 34);
    const cashierFullName = user ? `${user.u_fname || "Cashier"} ${user.u_lname || ""}`.trim() : "System Operator";
    doc.text(`Cashier: ${cashierFullName}`, 196, 34, { align: "right" });
    doc.line(14, 38, 196, 38);

    let filterLabel = filters.filterType === "weekly" ? `Week: ${activeRange.from} to ${activeRange.to}` : filters.filterType === "monthly" ? `Month: ${filters.selectedMonth}` : `${filters.fromDate} to ${filters.toDate}`;
    doc.setFontSize(11);
    doc.text(`Filter: ${filterLabel.toUpperCase()}`, 14, 46);
    doc.text(`Records: ${rows.length}`, 140, 46);

    const visibleColumns = availableColumns.filter((col) => selectedColumns.includes(col.key));

    autoTable(doc, {
      startY: 55,
      head: [visibleColumns.map((col) => col.label)],
      body: rows.map((row) =>
        visibleColumns.map((col) => {
          if (col.key === "subtotal") return `Rs. ${Number(row[col.key] || 0).toFixed(2)}`;
          if (col.key === "order_date") return row.order_date ? row.order_date.split("T")[0] : "";
          return row[col.key] ?? "";
        })
      ),
      theme: "striped",
      headStyles: { fillColor: [0, 82, 168], fontSize: 10, align: "center" },
    });
    
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(240, 248, 255);
    doc.rect(120, finalY - 6, 70, 12, "F");
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 0);
    doc.text(`Grand Total: Rs. ${Number(grandTotal).toFixed(2)}`, 125, finalY + 2);

    doc.save(`Sales_Details_Report_${reportDate.toLocaleDateString()}.pdf`);
  };

  return (
     <div className="min-h-screen bg-[#F4F7FB] flex flex-col overflow-visible">
      <CashierHeader />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 py-4 gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-600">
            Sales Details Report
          </h1>
          <div className="flex gap-2.5">
            <button onClick={exportExcel} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 cursor-pointer">
              <FaFileExcel className="text-base" /> Export Excel
            </button>
            <button onClick={exportPDF} className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 cursor-pointer">
              <FaFilePdf className="text-base" /> Export PDF
            </button>
          </div>
        </div>

        <div className="px-5">
          {/* Filters Configuration */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-bold text-gray-800 text-base mb-3">Interval Configuration</h3>
            <div className="flex flex-wrap gap-6 items-center border-b border-gray-100 pb-4 mb-4">
              {["daily", "weekly", "monthly", "custom"].map((type) => (
                <label key={type} className="flex items-center gap-2.5 font-medium text-sm text-gray-700 cursor-pointer capitalize">
                  <input
                    type="radio"
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={filters.filterType === type}
                    onChange={() => setFilters({ ...filters, filterType: type })}
                  />
                  {type === "daily" ? "Daily Processing" : type === "custom" ? "Custom Date Range" : `${type} Statement`}
                </label>
              ))}
            </div>

            {filters.filterType === "weekly" && (
              <div className="flex gap-4 items-end mt-2 animate-fadeIn">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month</label>
                  <input type="month" value={filters.selectedMonth} onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Week</label>
                  <select value={filters.selectedWeek} onChange={(e) => setFilters({ ...filters, selectedWeek: e.target.value })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    {["1", "2", "3", "4", "5"].map(w => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </div>
              </div>
            )}

            {filters.filterType === "monthly" && (
              <div className="flex flex-col gap-1.5 max-w-xs animate-fadeIn">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Operational Month</label>
                <input type="month" value={filters.selectedMonth} onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {filters.filterType === "custom" && (
              <div className="flex gap-4 items-center mt-2 animate-fadeIn">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
                  <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
                  <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            <button onClick={generateReport} disabled={loading} className={`mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150 ${loading ? "bg-blue-400 text-blue-100 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"}`}>
              {loading ? "Processing..." : "Generate Report"}
            </button>
          </div>

          {/* Columns Visibility Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-bold text-gray-800 text-base mb-3">Visible Data Fields</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {availableColumns.map((col) => (
                <label key={col.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => {
                      selectedColumns.includes(col.key)
                        ? setSelectedColumns(selectedColumns.filter((c) => c !== col.key))
                        : setSelectedColumns([...selectedColumns, col.key]);
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
          
          {/* Main Table Segment */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 animate-pulse">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm" />
              <p className="text-sm font-semibold text-slate-600 tracking-wide">Please wait...</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto bg-white rounded-lg shadow mb-6">
              <table className="w-full min-w-max">
                <thead className="bg-gray-100">
                  <tr>
                    {availableColumns
                      .filter((col) => selectedColumns.includes(col.key))
                      .map((col) => (
                        <th key={col.key} className="p-3 text-left font-semibold text-sm text-gray-700">{col.label}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={availableColumns.filter((col) => selectedColumns.includes(col.key)).length} className="text-center py-12 text-gray-400 font-medium">
                        No matching sales data captured. Adjust your filters and reload.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                        {availableColumns
                          .filter((col) => selectedColumns.includes(col.key))
                          .map((col) => {
                            if (col.key === "subtotal") {
                              return <td key={col.key} className="p-4 text-sm font-medium text-gray-700">Rs. {Number(row[col.key] || 0).toFixed(2)}</td>;
                            }
                            if (col.key === "order_date" && row[col.key]) {
                              return <td key={col.key} className="p-4 text-sm text-gray-600">{row[col.key].includes("T") ? row[col.key].split("T")[0] : row[col.key]}</td>;
                            }
                            return <td key={col.key} className="p-4 text-sm text-gray-600">{String(row[col.key] ?? "")}</td>;
                          })}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-sm text-gray-700">
                    <td colSpan={availableColumns.filter((col) => selectedColumns.includes(col.key)).length - 1} className="p-4 text-right">Grand Total</td>
                    <td className="p-4 text-green-600 text-base">Rs. {Number(grandTotal).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <button onClick={() => window.history.back()} className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 group border border-slate-700 cursor-pointer">
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" /> Back
        </button>
      </div>
  );
}