import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getRawMaterialStockReport, getBranchById } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../../components/branch-admin/Header";
import Sidebar from "../../components/branch-admin/Sidebar";

export default function RawMaterialStockReport() {
  const { t, i18n } = useTranslation();

  const availableColumns = [{
    key: "rm_name",
    label: t("reports.raw_material_name", "Raw Material Name")
  }, {
    key: "unit",
    label: t("reports.unit", "Unit")
  }, {
    key: "stock_qty",
    label: t("reports.stock_quantity", "Stock Quantity")
  }, {
    key: "status",
    label: t("reports.status", "Status")
  }];
const {
    user
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map(col => col.key));
  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await getRawMaterialStockReport({
        b_id: user?.b_id,
        stockFilter,
        columns: selectedColumns
      });
      setRows(response.data || []);
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
  const getStatusBadge = status => {
    switch (status) {
      case "Out of Stock":
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{t("branch_admin.out_of_stock", "Out of Stock")}</span>;
      case "Low Stock":
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">{t("branch_admin.low_stock", "Low Stock")}</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">{t("branch_admin.in_stock", "In Stock")}</span>;
    }
  };
  const exportExcel = () => {
const formattedRows = rows.map(row => {
      const excelRow = {};
      if (selectedColumns.includes("rm_name")) {
        excelRow["Raw Material Name"] = row.rm_name;
      }
      if (selectedColumns.includes("unit")) {
        excelRow["Unit"] = row.unit;
      }
      if (selectedColumns.includes("stock_qty")) {
        excelRow["Stock Quantity"] = Number(row.stock_qty || 0).toFixed(2);
      }
      if (selectedColumns.includes("status")) {
        excelRow["Status"] = row.status;
      }
      return excelRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const maxColumnWidths = [];
    formattedRows.forEach(row => {
      Object.keys(row).forEach((key, colIndex) => {
        const cellValue = row[key] ? row[key].toString() : "";
        const currentLength = Math.max(key.length, cellValue.length);
        maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, currentLength + 5);
      });
    });
    worksheet["!cols"] = maxColumnWidths.map(w => ({
      wch: w
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Raw Material Stock");
    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Raw_Material_Stock_Report_${timestamp}.xlsx`);
  };
  const exportPDFJsPdf = () => {
const doc = new jsPDF();
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    doc.setFontSize(22);
    doc.setTextColor(0, 82, 168);
    doc.text("Raw Material Stock Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${generatedDate} ${generatedTime}`, 14, 28);
    doc.text(`Branch: ${branchName || "Current Branch"}`, 14, 34);
    doc.text(`Filter: ${stockFilter.replace("_", " ").toUpperCase()}`, 175, 34);
    doc.line(14, 38, 196, 38);
    autoTable(doc, {
      startY: 48,
      head: [[...selectedColumns.map(col => availableColumns.find(c => c.key === col)?.label)]],
      body: rows.map(row => {
        return selectedColumns.map(col => {
          switch (col) {
            case "rm_name":
              return row.rm_name || "";
            case "unit":
              return row.unit || "";
            case "stock_qty":
              return Number(row.stock_qty || 0).toFixed(2);
            case "status":
              return row.status || "";
            default:
              return "";
          }
        });
      }),
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
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${pageCount}`, 170, 290);
    }
    doc.save(`Raw_Material_Stock_Report_${generatedDate}.pdf`);
  };
    const exportPDFHtml = () => {
    const printWindow = window.open("", "_blank");
    const reportDate = new Date();
    const generatedDate = reportDate.toLocaleDateString();
    const generatedTime = reportDate.toLocaleTimeString();
    const title = "aw aterial tock eport";
    
    const headers = selectedColumns.map(col => availableColumns.find(c => c.key === col)?.label || col);
    
    const bodyHtml = rows.map(row => {
      return "<tr>" + selectedColumns.map(colKey => {
        let val = row[colKey];
        if (colKey === "unit_price" || colKey === "total_sale" || colKey === "total_amount" || colKey === "amount" || colKey === "total_cost" || colKey === "tax" || colKey === "totalCostWtax") {
          val = "Rs. " + Number(val || 0).toFixed(2);
        } else if (colKey === "pay_date" && val) {
          val = val.split("T")[0];
        } else if (colKey === "pay_time" && val) {
          const d = new Date(val);
          val = isNaN(d.getTime()) ? val : d.toLocaleTimeString();
        } else if (colKey === "date" && val) {
          val = val.split("T")[0];
        }
        return "<td>" + (val || "") + "</td>";
      }).join("") + "</tr>";
    }).join("");
    
    printWindow.document.write(`
      <html>
        <head>
          <title></title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h2 { color: #0056A2; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2></h2>
          <p><strong>Generated:</strong>  </p>
          <table>
            <thead>
              <tr></tr>
            </thead>
            <tbody>
              
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportPDF = () => {
    if (i18n.language === "en") {
      exportPDFJsPdf();
    } else {
      exportPDFHtml();
    }
  };

return <div className="w-full min-h-screen flex bg-slate-50 text-slate-800 antialiased overflow-visible">
      <Sidebar />
      <div className="flex flex-1 flex-col" style={{
      marginLeft: 240
    }}>
        <Header title={t("branch_admin.analytical_report", "Analytical Report")} />
        <h1 className="text-2xl px-5 py-2 font-bold tracking-tight text-gray-600">{t("branch_admin.raw_material_stock_report", "Raw Material Stock Report")}</h1>
        {/* Export Buttons */}
        <div className="absolute top-18 right-6 flex gap-2.5">
          <button onClick={exportExcel} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150">
            <FaFileExcel className="text-base"/>{t("branch_admin.export_excel", "Export Excel")}</button>

          <button onClick={exportPDF} className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md active:scale-95 transition-all duration-150">
            <FaFilePdf className="text-base" />{t("branch_admin.export_pdf", "Export PDF")}</button>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="font-bold text-gray-800 text-base mb-3">{t("branch_admin.stock_configuration", "Stock Configuration")}</h3>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex flex-col gap-1.5">
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <option value="all">{t("branch_admin.all_materials", "All Materials")}</option>
                <option value="in">{t("branch_admin.in_stock", "In Stock")}</option>
                <option value="low">{t("branch_admin.low_stock", "Low Stock")}</option>
                <option value="out">{t("branch_admin.out_of_stock", "Out of Stock")}</option>
              </select>
            </div>
          </div>

          <button onClick={generateReport} disabled={loading} className={`mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150
              ${loading ? "bg-blue-400 text-blue-100 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] cursor-pointer"}`}>
            {loading ? <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>{t("branch_admin.processing", t("buttons.processing", "Processing..."))}</> : t("buttons.generate_report", "Generate Report")}
          </button>
        </div>

        {/* Column Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-800 text-base mb-3">{t("branch_admin.visible_data_fields", "Visible Data Fields")}</h3>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableColumns.map(col => <label key={col.key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium cursor-pointer">
                <input type="checkbox" checked={selectedColumns.includes(col.key)} onChange={() => {
              if (selectedColumns.includes(col.key)) {
                setSelectedColumns(selectedColumns.filter(c => c !== col.key));
              } else {
                setSelectedColumns([...selectedColumns, col.key]);
              }
            }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                {col.label}
              </label>)}
          </div>
        </div>

        {/* Table */}
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
                    <td colSpan={selectedColumns.length} className="text-center py-12 text-gray-400 font-medium">{t("branch_admin.no_matching_raw_material_records_found", "No matching raw material\n                      records found.")}</td>
                  </tr> : rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                        {availableColumns.filter(col => selectedColumns.includes(col.key)).map(col => {
                if (col.key === "status") {
                  return <td key={col.key} className="p-4">
                                  {getStatusBadge(row.status)}
                                </td>;
                }
                if (col.key === "stock_qty") {
                  return <td key={col.key} className="p-4 text-sm text-gray-600">
                                  {Number(row.stock_qty || 0).toFixed(2)}
                                </td>;
                }
                return <td key={col.key} className="p-4 text-sm text-gray-600">
                                {row[col.key] ?? ""}
                              </td>;
              })}
                      </tr>)}
              </tbody>
            </table>
          </div>}

        <button onClick={() => window.history.back()} className="fixed bottom-6 right-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 z-50 group border border-slate-700">
          <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />{t("branch_admin.back", "Back")}</button>
      </div>
    </div>;
}