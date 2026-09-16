
import { useState } from "react";
import { ArrowLeft, Calendar, CheckCircle, Plus, X, Upload, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import { openWhatsApp } from "./utils/whatsappUtils";
import { createBill, uploadBillImage } from "./api/billApi"; // ✅ API Imports

function SchemeDetails({ customer, bills = [], onBack, refreshBills }) {
    // Filter only SCHEME transactions
    const safeBills = Array.isArray(bills) ? bills : [];
    const schemeBills = safeBills.filter((b) => b.type === "SCHEME");

    // ✅ State for Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        note: "",
        date: new Date().toISOString().split("T")[0],
    });
    const [selectedFile, setSelectedFile] = useState(null);

    // ✅ Handle Scheme Payment Save
    const handleSavePayment = async () => {
        if (!paymentForm.amount) {
            toast.error("Enter amount");
            return;
        }

        try {
            setSaving(true);

            // 1. Create Bill
            const res = await createBill(customer.id, {
                type: "SCHEME",
                amount: Number(paymentForm.amount),
                paidAmount: Number(paymentForm.amount), // Scheme is fully paid deposit
                paymentMode: paymentForm.note || "SCHEME_DEPOSIT",
                items: "Monthly Savings Deposit",
                billDate: new Date(paymentForm.date).toISOString(),
            });

            // 2. Upload Image if exists
            if (selectedFile) {
                await uploadBillImage(res.data.id, selectedFile);
            }

            toast.success("Payment Added Successfully!");

            // 3. Reset and Refresh
            setPaymentForm({ amount: "", note: "", date: new Date().toISOString().split("T")[0] });
            setSelectedFile(null);
            setShowPaymentModal(false);

            if (refreshBills) {
                await refreshBills(customer.id);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to save payment");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="content">
            <button className="back-nav" onClick={onBack}>
                <ArrowLeft size={16} /> Back to Scheme List
            </button>

            <div className="scheme-details-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
                {/* ✅ HEADER */}
                <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: "24px", color: "#1e293b", margin: "0 0 8px 0" }}>
                            Monthly Savings Scheme 🐷
                        </h1>
                        <p style={{ color: "#64748b", fontSize: "16px", display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Member: <strong style={{ color: "#0f172a" }}>{customer.name}</strong> • Phone: {customer.phone}
                            <button 
                                onClick={() => openWhatsApp('scheme', customer.id)}
                                title="Send WhatsApp Reminder"
                                style={{
                                    background: "#25d366", color: "white", border: "none",
                                    padding: "4px 8px", borderRadius: "6px", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}
                            >
                                <MessageCircle size={14} />
                            </button>
                        </p>
                    </div>

                    {/* ✅ ADD PAYMENT BUTTON */}
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        style={{
                            background: "#0ea5e9", color: "white", border: "none",
                            padding: "10px 20px", borderRadius: "10px",
                            fontWeight: 600, display: "flex", alignItems: "center", gap: "8px",
                            cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.2)"
                        }}
                    >
                        <Plus size={18} /> Add Payment
                    </button>
                </div>

                {/* ✅ PLAN CARD */}
                <div className="scheme-card-large" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", borderRadius: "20px", padding: "32px", color: "white", boxShadow: "0 10px 30px -10px rgba(14, 165, 233, 0.5)", marginBottom: "32px" }}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                        <div>
                            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Total Saved</div>
                            <div style={{ fontSize: "48px", fontWeight: 800 }}>
                                ₹{customer.schemeCollectedAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ background: "rgba(255,255,255,0.2)", padding: "8px 16px", borderRadius: "12px", fontSize: "14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                <Calendar size={16} /> Target: ₹{customer.schemeTargetAmount?.toLocaleString() || "6,000"}
                            </div>
                            <div style={{ marginTop: "8px", fontSize: "13px", opacity: 0.9 }}>
                                Monthly Deposit: ₹{customer.schemeMonthlyAmount || 500}
                            </div>
                        </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px", opacity: 0.9 }}>
                            <span>Progress</span>
                            <span>{Math.round((customer.schemeCollectedAmount / customer.schemeTargetAmount) * 100)}%</span>
                        </div>
                        <div style={{ height: "12px", background: "rgba(255,255,255,0.3)", borderRadius: "6px", overflow: "hidden" }}>
                            <div style={{
                                width: `${Math.min((customer.schemeCollectedAmount / customer.schemeTargetAmount) * 100, 100)}%`,
                                height: "100%",
                                background: "white",
                                borderRadius: "6px",
                                transition: "width 0.5s ease"
                            }}></div>
                        </div>
                    </div>

                    {/* MONTH CIRCLES */}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                        {[...Array(12)].map((_, i) => {
                            const monthlyAmount = customer.schemeMonthlyAmount || 500;
                            const monthsPaid = Math.floor((customer.schemeCollectedAmount || 0) / monthlyAmount);
                            const isPaid = i < monthsPaid;

                            return (
                                <div key={i} style={{
                                    width: "36px", height: "36px", borderRadius: "50%",
                                    background: isPaid ? "white" : "rgba(255,255,255,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "14px", color: isPaid ? "#0284c7" : "rgba(255,255,255,0.6)",
                                    fontWeight: 700, border: isPaid ? "none" : "1px solid rgba(255,255,255,0.3)"
                                }}>
                                    {i + 1}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ✅ PAYMENT HISTORY TABLE */}
                <div className="section-header" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "18px", color: "#334155", margin: 0 }}>Payment History</h3>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>{schemeBills.length} Transactions</span>
                </div>

                <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <table className="modern-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <tr>
                                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Date</th>
                                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Description</th>
                                <th style={{ padding: "16px", textAlign: "right", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Amount</th>
                                <th style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schemeBills.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                                        No scheme payments recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                schemeBills.map((b) => (
                                    <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "16px", color: "#334155", fontSize: "14px" }}>
                                            {new Date(b.billDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: "16px", color: "#334155", fontSize: "14px" }}>
                                            {b.items || "Monthly Deposit"}
                                        </td>
                                        <td style={{ padding: "16px", textAlign: "right", fontWeight: 600, color: "#0ea5e9", fontSize: "14px" }}>
                                            ₹{b.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: "16px", textAlign: "center" }}>
                                            <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                <CheckCircle size={10} /> PAID
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* ✅ PAYMENT MODAL */}
            {showPaymentModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0ea5e9", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={20} /> Add Savings Deposit
                            </h4>
                            <button onClick={() => setShowPaymentModal(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                                <X size={20} color="#6b7280" />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Amount (₹)</label>
                                <input
                                    type="number"
                                    placeholder="500.00"
                                    autoFocus
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    style={{ padding: "12px", borderRadius: "8px", border: "2px solid #e5e7eb", width: "100%", boxSizing: "border-box", fontSize: "18px", fontWeight: 600, outlineColor: '#0ea5e9' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Verified By (Optional)</label>
                                <input
                                    placeholder="e.g. UPI, Cash, Employee Name"
                                    value={paymentForm.note}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", width: "100%", boxSizing: "border-box", fontSize: "14px", outlineColor: '#0ea5e9' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Date</label>
                                <input
                                    type="date"
                                    value={paymentForm.date}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", width: "100%", boxSizing: "border-box", fontSize: "14px", outlineColor: '#0ea5e9' }}
                                />
                            </div>

                            {/* FILE INPUT */}
                            <div
                                onClick={() => document.getElementById('scheme-file-upload').click()}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '12px', background: '#f9fafb',
                                    border: '1px solid #e5e7eb', borderRadius: '8px',
                                    cursor: 'pointer', fontSize: '14px', color: '#6b7280'
                                }}
                            >
                                <Upload size={16} />
                                {selectedFile ? selectedFile.name : "Attach Receipt"}
                            </div>
                            <input
                                id="scheme-file-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                style={{ display: 'none' }}
                            />

                            <button
                                onClick={handleSavePayment}
                                disabled={saving}
                                style={{
                                    marginTop: "8px",
                                    padding: "14px",
                                    background: "#0ea5e9",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: "15px",
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? "Saving..." : "Confirm Deposit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SchemeDetails;
