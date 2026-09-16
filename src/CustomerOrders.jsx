import { useState } from "react";
import { Clock, CheckCircle, Package, XCircle, X, MessageSquare } from "lucide-react";
import axiosClient from "./api/axiosClient";
import { toast } from "react-toastify";
import OrderChat from "./OrderChat"; // ✅ Import Chat Component
import "./CustomerApp.css";

// ✅ Helper to parse backend dates representing IST/Local time properly
const formatOrderTime = (dateString, showDate = false) => {
    if (!dateString) return "N/A";

    try {
        const d = new Date(dateString);
        let timeStr = "Invalid Time";
        let dateStr = d.toLocaleDateString();

        const timeMatch = dateString.match(/ (\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            let [_, hours, minutes] = timeMatch;
            hours = parseInt(hours);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

            // Re-parse the date part directly from string avoiding JS timezone shifts
            const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                dateStr = `${dateMatch[2]}/${dateMatch[3]}/${dateMatch[1]}`; // MM/DD/YYYY
            }
        } else {
            timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return showDate ? `${dateStr} at ${timeStr}` : timeStr;
    } catch {
        return "Invalid Time";
    }
};

const getExpectedMinsRemaining = (expectedPackingTimeStr) => {
    if (!expectedPackingTimeStr) return null;
    try {
        const expectedTime = new Date(expectedPackingTimeStr);
        const diffMs = expectedTime - new Date();
        const diffMins = Math.ceil(diffMs / 60000);
        return diffMins > 0 ? diffMins : 0;
    } catch {
        return null;
    }
};

const isPackedEarly = (packedAtStr, expectedPackingTimeStr) => {
    if (!packedAtStr || !expectedPackingTimeStr) return false;
    try {
        const packedAt = new Date(packedAtStr);
        const expected = new Date(expectedPackingTimeStr);
        return packedAt <= expected;
    } catch {
        return false;
    }
};

function CustomerOrders({ orders, onRefresh, currentUserId }) {
    const [loading, setLoading] = useState(false);
    const [chatOrder, setChatOrder] = useState(null); // ✅ NEW STATE FOR CHAT
    const [confirmCancelOrderId, setConfirmCancelOrderId] = useState(null); // ✅ Custom confirm state

    // Rating States
    const [ratingOrder, setRatingOrder] = useState(null);
    const [storeRating, setStoreRating] = useState(0);
    const [serviceRating, setServiceRating] = useState(0);
    const [ratingComment, setRatingComment] = useState("");

    const openRatingModal = async (order) => {
        setRatingOrder(order);
        setStoreRating(0);
        setServiceRating(0);
        setRatingComment("");
        try {
            const res = await axiosClient.get(`/ratings/order/${order.id}`);
            if (res.data) {
                setStoreRating(res.data.storeRating);
                setServiceRating(res.data.serviceRating);
                setRatingComment(res.data.comment || "");
            }
        } catch (e) {
            // No rating exists yet
        }
    };

    const submitRating = async () => {
        if (storeRating === 0 || serviceRating === 0) {
            toast.warning("Please select a star rating for both store and service.");
            return;
        }

        try {
            setLoading(true);
            const customerId = ratingOrder.customer?.id || ratingOrder.customerId;
            await axiosClient.post("/ratings", {
                retailerId: ratingOrder.retailer?.id || ratingOrder.retailerId,
                customerId: customerId || currentUserId,
                orderId: ratingOrder.id,
                storeRating,
                serviceRating,
                comment: ratingComment
            });
            toast.success("Thank you for your rating!");
            setRatingOrder(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit rating");
        } finally {
            setLoading(false);
        }
    };

    const executeCancel = async (orderId) => {
        try {
            setLoading(true);
            await axiosClient.put(`/orders/${orderId}/status`, null, {
                params: { status: "CANCELLED" }
            });
            toast.success("Order cancelled successfully");
            setConfirmCancelOrderId(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data || "Failed to cancel order");
        } finally {
            setLoading(false);
        }
    };

    if (!orders || orders.length === 0) {
        return (
            <div className="empty-state">
                <h3>No orders yet 📦</h3>
                <p>Place your first order from the Shop!</p>
            </div>
        );
    }

    return (
        <div className="orders-container">
            <h3 className="section-title">My Orders</h3>

            <div className="orders-list">
                {[...orders].sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt)).map(order => {
                    const items = order.items ? JSON.parse(order.items) : [];
                    return (
                        <div key={order.id} className="order-card-detailed fade-in">
                            <div className="order-header-row">
                                <div className="order-id">
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#999', display: 'block', marginBottom: '2px' }}>Order ID</span>
                                    <span style={{ fontSize: '15px', fontWeight: 800 }}>#{order.id}</span>
                                    {order.retailerName && (
                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>🏬 {order.retailerName}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <OrderStatusBadge status={order.status} />
                                    {order.status === "PACKING" && order.expectedPackingTime && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            fontWeight: 700, 
                                            color: '#d97706', 
                                            background: '#fef3c7', 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px',
                                            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.05)'
                                        }}>
                                            ⏱️ Expected: {getExpectedMinsRemaining(order.expectedPackingTime) > 0 
                                                ? `${getExpectedMinsRemaining(order.expectedPackingTime)} mins` 
                                                : "Delayed/Ready shortly"}
                                        </div>
                                    )}
                                    {["PACKED", "READY_FOR_PICKUP", "COMPLETED", "DELIVERED"].includes(order.status) && isPackedEarly(order.packedAt, order.expectedPackingTime) && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            fontWeight: 700, 
                                            color: '#166534', 
                                            background: '#dcfce7', 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px',
                                            boxShadow: '0 2px 4px rgba(22, 101, 52, 0.05)'
                                        }}>
                                            ⚡ Packed Early
                                        </div>
                                    )}
                                    <button 
                                        className="chat-btn" 
                                        style={{ 
                                            padding: '8px 16px', fontSize: '12px', fontWeight: 800, background: '#4f46e5', 
                                            color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px', position: 'relative'
                                        }}
                                        onClick={() => setChatOrder(order)}
                                    >
                                        <MessageSquare size={16} /> Chat
                                        {order.unreadChatCount > 0 && (
                                            <span style={{ 
                                                position: 'absolute', top: '-8px', right: '-8px', 
                                                background: '#ef4444', color: 'white', borderRadius: '50%', 
                                                width: '18px', height: '18px', fontSize: '10px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {order.unreadChatCount}
                                            </span>
                                        )}
                                    </button>

                                    {["DELIVERED", "COMPLETED"].includes(order.status) && (
                                        <button 
                                            className="rate-btn" 
                                            style={{ 
                                                padding: '8px 16px', fontSize: '12px', fontWeight: 800, background: '#f59e0b', 
                                                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px'
                                            }}
                                            onClick={() => openRatingModal(order)}
                                        >
                                            ★ Rate Store
                                        </button>
                                    )}
                                    {
                                        (['PLACED', 'ACCEPTED', 'STOCK_RESERVED'].includes(order.status) ||
                                            (['PACKING', 'PACKED'].includes(order.status) && order.expectedPackingTime && new Date() > new Date(order.expectedPackingTime))) && (
                                            <button
                                                className="cancel-btn"
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    background: '#fff',
                                                    color: '#ef4444',
                                                    border: '1px solid #fee2e2',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: '0.2s'
                                                }}
                                                onClick={() => setConfirmCancelOrderId(order.id)}
                                                disabled={loading}
                                            >
                                                {['PACKING', 'PACKED'].includes(order.status) ? "Cancel (Delayed)" : "Cancel Order"}
                                            </button>
                                        )}
                                </div>
                            </div>

                            <div className="order-items-preview" style={{ padding: '4px 0 12px' }}>
                                {items.map((item, idx) => (
                                    <div key={idx} className="order-item-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '24px', height: '24px', background: '#f8fafc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '12px' }}>📦</span>
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 500, color: '#444' }}>{item.qty} x {item.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 700 }}>₹{item.total}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="order-footer" style={{ borderTop: '1px solid #f5f5f5', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600 }}>ORDER PLACED ON</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#666' }}>
                                        {formatOrderTime(order.orderDate || order.createdAt, true)}
                                    </span>
                                </div>
                                {["CANCELLED", "AUTO_CANCELLED", "REJECTED"].includes(order.status) && order.gatewayTransactionRef && (
                                    <div style={{ 
                                        fontSize: '12px', 
                                        fontWeight: 700, 
                                        color: '#15803d', 
                                        background: '#dcfce7', 
                                        padding: '4px 12px', 
                                        borderRadius: '20px',
                                        border: '1px solid #bbf7d0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        💳 Refunded to Source ({order.paymentMode})
                                    </div>
                                )}
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, display: 'block' }}>TOTAL AMOUNT</span>
                                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#1a1a1a' }}>₹{order.totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ✅ Render Chat Modal if open */}
            {chatOrder && (
                <OrderChat 
                    order={chatOrder}
                    currentUserId={currentUserId}
                    currentUserRole="CUSTOMER"
                    onClose={() => {
                        setChatOrder(null);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}

            {/* ✅ Custom Confirm Cancel Modal */}
            {confirmCancelOrderId && (
                <div className="custom-confirm-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out',
                    padding: '20px'
                }}>
                    <div className="custom-confirm-card" style={{
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '400px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: '#fee2e2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            color: '#ef4444'
                        }}>
                            <XCircle size={28} />
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Cancel Order?</h4>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                            Are you sure you want to cancel this order? Any prepaid online payments will be refunded to your source account automatically.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setConfirmCancelOrderId(null)} 
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#475569'
                                }}
                            >
                                Keep Order
                            </button>
                            <button 
                                onClick={() => executeCancel(confirmCancelOrderId)} 
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                {loading ? "Cancelling..." : "Yes, Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {ratingOrder && (
                <div className="custom-confirm-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="custom-confirm-card" style={{
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Rate Store & Service</h4>
                            <button onClick={() => setRatingOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                        </div>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                            Order #{ratingOrder.id} from <strong>{ratingOrder.retailerName || "Merchant"}</strong>
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>Store & Product Quality</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star} 
                                        onClick={() => setStoreRating(star)} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: star <= storeRating ? '#f59e0b' : '#cbd5e1', padding: 0 }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>Delivery & Service Quality</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star} 
                                        onClick={() => setServiceRating(star)} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: star <= serviceRating ? '#f59e0b' : '#cbd5e1', padding: 0 }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>Comments / Feedback</label>
                            <textarea 
                                value={ratingComment} 
                                onChange={(e) => setRatingComment(e.target.value)} 
                                placeholder="Share your experience with this shop..." 
                                style={{ width: '100%', minHeight: '80px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px', fontSize: '14px', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setRatingOrder(null)} 
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#475569'
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitRating} 
                                disabled={loading}
                                style={{
                                    flex: 1.5,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#f59e0b',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                {loading ? "Submitting..." : "Submit Review"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderStatusBadge({ status }) {
    const config = {
        PLACED: { icon: Clock, color: "orange", bg: "#fff7ed" },
        ACCEPTED: { icon: CheckCircle, color: "blue", bg: "#eff6ff" },
        STOCK_RESERVED: { icon: Package, color: "blue", bg: "#eff6ff" },
        PACKING: { icon: Package, color: "purple", bg: "#faf5ff" },
        PACKED: { icon: Package, color: "green", bg: "#f0fdf4" },
        READY_FOR_PICKUP: { icon: CheckCircle, color: "green", bg: "#f0fdf4" },
        COMPLETED: { icon: CheckCircle, color: "green", bg: "#f0fdf4" },
        DELIVERED: { icon: CheckCircle, color: "green", bg: "#f0fdf4" },
        MODIFICATION_REQUESTED: { icon: Clock, color: "orange", bg: "#fff7ed" },
        CANCELLED: { icon: XCircle, color: "red", bg: "#fef2f2" },
        AUTO_CANCELLED: { icon: XCircle, color: "red", bg: "#fef2f2" },
        REJECTED: { icon: XCircle, color: "red", bg: "#fef2f2" },
        EXPIRED: { icon: XCircle, color: "red", bg: "#fef2f2" }
    };

    const { icon: Icon, color, bg } = config[status] || config.PLACED;

    return (
        <span className="status-badge" style={{ color, background: bg }}>
            <Icon size={14} />
            {status}
        </span>
    );
}

export default CustomerOrders;
