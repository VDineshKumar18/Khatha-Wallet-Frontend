import { ArrowLeft, Search, Filter, Download, Eye, FileText, Image as ImageIcon, User, ArrowUpRight, X, Loader2, Trash2, RotateCcw, MessageCircle } from "lucide-react";
import { openWhatsApp } from "./utils/whatsappUtils";
import { useState, useEffect } from "react";
import { getAllBills, getRecycledBills, deleteBill, restoreBill, permanentDeleteBill } from "./api/billApi";
import { getProducts } from "./api/productApi";
import { toast } from "react-toastify";
import BillReceipt from "./BillReceipt";
import EditBillModal from "./EditBillModal";
import "./BillList.css";

const formatBillItems = (bill) => {
    if (!bill || !bill.items) return "";
    if (bill.billNumber?.startsWith('ORD-')) {
        try {
            const parsed = JSON.parse(bill.items);
            return parsed.map(i => `${i.qty}x ${i.name}`).join(", ");
        } catch {
            return bill.items.length > 30 ? bill.items.substring(0, 30) + "..." : bill.items;
        }
    }
    return bill.items.length > 30 ? bill.items.substring(0, 30) + "..." : bill.items;
};

function BillList({ onBack }) {
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState("ACTIVE"); // 'ACTIVE' | 'RECYCLED'

    useEffect(() => {
        loadBills();
    }, [activeTab]);

    useEffect(() => {
        const safeBills = Array.isArray(bills) ? bills : [];
        if (!searchTerm) {
            setFilteredBills(safeBills);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredBills(
                safeBills.filter(
                    (b) =>
                        b.billNumber?.toLowerCase().includes(lower) ||
                        b.customer?.name?.toLowerCase().includes(lower) ||
                        b.status?.toLowerCase().includes(lower)
                )
            );
        }
    }, [searchTerm, bills]);

    const loadBills = async () => {
        setLoading(true);
        try {
            const res = activeTab === "RECYCLED"
                ? await getRecycledBills()
                : await getAllBills();
            const sortedBills = (res.data || []).sort((a, b) =>
                new Date(b.billDate || b.createdAt) - new Date(a.billDate || a.createdAt)
            );
            setBills(sortedBills);
            setFilteredBills(sortedBills);
        } catch (err) {
            console.error("Failed to load bills", err);
            toast.error("Failed to load bills");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Move this bill to the recycle bin?")) return;
        try {
            await deleteBill(id);
            toast.success("Bill moved to recycle bin");
            loadBills();
        } catch (e) {
            toast.error("Failed to delete bill");
        }
    };

    const handleRestore = async (id) => {
        try {
            await restoreBill(id);
            toast.success("Bill restored successfully");
            loadBills();
        } catch (e) {
            toast.error("Failed to restore bill");
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!window.confirm("Permanently delete this bill? This cannot be undone!")) return;
        try {
            await permanentDeleteBill(id);
            toast.success("Bill permanently deleted");
            loadBills();
        } catch (e) {
            toast.error("Failed to permanently delete bill");
        }
    };



    // Load products for receipt
    const [products, setProducts] = useState([]);
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const retailerId = sessionStorage.getItem("retailerId");
                const res = await getProducts(retailerId);
                setProducts(res.data || []);
            } catch (e) {
                console.error("Failed to load products for receipt:", e);
            }
        };
        fetchProducts();
    }, []);

    // Wait, I will use a cleaner approach. 
    // I will replace the imports FIRST.


    // Export to Excel (CSV)
    const handleExport = () => {
        const csvRows = [];
        // Headers
        csvRows.push(["Date", "Bill No", "Customer", "Items", "Amount", "Paid", "Due", "Mode", "Status"]);

        bills.forEach(bill => {
            const date = new Date(bill.billDate || bill.createdAt).toLocaleDateString();
            const customer = bill.customer ? bill.customer.name : "Walk-in";
            // Escape commas in items
            const items = `"${(bill.items || "").replace(/"/g, '""')}"`;

            csvRows.push([
                date,
                bill.billNumber,
                customer,
                items,
                bill.amount,
                bill.paidAmount,
                bill.dueAmount,
                bill.paymentMode,
                bill.status
            ]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bills_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [editingBill, setEditingBill] = useState(null);

    return (
        <div className="bill-list-container fade-in">
            {/* Header Area */}
            <div className="glass-card bill-list-header">
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="btn ghost" onClick={onBack} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2>📜 All Bills</h2>
                        <p className="text-muted">History of all transactions</p>
                    </div>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="search-box">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Bill no, name or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <X className="clear-search" size={16} onClick={() => setSearchTerm("")} />}
                    </div>

                    <button className="btn secondary icon-btn" onClick={handleExport} title="Export to CSV" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '0 15px' }}>
                        <Download size={16} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Excel</span>
                    </button>
                </div>
            </div>

            {/* Tabs for Active / Recycled */}
            <div className="tab-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <button
                    onClick={() => setActiveTab('ACTIVE')}
                    style={{
                        background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                        fontWeight: activeTab === 'ACTIVE' ? 'bold' : 'normal',
                        color: activeTab === 'ACTIVE' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'ACTIVE' ? '2px solid #2563eb' : 'none'
                    }}>
                    Active Bills
                </button>
                <button
                    onClick={() => setActiveTab('RECYCLED')}
                    style={{
                        background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                        fontWeight: activeTab === 'RECYCLED' ? 'bold' : 'normal',
                        color: activeTab === 'RECYCLED' ? '#ef4444' : '#64748b',
                        borderBottom: activeTab === 'RECYCLED' ? '2px solid #ef4444' : 'none',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                    <Trash2 size={16} /> Recycle Bin
                </button>
            </div>

            {/* Content */}
            <div className="glass-card table-wrapper">
                <div className="table-container">
                    <table className="modern-table desktop-only">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Bill No</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>Status</th>
                                <th>Receipt</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>Loading bills...</td>
                                </tr>
                            ) : filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                                        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileText size={48} opacity={0.2} />
                                            <p>No bills found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => (
                                    <tr key={bill.id}>
                                        <td>
                                            {new Date(bill.billDate || bill.createdAt).toLocaleDateString()}
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(bill.billDate || bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="font-mono">
                                            {bill.billNumber}
                                            {bill.billNumber?.startsWith('ORD-') && (
                                                <span className="status-pill pill-info" style={{ marginLeft: 8, fontSize: 10 }}>
                                                    🛒 ONLINE
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {bill.customer ? (
                                                <div className="customer-cell">
                                                    <span>{bill.customer.name}</span>
                                                </div>
                                            ) : (
                                                <span className="status-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>Walk-in</span>
                                            )}
                                        </td>
                                        <td className="truncate-cell" title={bill.items}>
                                            {formatBillItems(bill)}
                                        </td>
                                        <td className="font-bold">₹{bill.amount}</td>
                                        <td>{bill.paymentMode}</td>
                                        <td>
                                            <span className={`status-pill ${bill.status === "PAID" ? "pill-success" :
                                                bill.status === "PARTIAL" ? "pill-warning" : "pill-danger"
                                                }`}>
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                {activeTab === 'ACTIVE' && (
                                                    <>
                                                        <button className="icon-btn" title="View Receipt" onClick={() => setSelectedBill(bill)}>
                                                            <Eye size={18} />
                                                        </button>
                                                        {bill.customer && (
                                                            <button 
                                                                className="icon-btn" 
                                                                title="Share via WhatsApp" 
                                                                onClick={() => openWhatsApp('bill', bill.id)}
                                                                style={{ color: '#25d366' }}
                                                            >
                                                                <MessageCircle size={18} />
                                                            </button>
                                                        )}
                                                        {bill.customer && (!bill.billNumber?.startsWith('ORD-') || bill.paymentMode === 'KHATHA') && (
                                                            <button className="icon-btn" title="Edit Bill" onClick={() => setEditingBill(bill)}>
                                                                ✏️
                                                            </button>
                                                        )}
                                                        <button className="icon-btn" title="Delete Bill" onClick={() => handleDelete(bill.id)} style={{ color: '#ef4444' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}

                                                {activeTab === 'RECYCLED' && (
                                                    <>
                                                        <button className="icon-btn" title="Restore" onClick={() => handleRestore(bill.id)} style={{ color: '#2563eb' }}>
                                                            <RotateCcw size={18} />
                                                        </button>
                                                        <button className="icon-btn" title="Permanent Delete" onClick={() => handlePermanentDelete(bill.id)} style={{ color: '#ef4444' }}>
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* ✅ MOBILE CARD VIEW */}
                    <div className="mobile-only">
                        {filteredBills.map(bill => (
                            <div className="mobile-card" key={bill.id}>
                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">
                                        #{bill.billNumber}
                                        {bill.billNumber?.startsWith('ORD-') && (
                                            <span className="status-pill pill-info" style={{ marginLeft: 6, fontSize: 10 }}>
                                                🛒 ONLINE
                                            </span>
                                        )}
                                    </span>
                                    <span className="mobile-card-value">{new Date(bill.billDate || bill.createdAt).toLocaleDateString()} {new Date(bill.billDate || bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className="mobile-card-row">
                                    <span className="mobile-card-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                        {formatBillItems(bill)}
                                    </span>
                                </div>

                                <div className="mobile-card-row">
                                    <span style={{ fontWeight: 'bold' }}>
                                        {bill.customer ? bill.customer.name : "Walk-in"}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>₹{bill.amount}</span>
                                </div>

                                <div className="mobile-card-row">
                                    <span className="mobile-card-label">Status</span>
                                    <span className={`status-pill ${bill.status === "PAID" ? "pill-success" :
                                        bill.status === "PARTIAL" ? "pill-warning" : "pill-danger"
                                        }`} style={{ fontSize: '10px' }}>
                                        {bill.status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                    {activeTab === 'ACTIVE' && (
                                        <>
                                            <button
                                                className="btn-view"
                                                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                                                onClick={() => setSelectedBill(bill)}
                                            >
                                                View
                                            </button>
                                            {bill.customer && (
                                                <button
                                                    className="btn-view"
                                                    style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#dcfce7', color: '#166534' }}
                                                    onClick={() => openWhatsApp('bill', bill.id)}
                                                >
                                                    WhatsApp
                                                </button>
                                            )}
                                            {bill.customer && (!bill.billNumber?.startsWith('ORD-') || bill.paymentMode === 'KHATHA') && (
                                                <button
                                                    className="btn-view"
                                                    style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#f1f5f9', color: '#475569' }}
                                                    onClick={() => setEditingBill(bill)}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                className="btn-view"
                                                style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#fef2f2', color: '#ef4444' }}
                                                onClick={() => handleDelete(bill.id)}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}

                                    {activeTab === 'RECYCLED' && (
                                        <>
                                            <button
                                                className="btn-view"
                                                style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#eff6ff', color: '#2563eb' }}
                                                onClick={() => handleRestore(bill.id)}
                                            >
                                                Restore
                                            </button>
                                            <button
                                                className="btn-view"
                                                style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#fef2f2', color: '#ef4444' }}
                                                onClick={() => handlePermanentDelete(bill.id)}
                                            >
                                                Force Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bill Modal */}
            {selectedBill && (
                <BillReceipt
                    bill={selectedBill}
                    products={products}
                    onClose={() => setSelectedBill(null)}
                />
            )}

            {/* Edit Modal */}
            {editingBill && (
                <EditBillModal
                    bill={editingBill}
                    onClose={() => setEditingBill(null)}
                    onUpdate={loadBills}
                />
            )}
        </div>
    );
}

export default BillList;
