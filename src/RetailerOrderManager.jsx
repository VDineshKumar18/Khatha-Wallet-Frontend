import { useState, useEffect } from "react";
import axiosClient from "./api/axiosClient";
import { toast } from "react-toastify";
import { Package, CheckCircle, Clock, XCircle, MessageSquare, MessageCircle } from "lucide-react";
import PhoneLink from "./components/PhoneLink";
import OrderChat from "./OrderChat";
import { openWhatsApp } from "./utils/whatsappUtils";

const formatOrderTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const timeMatch = dateString.match(/ (\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            let [_, hours, minutes] = timeMatch;
            hours = parseInt(hours);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
        }
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return "Invalid Time";
    }
};

function RetailerOrderManager({ onBack }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [chatOrder, setChatOrder] = useState(null);

    // Custom Modal Prompts State
    const [packingMinsPrompt, setPackingMinsPrompt] = useState(null); // { orderId }
    const [deliveryOtpPrompt, setDeliveryOtpPrompt] = useState(null); // { orderId }
    const [minsValue, setMinsValue] = useState("15");
    const [otpValue, setOtpValue] = useState("");

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const retailerId = sessionStorage.getItem("retailerId");
            if (!retailerId) return;
            const res = await axiosClient.get(`/orders/retailer/${retailerId}`);
            setOrders(res.data || []);
        } catch (err) {
            console.error("Failed to load orders", err);
        }
    };

    const counts = orders.reduce((acc, o) => {
        if (o.status === "PLACED") acc.placed++;
        else if (["ACCEPTED", "STOCK_RESERVED"].includes(o.status)) acc.reserved++;
        else if (o.status === "PACKING") acc.packing++;
        else if (["PACKED", "READY_FOR_PICKUP", "COMPLETED", "DELIVERED"].includes(o.status)) acc.readyDone++;
        return acc;
    }, { placed: 0, reserved: 0, packing: 0, readyDone: 0 });

    const updateStatus = async (orderId, newStatus, extraParams = {}) => {
        let otp = extraParams.otp || null;
        if (newStatus === "COMPLETED" && !otp) {
            setOtpValue("");
            setDeliveryOtpPrompt({ orderId });
            return;
        }

        try {
            setLoading(true);
            await axiosClient.put(`/orders/${orderId}/status`, null, {
                params: { status: newStatus, otp: otp, ...extraParams }
            });
            toast.success(`Order marked as ${newStatus}`);
            loadOrders();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data || "Failed to update status";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="content">
            <div className="row-between mb-20">
                <button className="btn back small" onClick={onBack}>← Back</button>
                <h2>📦 Online Orders</h2>
            </div>

            <div className="status-summary-bar mb-20" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                background: 'white',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid #eef2ff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
                    <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '8px' }}><Clock size={18} /></div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Placed</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{counts.placed}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}><Package size={18} /></div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Reserved</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{counts.reserved}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                    <div style={{ background: '#fffbeb', padding: '8px', borderRadius: '8px' }}><Package size={18} /></div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Packing</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{counts.packing}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                    <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}><CheckCircle size={18} /></div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>Ready/Done</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{counts.readyDone}</div>
                    </div>
                </div>
            </div>

            <div className="card">
                {orders.length === 0 ? (
                    <div className="empty-state">No active orders</div>
                ) : (
                    <>
                        <table className="modern-table desktop-only">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Time</th>
                                    <th>Items</th>
                                    <th>Amount</th>
                                    <th>Pay Mode</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => {
                                    const items = order.items ? JSON.parse(order.items) : [];
                                    const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

                                    return (
                                        <tr key={order.id}>
                                            <td>#{order.id}</td>
                                            <td>
                                                <div className="customer-info">
                                                    <strong>{order.customerName || "Customer"}</strong>
                                                    {order.customerPhone && (
                                                        <PhoneLink phone={order.customerPhone} />
                                                    )}
                                                </div>
                                            </td>
                                            <td>{formatOrderTime(order.orderDate || order.createdAt)}</td>
                                            <td>
                                                <div className="item-summary" title={items.map(i => `${i.qty}x ${i.name}`).join(", ")} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{itemCount} items</span>
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        title="View Items"
                                                        style={{
                                                            background: '#eef2ff',
                                                            color: '#4f46e5',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            padding: '6px 12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontWeight: 'bold',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        <Package size={18} /> View
                                                    </button>
                                                </div>
                                            </td>
                                            <td>₹ {order.totalAmount}</td>
                                            <td>
                                                <span className={`status-pill ${order.paymentMode === 'KHATHA' ? 'pill-warning' : 'pill-success'}`}>
                                                    {order.paymentMode}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div className="action-row" style={{ gap: '8px', display: 'flex', alignItems: 'center' }}>
                                                        <span className={`status-pill ${['PLACED', 'MODIFICATION_REQUESTED', 'PACKING'].includes(order.status) ? 'pill-warning' : ['STOCK_RESERVED', 'PACKED', 'READY_FOR_PICKUP'].includes(order.status) ? 'pill-info' : 'pill-success'}`} style={{ minWidth: '100px', textAlign: 'center' }}>{order.status}</span>
                                                        {order.status === "PLACED" && (
                                                            <>
                                                                <button className="btn-view" style={{ background: '#10b981' }} onClick={() => updateStatus(order.id, "ACCEPTED")} disabled={loading}>✅ Accept</button>
                                                                <button className="btn-delete" onClick={() => updateStatus(order.id, "REJECTED")} disabled={loading}>❌</button>
                                                            </>
                                                        )}
                                                        {order.status === "STOCK_RESERVED" && (
                                                            <button className="btn-view" style={{ background: '#f59e0b' }} onClick={() => {
                                                                setMinsValue("15");
                                                                setPackingMinsPrompt({ orderId: order.id });
                                                            }} disabled={loading}>📦 Start Packing</button>
                                                        )}
                                                        {order.status === "PACKING" && (
                                                            <button className="btn-view" style={{ background: '#4f46e5' }} onClick={() => updateStatus(order.id, "PACKED")} disabled={loading}>✅ Mark Packed</button>
                                                        )}
                                                        {order.status === "PACKED" && (
                                                            <button className="btn-view" style={{ background: '#3b82f6' }} onClick={() => updateStatus(order.id, "READY_FOR_PICKUP")} disabled={loading}>🔔 Notify Ready</button>
                                                        )}
                                                        {order.status === "READY_FOR_PICKUP" && (
                                                            <button className="btn-view" style={{ background: '#10b981' }} onClick={() => updateStatus(order.id, "COMPLETED")} disabled={loading}>✅ Picked Up</button>
                                                        )}
                                                        {order.status === "MODIFICATION_REQUESTED" && (
                                                            <button className="btn-view" style={{ background: '#10b981' }} onClick={() => updateStatus(order.id, "ACCEPTED")} disabled={loading}>✅ Accept Changes</button>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button 
                                                            onClick={() => setChatOrder(order)}
                                                            style={{
                                                                flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600,
                                                                background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            <MessageSquare size={14} /> Chat
                                                            {order.unreadChatCount > 0 && (
                                                                <span style={{ 
                                                                    position: 'absolute', top: '-6px', right: '-6px', 
                                                                    background: '#ef4444', color: 'white', borderRadius: '50%', 
                                                                    width: '16px', height: '16px', fontSize: '10px', 
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    border: '2px solid white'
                                                                }}>
                                                                    {order.unreadChatCount}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button 
                                                            onClick={() => openWhatsApp('order', order.id)}
                                                            title="Notify via WhatsApp"
                                                            style={{
                                                                padding: '6px', background: '#25d366', color: 'white', 
                                                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            <MessageCircle size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="mobile-only">
                            {orders.map(order => (
                                <div className="mobile-card" key={order.id}>
                                    <div className="mobile-card-row">
                                        <span className="mobile-card-label">Order #{order.id}</span>
                                        <span className={`status-pill ${['PLACED', 'MODIFICATION_REQUESTED', 'PACKING'].includes(order.status) ? 'pill-warning' : ['STOCK_RESERVED', 'PACKED', 'READY_FOR_PICKUP'].includes(order.status) ? 'pill-info' : ['CANCELLED', 'REJECTED', 'AUTO_CANCELLED', 'EXPIRED'].includes(order.status) ? 'pill-danger' : 'pill-success'}`} style={{ fontSize: '10px' }}>{order.status}</span>
                                    </div>
                                    <div className="mobile-card-row">
                                        <span style={{ fontWeight: 'bold' }}>{order.customerName}</span>
                                        <span style={{ fontWeight: 'bold' }}>₹ {order.totalAmount}</span>
                                    </div>
                                    <div className="mobile-card-row">
                                        <span className="mobile-card-label">Time</span>
                                        <span className="mobile-card-value">{formatOrderTime(order.orderDate || order.createdAt)}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#f1f5f9', color: '#475569' }} onClick={() => setSelectedOrder(order)}>View Items</button>
                                        <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => setChatOrder(order)}>
                                            <MessageSquare size={14} /> Chat
                                            {order.unreadChatCount > 0 && (
                                                <span style={{ 
                                                    position: 'absolute', top: '-6px', right: '4px', 
                                                    background: '#ef4444', color: 'white', borderRadius: '50%', 
                                                    width: '18px', height: '18px', fontSize: '11px', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: '2px solid white'
                                                }}>
                                                    {order.unreadChatCount}
                                                </span>
                                            )}
                                        </button>
                                        <button 
                                            className="btn-view" 
                                            style={{ padding: '8px', background: '#25d366', color: 'white', border: 'none' }}
                                            onClick={() => openWhatsApp('order', order.id)}
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        {order.status === "PLACED" && (
                                            <>
                                                <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#10b981' }} onClick={() => updateStatus(order.id, "ACCEPTED")}>✅ Accept</button>
                                                <button className="btn-delete" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => updateStatus(order.id, "REJECTED")}>❌ Reject</button>
                                            </>
                                        )}
                                        {order.status === "STOCK_RESERVED" && (
                                            <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#f59e0b' }} onClick={() => {
                                                setMinsValue("15");
                                                setPackingMinsPrompt({ orderId: order.id });
                                            }}>📦 Start Packing</button>
                                        )}
                                        {order.status === "PACKING" && (
                                            <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#4f46e5' }} onClick={() => updateStatus(order.id, "PACKED")}>✅ Mark Packed</button>
                                        )}
                                        {order.status === "PACKED" && (
                                            <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#3b82f6' }} onClick={() => updateStatus(order.id, "READY_FOR_PICKUP")}>🔔 Notify Ready</button>
                                        )}
                                        {order.status === "READY_FOR_PICKUP" && (
                                            <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#10b981' }} onClick={() => updateStatus(order.id, "COMPLETED")}>✅ Picked Up</button>
                                        )}
                                        {order.status === "MODIFICATION_REQUESTED" && (
                                            <button className="btn-view" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#10b981' }} onClick={() => updateStatus(order.id, "ACCEPTED")}>✅ Accept Changes</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onRefresh={loadOrders}
                />
            )}

            {chatOrder && (
                <OrderChat 
                    order={chatOrder}
                    currentUserId={sessionStorage.getItem("retailerId")}
                    currentUserRole="RETAILER"
                    onClose={() => {
                        setChatOrder(null);
                        loadOrders();
                    }}
                />
            )}

            {/* Custom Modal Prompts (UI Improvement over native alert/prompt) */}
            {packingMinsPrompt && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-scale" style={{ maxWidth: '400px', padding: '24px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>📦 Start Packing</h3>
                            <button className="close-btn" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setPackingMinsPrompt(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ marginBottom: '20px' }}>
                            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>
                                How many minutes are expected to pack this order?
                            </p>
                            <input
                                type="number"
                                placeholder="e.g., 15"
                                value={minsValue}
                                onChange={(e) => setMinsValue(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn secondary small" onClick={() => setPackingMinsPrompt(null)}>Cancel</button>
                            <button 
                                className="btn primary small" 
                                style={{ background: '#f59e0b', color: 'white' }}
                                onClick={() => {
                                    const mins = parseInt(minsValue);
                                    if (!isNaN(mins) && mins > 0) {
                                        updateStatus(packingMinsPrompt.orderId, "PACKING", { expectedMinutes: mins });
                                        setPackingMinsPrompt(null);
                                    } else {
                                        toast.error("Please enter a valid number of minutes.");
                                    }
                                }}
                            >
                                Start Packing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deliveryOtpPrompt && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-scale" style={{ maxWidth: '400px', padding: '24px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>🔍 Enter Delivery OTP</h3>
                            <button className="close-btn" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setDeliveryOtpPrompt(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ marginBottom: '20px' }}>
                            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>
                                Please ask the customer for their 6-digit Delivery OTP:
                            </p>
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                value={otpValue}
                                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '18px',
                                    letterSpacing: '4px',
                                    textAlign: 'center',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn secondary small" onClick={() => setDeliveryOtpPrompt(null)}>Cancel</button>
                            <button 
                                className="btn primary small" 
                                style={{ background: '#10b981', color: 'white' }}
                                onClick={() => {
                                    if (otpValue.length === 6) {
                                        updateStatus(deliveryOtpPrompt.orderId, "COMPLETED", { otp: otpValue });
                                        setDeliveryOtpPrompt(null);
                                    } else {
                                        toast.error("Please enter a valid 6-digit OTP.");
                                    }
                                }}
                            >
                                Verify & Complete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderDetailsModal({ order, onClose, onRefresh }) {
    const [items, setItems] = useState(order.items ? JSON.parse(order.items) : []);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const isModifiable = ['PLACED', 'STOCK_RESERVED', 'MODIFICATION_REQUESTED'].includes(order.status);

    const handleQtyChange = (idx, delta) => {
        const newItems = [...items];
        newItems[idx].qty += delta;
        if (newItems[idx].qty < 1) newItems[idx].qty = 1;
        newItems[idx].total = newItems[idx].qty * newItems[idx].price;
        setItems(newItems);
    };

    const handleRemoveItem = (idx) => {
        const newItems = items.filter((_, i) => i !== idx);
        setItems(newItems);
    };

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error("Order must have at least one item.");
            return;
        }

        const newTotalAmount = items.reduce((sum, item) => sum + item.total, 0);

        try {
            setSaving(true);
            await axiosClient.put(`/orders/${order.id}/modify`, {
                items: JSON.stringify(items),
                totalAmount: newTotalAmount
            });
            toast.success("Order modified. Status set to MODIFICATION_REQUESTED.");
            setIsEditing(false);
            if (onRefresh) onRefresh();
            onClose();
        } catch (err) {
            toast.error("Failed to modify order.");
        } finally {
            setSaving(false);
        }
    };

    const currentTotal = items.reduce((sum, item) => sum + item.total, 0);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '550px' }}>
                <div className="modal-header">
                    <h3>📦 Order #{order.id} Items</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="row-between mb-20" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                        <div>
                            <p><strong>Customer:</strong> {order.customerName}</p>
                            {order.customerPhone && <p><strong>Phone:</strong> <PhoneLink phone={order.customerPhone} showIcon={false} /></p>}
                            <p><strong>Original Amount:</strong> ₹{order.totalAmount}</p>
                        </div>
                        {isModifiable && !isEditing && (
                            <button className="btn primary small" onClick={() => setIsEditing(true)}>✍️ Edit Order</button>
                        )}
                    </div>

                    <table className="modern-table" style={{ fontSize: '14px' }}>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Total</th>
                                {isEditing && <th>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.name}</td>
                                    <td>₹{item.price}</td>
                                    <td>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <button onClick={() => handleQtyChange(idx, -1)} style={{ padding: '2px 8px', cursor: 'pointer' }}>-</button>
                                                <span>{item.qty}</span>
                                                <button onClick={() => handleQtyChange(idx, 1)} style={{ padding: '2px 8px', cursor: 'pointer' }}>+</button>
                                            </div>
                                        ) : (
                                            item.qty
                                        )}
                                    </td>
                                    <td>₹{item.total}</td>
                                    {isEditing && (
                                        <td>
                                            <button onClick={() => handleRemoveItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✖</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {isEditing && (
                        <div style={{ marginTop: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                            New Total: ₹{currentTotal}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {isEditing ? (
                        <>
                            <button className="btn secondary" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</button>
                            <button className="btn primary" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button className="btn secondary" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RetailerOrderManager;
