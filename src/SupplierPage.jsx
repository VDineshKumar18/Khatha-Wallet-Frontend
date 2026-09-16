import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierTransactions, addSupplierTransaction } from "./api/supplierApi";
import { Truck, Plus, Pencil, Trash2, X, Phone, Mail, MapPin, Package, Building2, StickyNote, ChevronLeft, CreditCard, DollarSign, Minus, Upload } from "lucide-react";
import PhoneLink from "./components/PhoneLink";
import "./SupplierPage.css";

const emptyForm = {
    name: "",
    phone: "",
    company: "",
    email: "",
    address: "",
    productsSupplied: "",
    notes: "",
};

function SupplierPage({ onBack }) {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [search, setSearch] = useState("");

    // Credit Management
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [txnLoading, setTxnLoading] = useState(false);
    const [txnFormType, setTxnFormType] = useState(null); // 'BILL' or 'PAYMENT'
    const [txnAmount, setTxnAmount] = useState("");
    const [txnDesc, setTxnDesc] = useState("");

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const res = await getSuppliers();
            setSuppliers(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error("Failed to load suppliers", e);
        } finally {
            setLoading(false);
        }
    };

    const openManageCredit = async (supplier) => {
        setSelectedSupplier(supplier);
        setTxnLoading(true);
        try {
            const res = await getSupplierTransactions(supplier.id);
            setTransactions(res.data || []);
        } catch (e) {
            console.error("Failed to load txns", e);
            toast.error("Failed to load transactions");
        } finally {
            setTxnLoading(false);
        }
    };

    const handleTransaction = async () => {
        if (!txnAmount || Number(txnAmount) <= 0) return toast.error("Enter valid amount");

        setSaving(true);
        try {
            await addSupplierTransaction(selectedSupplier.id, {
                type: txnFormType,
                amount: Number(txnAmount),
                description: txnDesc
            });
            toast.success("Transaction recorded");
            setTxnFormType(null); // Close sub-form
            setTxnAmount("");
            setTxnDesc("");

            // Reload transactions and suppliers (to update balance)
            const txRes = await getSupplierTransactions(selectedSupplier.id);
            setTransactions(txRes.data || []);
            loadSuppliers(); // Refresh list for balance update
        } catch (e) {
            console.error(e);
            toast.error("Transaction failed");
        } finally {
            setSaving(false);
        }
    };

    // ... (Existing handlers: openAdd, openEdit, handleSave, handleDelete) ...
    const openAdd = () => {
        setEditingSupplier(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setForm({ ...emptyForm, ...supplier });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error("Supplier name is required");
        setSaving(true);
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, form);
            } else {
                await createSupplier(form);
            }
            setShowForm(false);
            await loadSuppliers();
        } catch (e) {
            console.error("Save failed", e);
            toast.error("Failed to save supplier");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSupplier(id);
            setDeleteConfirm(null);
            await loadSuppliers();
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const filtered = safeSuppliers.filter((s) =>
        [s.name, s.company, s.phone, s.productsSupplied]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="supplier-container">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                <button
                    onClick={onBack}
                    style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Truck size={22} color="#6366f1" /> Supplier List
                    </h2>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} registered</p>
                </div>
                <button
                    onClick={openAdd}
                    style={{ background: "#6366f1", color: "white", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "14px" }}
                >
                    <Plus size={16} /> Add Supplier
                </button>
            </div>

            {/* Search */}
            <input
                placeholder="🔍 Search by name, company, phone or products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}
            />

            {/* Loading */}
            {loading && <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Loading suppliers...</div>}

            {/* Supplier Cards */}
            <div className="supplier-grid">
                {filtered.map((s) => (
                    <div key={s.id} className="supplier-card">
                        <div key={s.id} className="glass-card supplier-card">
                            <div className="supplier-avatar">
                                {s.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="supplier-info">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>{s.name}</h3>
                                    {s.company && (
                                        <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: "12px", padding: "2px 8px", borderRadius: "20px" }}>
                                            {s.company}
                                        </span>
                                    )}
                                </div>

                                {/* Balance Badge */}
                                <div className={`balance-display ${s.balance > 0 ? "balance-positive" : s.balance < 0 ? "balance-negative" : "balance-zero"}`}>
                                    {s.balance > 0 ? `To Pay: ₹${s.balance}` : s.balance < 0 ? `Advance: ₹${Math.abs(s.balance)}` : "No Dues"}
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
                                    {s.phone && (
                                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#374151" }}>
                                            <Phone size={13} color="#6b7280" />
                                            <PhoneLink phone={s.phone} showIcon={false} />
                                        </span>
                                    )}
                                    {/* ... Other details ... */}
                                </div>

                                <button className="manage-btn" onClick={() => openManageCredit(s)}>
                                    <CreditCard size={14} /> Manage Credit
                                </button>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button onClick={() => openEdit(s)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer" }}>
                                    <Pencil size={15} color="#374151" />
                                </button>
                                <button onClick={() => setDeleteConfirm(s)} style={{ background: "#fef2f2", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer" }}>
                                    <Trash2 size={15} color="#ef4444" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Credit Management Modal */}
            {selectedSupplier && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h3 style={{ marginBottom: '4px' }}>{selectedSupplier.name}</h3>
                                <div className={`balance-display ${selectedSupplier.balance > 0 ? "balance-positive" : selectedSupplier.balance < 0 ? "balance-negative" : "balance-zero"}`}>
                                    Current Balance: {selectedSupplier.balance > 0 ? `You Owe ₹${selectedSupplier.balance}` : selectedSupplier.balance < 0 ? `Advance ₹${Math.abs(selectedSupplier.balance)}` : "₹0"}
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedSupplier(null)}><X size={20} /></button>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-grid">
                            <button
                                onClick={() => setTxnFormType('BILL')}
                                style={{ padding: "16px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "12px", fontWeight: 700, cursor: "pointer", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.1s' }}
                            >
                                <span style={{ fontSize: "24px" }}>📉</span>
                                <span>You Received (Bill)</span>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Debt Increases</span>
                            </button>
                            <button
                                onClick={() => setTxnFormType('PAYMENT')}
                                style={{ padding: "16px", background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac", borderRadius: "12px", fontWeight: 700, cursor: "pointer", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.1s' }}
                            >
                                <span style={{ fontSize: "24px" }}>💸</span>
                                <span>You Gave (Payment)</span>
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>Debt Decreases</span>
                            </button>
                        </div>

                        {/* History */}
                        <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Transaction History</h4>
                        {txnLoading ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Loading history...</div>
                        ) : transactions.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", background: "#f9fafb", borderRadius: "8px" }}>No transactions yet</div>
                        ) : (
                            <div className="transaction-list">
                                {transactions.map((t) => (
                                    <div key={t.id} className="transaction-item">
                                        <div className="txn-left">
                                            <span className="txn-type" style={{ color: t.type === 'BILL' ? '#dc2626' : '#16a34a' }}>
                                                {t.type === 'BILL' ? 'BILL RECEIVED' : 'PAYMENT MADE'}
                                            </span>
                                            <span className="txn-date">{new Date(t.transactionDate).toLocaleString()}</span>
                                            {t.description && <span style={{ fontSize: '12px', color: '#4b5563' }}>{t.description}</span>}
                                        </div>
                                        <span className={`txn-amount ${t.type === 'BILL' ? 'txn-bill' : 'txn-payment'}`}>
                                            {t.type === 'BILL' ? '+' : '-'} ₹{t.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Transaction Modal - POPUP OVERLAY */}
                        {txnFormType && (
                            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                                <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: txnFormType === 'BILL' ? "#dc2626" : "#16a34a", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {txnFormType === 'BILL' ? <StickyNote size={20} /> : <DollarSign size={20} />}
                                            {txnFormType === 'BILL' ? "You Received Subject / Bill" : "You Gave Payment"}
                                        </h4>
                                        <button className="close-btn" onClick={() => setTxnFormType(null)}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Amount (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                autoFocus
                                                value={txnAmount}
                                                onChange={(e) => setTxnAmount(e.target.value)}
                                                style={{ padding: "12px", borderRadius: "8px", border: "2px solid #e5e7eb", width: "100%", boxSizing: "border-box", fontSize: "18px", fontWeight: 600 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Description / Bill No.</label>
                                            <input
                                                placeholder="e.g. Bill #123 or Cash Payment"
                                                value={txnDesc}
                                                onChange={(e) => setTxnDesc(e.target.value)}
                                                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", width: "100%", boxSizing: "border-box", fontSize: "14px" }}
                                            />
                                        </div>

                                        <button
                                            onClick={handleTransaction}
                                            disabled={saving}
                                            style={{
                                                marginTop: "8px",
                                                padding: "14px",
                                                background: txnFormType === 'BILL' ? "#dc2626" : "#16a34a",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "12px",
                                                cursor: "pointer",
                                                fontWeight: 700,
                                                fontSize: "15px",
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {saving ? "Saving..." : "Confirm Transaction"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* End of Credit Management Modal Content */}
                    </div>
                </div>
            )}



            {/* Existing Modal for Add/Edit Supplier... (Keep as is, just wrapped in standard modal if needed, or leave existing implementation) */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                                {editingSupplier ? "✏️ Edit Supplier" : "➕ Add Supplier"}
                            </h3>
                            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                                <X size={20} color="#6b7280" />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {[
                                { label: "Supplier Name *", key: "name", placeholder: "e.g. Ramesh Traders", icon: <Building2 size={15} /> },
                                { label: "Phone Number", key: "phone", placeholder: "e.g. 9876543210", icon: <Phone size={15} /> },
                                { label: "Company / Shop Name", key: "company", placeholder: "e.g. Ramesh & Sons Wholesale", icon: <Building2 size={15} /> },
                                { label: "Email", key: "email", placeholder: "e.g. ramesh@example.com", icon: <Mail size={15} /> },
                                { label: "Address", key: "address", placeholder: "e.g. Market Road, Hyderabad", icon: <MapPin size={15} /> },
                                { label: "Products Supplied (comma separated)", key: "productsSupplied", placeholder: "e.g. Rice, Sugar, Oil", icon: <Package size={15} /> },
                                { label: "Notes", key: "notes", placeholder: "e.g. Visits every Monday", icon: <StickyNote size={15} /> },
                            ].map(({ label, key, placeholder, icon }) => (
                                <div key={key}>
                                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
                                        {icon} {label}
                                    </label>
                                    {key === "notes" || key === "address" ? (
                                        <textarea
                                            placeholder={placeholder}
                                            value={form[key]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            rows={2}
                                            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
                                        />
                                    ) : (
                                        <input
                                            placeholder={placeholder}
                                            value={form[key]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box" }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                            <button
                                onClick={() => setShowForm(false)}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#6366f1", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
                            >
                                {saving ? "Saving..." : editingSupplier ? "Update Supplier" : "Add Supplier"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal (Keep existing) */}
            {deleteConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "380px", textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
                        <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Delete Supplier?</h3>
                        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 600 }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SupplierPage;
