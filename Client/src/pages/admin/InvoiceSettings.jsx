import React, { useState, useEffect } from "react";
import { FaSave, FaUpload, FaEye } from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import Header from "../../components/admin/Header";
import { getCompanyById, updateCompanySettings } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { printReceipt } from "../../utils/printReceipt";
import { useToast, ToastContainer } from "../../components/super-admin/Toast";

const BillSettings = () => {
  const { user } = useAuth();
  const { toasts, removeToast, toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    com_name: "",
    location: "",
    phone: "",
    bill_greeting: "Thank You For Your Visit! Please Come Again",
    bill_logo: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const data = await getCompanyById(user.com_id);
      setForm({
        com_name: data.com_name || "",
        location: data.location || "",
        phone: data.phone || "",
        bill_greeting: data.bill_greeting || "Thank You For Your Visit! Please Come Again",
        bill_logo: data.bill_logo || "",
      });
    } catch (err) {
      setError("Failed to fetch company settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, bill_logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError("");
      await updateCompanySettings(user.com_id, {
        com_name: form.com_name,
        location: form.location,
        phone: form.phone,
        bill_greeting: form.bill_greeting,
        bill_logo: form.bill_logo,
      });
      toast.success("Bill settings updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update settings");
      toast.error("Failed to update settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = () => {
    const dummyInvoice = {
      orderId: "INV-000999",
      cashierName: user?.name || "Test User",
      createdAt: new Date().toLocaleString(),
      items: [
        { pro_name: "Sample Product 1", qty: 2, unitPrice: 15.00, total: 30.00 },
        { pro_name: "Sample Product 2", qty: 1, unitPrice: 10.00, total: 10.00 },
      ],
      subtotal: 40.00,
      discount: 0.00,
      tax: 4.00,
      total: 44.00,
      paymentMethod: "Cash"
    };

    const companySettings = {
      com_name: form.com_name || "YOUR COMPANY",
      location: form.location,
      phone: form.phone,
      bill_logo: form.bill_logo,
      bill_greeting: form.bill_greeting
    };

    printReceipt(dummyInvoice, companySettings);
  };

  return (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Sidebar />
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title="Invoice Settings" />
        <div style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
                Invoice Template Settings
              </h2>
              <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>
                Manage your bill printing preferences
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handlePreview}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <FaEye /> Preview Bill
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#3f51b5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <FaSave /> {submitting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">Loading settings...</div>
            ) : (
              
              <div className="space-y-6">
                  <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-start gap-4">
                    {form.bill_logo ? (
                      <div className="relative border border-slate-200 rounded-lg p-2 bg-slate-50 w-32 h-32 flex items-center justify-center">
                        <img src={form.bill_logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        <button
                          onClick={() => setForm({ ...form, bill_logo: "" })}
                          className="absolute -top-2 -right-2 bg-red-300 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 w-32 h-32 flex flex-col items-center justify-center text-slate-500">
                        <span className="text-sm">No Logo</span>
                      </div>
                    )}
                    
                    <div className="flex-1 pt-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg cursor-pointer transition">
                        <FaUpload />
                        <span>Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <p className="text-xs text-slate-500 mt-2">
                        Recommended format: Black & White PNG/JPG.<br/>
                        For thermal printers, simpler logos look best.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={form.com_name}
                    onChange={handleChange("com_name")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="E.g., Your Company Ltd."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={handleChange("location")}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="E.g., 1234 BEAUTY AVE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="E.g., (415) 516-4441"
                    />
                  </div>
                </div>

              
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Greeting Message
                  </label>
                  <textarea
                    value={form.bill_greeting}
                    onChange={handleChange("bill_greeting")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24"
                    placeholder="E.g., Thank You For Your Visit! Please Come Again"
                  />
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default BillSettings;
