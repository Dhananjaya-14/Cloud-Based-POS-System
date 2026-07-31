import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getBranchWiseSalesReport } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../components/admin/Header";
import Sidebar from "../../components/admin/Sidebar";

const availableColumns = [
  { key: "report_date", label: "Date" },
  { key: "branch_name", label: "Branch Name" },
  { key: "branch_address", label: "Branch Address" },
  { key: "total_orders", label: "Total Orders" },
  { key: "total_products", label: "Sold Products" },
  { key: "total_sales", label: "Total Sales" },
];

export default function BranchWiseSalesReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    selectedWeek: "1",
  });

  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map((col) => col.key)
  );

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

      setActiveRange({ from: finalFromDate, to: finalToDate });

      const response = await getBranchWiseSalesReport({
        com_id: user?.com_id,
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
    if (user?.com_id) {
      generateReport();
    }
  }, [user?.com_id]);



  const exportExcel = () => {
    const formattedRows = rows.map((row) => {
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
      const firstVisibleColumn = availableColumns.find((col) => selectedColumns.includes(col.key));

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
    formattedRows.forEach((row) => {
      Object.keys(row).forEach((key, colIndex) => {
        const cellValue = row[key] ? row[key].toString() : "";
        const currentLength = Math.max(key.length, cellValue.length);
        maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, currentLength + 3);
      });
    });

    worksheet["!cols"] = maxColumnWidths.map((w) => ({ wch: w }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Branch Sales Summary");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Branch_Wise_Sales_Report_${timestamp}.xlsx`);
  };

  const exportPDF = () => {
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

    const visibleColumns = availableColumns.filter((col) => selectedColumns.includes(col.key));

    autoTable(doc, {
      startY: 52,
      head: [visibleColumns.map((col) => col.label)],
      body: rows.map((row) =>
        visibleColumns.map((col) => {
          if (col.key === "total_sales") {
            return `Rs. ${Number(row[col.key] || 0).toFixed(2)}`;
          }
          if (col.key === "report_date" && row[col.key]) {
            return row[col.key].includes("T") ? row[col.key].split("T")[0] : row[col.key];
          }
          return row[col.key] ?? "";
        })
      ),
      theme: "striped",
      headStyles: {
        fillColor: [0, 82, 168],
        fontSize: 10,
        align: "center",
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
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

  return (
    <div className="w-full min-h-screen flex bg-slate-50 text-slate-800 antialiased overflow-visible">
      <Sidebar />
      <div className="flex flex-1 flex-col h-auto min-h-screen pb-12 overflow-y-visible" style={{ marginLeft: 240 }}>
        <Header title="Analytical Report" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-5 py-4 gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-600">
            Branch Sales Report
          </h1>

          <div className="flex gap-2.5">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <FaFileExcel />
              Export Excel
            </button>

            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <FaFilePdf />
              Export PDF
            </button>
          </div>
        </div>

        <div className="px-5">
          {/* Filters Configurations */}
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
                  {type === "daily" ? "Daily Overview" : type === "custom" ? "Custom Range" : `${type} Statement`}
                </label>
              ))}
            </div>

            {filters.filterType === "weekly" && (
              <div className="flex gap-4 items-end mt-2 animate-fadeIn">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Month</label>
                  <input
                    type="month"
                    value={filters.selectedMonth}
                    onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Week</label>
                  <select
                    value={filters.selectedWeek}
                    onChange={(e) => setFilters({ ...filters, selectedWeek: e.target.value })}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700"
                  >
                    {["1", "2", "3", "4", "5"].map((w) => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {filters.filterType === "monthly" && (
              <div className="flex flex-col gap-1.5 max-w-xs animate-fadeIn">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Month</label>
                <input
                  type="month"
                  value={filters.selectedMonth}
                  onChange={(e) => setFilters({ ...filters, selectedMonth: e.target.value })}
                  className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={loading}
              className={`mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200
                ${loading
                  ? "bg-blue-400 text-blue-100 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"
                }`}
            >
              {loading ? "Processing..." : "Generate Report"}
            </button>
          </div>

          {/* Dynamic Selection Box Grid Array */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="font-bold text-gray-800 text-base mb-3">Visible Columns</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {availableColumns.map((col) => (
                <label key={col.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium cursor-pointer">
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

          {/* Main Table Layout Panel Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 animate-pulse">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm" />
              <p className="text-sm font-semibold text-slate-600 tracking-wide">Compiling Regional Analytics...</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto bg-white rounded-lg shadow mb-6">
              <table className="w-full min-w-max">
                <thead className="bg-gray-100">
                  <tr>
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
                        No matching branch sales statements found. Adjust filters and reload.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                        {availableColumns
                          .filter((col) => selectedColumns.includes(col.key))
                          .map((col) => {
                            const cellValue = row[col.key];

                            if (col.key === "total_sales") {
                              return (
                                <td key={col.key} className="p-4 text-sm font-medium text-gray-700">
                                  Rs. {Number(cellValue || 0).toFixed(2)}
                                </td>
                              );
                            }

                            if (col.key === "report_date" && cellValue) {
                              return (
                                <td key={col.key} className="p-4 text-sm text-gray-600">
                                  {new Date(cellValue).toLocaleDateString("en-CA")}
                                </td>
                              );
                            }

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
        </div>

        {/* Dynamic Navigation Trigger Button */}
        <button
          onClick={() => navigate(-1)}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 border border-slate-700 cursor-pointer group"
        >
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>
    </div>
  );
}