import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Shield, ShieldAlert, Store, Users, CheckCircle, XCircle, Trash2, LogOut, Eye, MessageSquare, BarChart3, Clock, AlertTriangle, ChevronRight, Search, FileText, Camera } from "lucide-react";
import logoImg from "./assets/landing/logo.svg";

// Helper function
const apiCall = async (endpoint, method = "GET", body = null) => {
    const token = sessionStorage.getItem("admin_token");
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`http://localhost:8080/api/admin${endpoint}`, config);

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        // Return JSON even for error responses so callers can read `data.message`
        return data;
    }

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }
    return { success: true };
};

function AdminApp() {
    const [token, setToken] = useState(sessionStorage.getItem("admin_token"));
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [activeTab, setActiveTab] = useState("dashboard");
    const [stats, setStats] = useState({ totalRetailers: 0, totalProducts: 0, openTickets: 0, totalCustomers: 0, totalOrders: 0, revenueToday: 0 });
    const [retailers, setRetailers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [pendingProducts, setPendingProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [gatewayTransactions, setGatewayTransactions] = useState([]);
    const [fraudAlerts, setFraudAlerts] = useState([]);
    
    // UI states
    const [viewingKyc, setViewingKyc] = useState(null); // {license, photo, id}
    const [resolvingTicket, setResolvingTicket] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Password Reset States
    const [resetStep, setResetStep] = useState(null); // null, 'EMAIL', 'OTP', 'PASSWORD'
    const [resetEmail, setResetEmail] = useState("");
    const [resetOtp, setResetOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (token) {
            loadData();
        }
    }, [token, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === "dashboard") {
                const data = await apiCall("/stats");
                setStats(data || { totalRetailers: 0, totalProducts: 0, openTickets: 0, totalCustomers: 0, totalOrders: 0, revenueToday: 0 });
            } else if (activeTab === "retailers") {
                const data = await apiCall("/retailers");
                setRetailers(Array.isArray(data) ? data : []);
            } else if (activeTab === "customers") {
                const data = await apiCall("/customers");
                setCustomers(Array.isArray(data) ? data : []);
            } else if (activeTab === "orders") {
                const data = await apiCall("/orders");
                setOrders(Array.isArray(data) ? data : []);
            } else if (activeTab === "payments") {
                const data = await apiCall("/payments");
                setPayments(Array.isArray(data) ? data : []);
                try {
                    const gRes = await fetch("http://localhost:8080/api/payments/gateway/transactions");
                    if (gRes.ok) {
                        const gData = await gRes.json();
                        setGatewayTransactions(Array.isArray(gData) ? gData : []);
                    }
                } catch (gErr) {
                    console.error("Failed to load gateway transactions", gErr);
                }
            } else if (activeTab === "fraud") {
                const data = await apiCall("/fraud/suspicious");
                setFraudAlerts(Array.isArray(data) ? data : []);
            } else if (activeTab === "tickets") {
                const data = await apiCall("/tickets");
                setTickets(Array.isArray(data) ? data : []);
            } else if (activeTab === "products") {
                const data = await apiCall("/products/pending");
                setPendingProducts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load data: " + err.message);
            // Reset to empty arrays on error to prevent .map() crashes
            if (activeTab === "retailers") setRetailers([]);
            if (activeTab === "customers") setCustomers([]);
            if (activeTab === "tickets") setTickets([]);
            if (activeTab === "products") setPendingProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await apiCall("/login", "POST", { email, password });
            if (res.success && res.token) {
                sessionStorage.setItem("admin_token", res.token);
                setToken(res.token);
                toast.success("Welcome, Super Admin");
            } else {
                toast.error(res.message || "Login failed");
            }
        } catch (err) {
            toast.error("Network error");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("admin_token");
        setToken(null);
    };

    const handleResetPassword = () => {
        setResetEmail(email);
        setResetOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setResetStep("EMAIL");
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        if (!resetEmail) return;
        const res = await apiCall("/reset-password/request", "POST", { email: resetEmail });
        if (res.success) {
            toast.success("OTP sent to your email!");
            setResetStep("OTP");
        } else {
            toast.error(res.message || "Failed to request OTP");
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!resetOtp) return;
        const res = await apiCall("/reset-password/verify", "POST", { email: resetEmail, otp: resetOtp });
        if (res.success) {
            toast.success("OTP verified!");
            setResetStep("PASSWORD");
        } else {
            toast.error(res.message || "Invalid OTP");
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        const res = await apiCall("/reset-password/update", "POST", { 
            email: resetEmail, 
            otp: resetOtp, 
            password: newPassword 
        });
        if (res.success) {
            toast.success("Password updated successfully!");
            setResetStep(null);
            setEmail(resetEmail);
            setPassword("");
        } else {
            toast.error(res.message || "Failed to update password");
        }
    };

    // Retailer Actions
    const handleVerify = async (id, status) => {
        const res = await apiCall(`/retailers/${id}/verify`, "PUT", { status });
        if (res && res.id) {
            toast.success(`Retailer status: ${status}`);
            setViewingKyc(null);
            loadData();
        } else {
            toast.error("Action failed");
        }
    };

    // Product Actions
    const handleModerateProduct = async (id, status) => {
        const res = await apiCall(`/products/${id}/moderate`, "PUT", { status });
        if (res && res.id) {
            toast.success(`Product ${status.toLowerCase()}`);
            loadData();
        }
    };

    // Ticket Actions
    const handleResolveTicket = async (id, status, notes) => {
        const res = await apiCall(`/tickets/${id}/resolve`, "PUT", { status, notes });
        if (res && res.id) {
            toast.success("Ticket updated");
            setResolvingTicket(null);
            loadData();
        }
    };

    const deleteRetailer = async (id) => {
        if (!window.confirm("Are you sure? This action cannot be undone and may fail if they have active bills.")) return;
        const res = await apiCall(`/retailers/${id}`, "DELETE");
        if (res.success) {
            toast.success("Retailer deleted");
            loadData();
        } else {
            toast.error(res.message || "Failed to delete");
        }
    };

    // Customer Actions
    const deleteCustomer = async (id) => {
        if (!window.confirm("Delete this customer?")) return;
        const res = await apiCall(`/customers/${id}`, "DELETE");
        if (res.success) {
            toast.success("Customer deleted");
            loadData();
        } else {
            toast.error(res.message || "Failed to delete");
        }
    };

    // Report Actions
    const deleteReportedProduct = async (id) => {
        if (!window.confirm("Delete this product from the platform?")) return;
        const res = await apiCall(`/products/${id}`, "DELETE");
        if (res.success) {
            toast.success("Product and reports deleted");
            loadData();
        } else {
            toast.error(res.message || "Failed to delete");
        }
    };

    const dismissReport = async (id) => {
        const res = await apiCall(`/reports/${id}/dismiss`, "PUT");
        if (res.success) {
            toast.success("Report dismissed");
            loadData();
        } else {
            toast.error(res.message || "Failed to dismiss");
        }
    };

    if (!token) {
        return (
            <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
                {resetStep === "EMAIL" && (
                    <form onSubmit={handleRequestReset} style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <img src={logoImg} alt="Khatha Wallet" style={{ height: "64px", objectFit: "contain" }} />
                        </div>
                        <h2 style={{ color: "white", textAlign: "center", marginBottom: "15px", marginTop: "0px" }}>Reset Password</h2>
                        <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", marginBottom: "25px", lineHeight: "1.5" }}>Enter your admin email to verify with a 6-digit OTP.</p>

                        <input
                            type="email"
                            placeholder="Admin Email"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" }}
                            required
                        />

                        <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "16px", marginBottom: "15px" }}>
                            Send Verification OTP
                        </button>
                        <button type="button" onClick={() => setResetStep(null)} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>
                            Back to Login
                        </button>
                    </form>
                )}

                {resetStep === "OTP" && (
                    <form onSubmit={handleVerifyOtp} style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <img src={logoImg} alt="Khatha Wallet" style={{ height: "64px", objectFit: "contain" }} />
                        </div>
                        <h2 style={{ color: "white", textAlign: "center", marginBottom: "15px", marginTop: "0px" }}>Enter OTP</h2>
                        <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", marginBottom: "25px", lineHeight: "1.5" }}>Enter the 6-digit OTP sent to {resetEmail}.</p>

                        <input
                            type="text"
                            placeholder="6-digit OTP"
                            maxLength={6}
                            value={resetOtp}
                            onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))}
                            style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", textAlign: "center", fontSize: "20px", letterSpacing: "8px" }}
                            required
                        />

                        <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "16px", marginBottom: "15px" }}>
                            Verify OTP
                        </button>
                        <button type="button" onClick={() => setResetStep("EMAIL")} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>
                            Back
                        </button>
                    </form>
                )}

                {resetStep === "PASSWORD" && (
                    <form onSubmit={handleUpdatePassword} style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <img src={logoImg} alt="Khatha Wallet" style={{ height: "64px", objectFit: "contain" }} />
                        </div>
                        <h2 style={{ color: "white", textAlign: "center", marginBottom: "15px", marginTop: "0px" }}>New Password</h2>
                        <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", marginBottom: "25px", lineHeight: "1.5" }}>Choose a strong new password for your admin account.</p>

                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" }}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" }}
                            required
                        />

                        <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>
                            Update Password
                        </button>
                    </form>
                )}

                {!resetStep && (
                    <form onSubmit={handleLogin} style={{ background: "#1e293b", padding: "40px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <img src={logoImg} alt="Khatha Wallet" style={{ height: "64px", objectFit: "contain" }} />
                        </div>
                        <h2 style={{ color: "white", textAlign: "center", marginBottom: "30px", marginTop: "0px" }}>Admin Portal</h2>

                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" }}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: "100%", padding: "12px", marginBottom: "16px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" }}
                            required
                        />

                        <div style={{ textAlign: "right", marginBottom: "30px" }}>
                            <button 
                                type="button" 
                                onClick={handleResetPassword} 
                                style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: "0" }}
                            >
                                Reset Password?
                            </button>
                        </div>

                        <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>
                            Login
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
            {/* Nav */}
            <div style={{ background: "#1e293b", color: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={logoImg} alt="Khatha Wallet" style={{ height: "30px", objectFit: "contain" }} />
                    <h2 style={{ margin: 0, marginLeft: "5px" }}>Super Admin</h2>
                </div>
                <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <LogOut size={18} /> Logout
                </button>
            </div>

            <div style={{ display: "flex", maxWidth: "1280px", margin: "0 auto", padding: "32px 16px" }}>
                {/* Sidebar */}
                <div style={{ width: "260px", marginRight: "32px" }}>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "dashboard" ? "#3b82f6" : "transparent", color: activeTab === "dashboard" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <BarChart3 size={20} /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab("retailers")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "retailers" ? "#3b82f6" : "transparent", color: activeTab === "retailers" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <Store size={20} /> Retailers {(retailers.filter(r=>r.approvalStatus==='PENDING').length > 0) && <span style={{ marginLeft: 'auto', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>New</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab("customers")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "customers" ? "#3b82f6" : "transparent", color: activeTab === "customers" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <Users size={20} /> Customers
                    </button>
                    <button
                        onClick={() => setActiveTab("products")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "products" ? "#3b82f6" : "transparent", color: activeTab === "products" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <CheckCircle size={20} /> Moderation
                    </button>
                    <button
                        onClick={() => setActiveTab("orders")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "orders" ? "#3b82f6" : "transparent", color: activeTab === "orders" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <Clock size={20} /> Orders Monitoring
                    </button>
                    <button
                        onClick={() => setActiveTab("payments")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "payments" ? "#3b82f6" : "transparent", color: activeTab === "payments" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <Shield size={20} /> Payment Disputes
                    </button>
                    <button
                        onClick={() => setActiveTab("fraud")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "fraud" ? "#3b82f6" : "transparent", color: activeTab === "fraud" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <ShieldAlert size={20} /> Fraud Detection {fraudAlerts.length > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{fraudAlerts.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab("tickets")}
                        style={{ width: "100%", padding: "12px 16px", textAlign: "left", background: activeTab === "tickets" ? "#3b82f6" : "transparent", color: activeTab === "tickets" ? "white" : "#64748b", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", transition: '0.2s' }}
                    >
                        <MessageSquare size={20} /> Support {stats.openTickets > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{stats.openTickets}</span>}
                    </button>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1 }}>
                    {loading && <div style={{ marginBottom: 20, color: '#64748b', fontSize: 14 }}>Loading latest data...</div>}
                    
                    {activeTab === "dashboard" && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                            <div className="stat-card" style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#059669', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Revenue Today</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>₹{stats.revenueToday?.toFixed(0) || 0}</div>
                            </div>
                            <div className="stat-card" style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#3b82f6', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Orders Today</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{stats.ordersToday || 0}</div>
                            </div>
                            <div className="stat-card" style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Total Orders</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{stats.totalOrders || 0}</div>
                            </div>
                            <div className="stat-card" style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Total Customers</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{stats.totalCustomers || 0}</div>
                            </div>
                            <div className="stat-card" style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Open Tickets</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{stats.openTickets}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === "orders" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Platform Order Monitoring</h2>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Order Info</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Customer</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Retailer</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Status</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13, textAlign: "right" }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>No orders found.</td></tr> : (
                                        orders.map(o => (
                                            <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "16px 8px" }}>
                                                    <div style={{ fontWeight: 700 }}>#{o.id}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(o.orderDate).toLocaleString()}</div>
                                                </td>
                                                <td style={{ padding: "16px 8px" }}>{o.customer?.name || "Unknown"}</td>
                                                <td style={{ padding: "16px 8px" }}>{o.retailer?.shopName || "N/A"}</td>
                                                <td style={{ padding: "16px 8px" }}>
                                                    <span style={{ 
                                                        padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                                                        background: o.status === 'COMPLETED' ? '#dcfce7' : o.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                                                        color: o.status === 'COMPLETED' ? '#166534' : o.status === 'CANCELLED' ? '#991b1b' : '#92400e'
                                                    }}>{o.status}</span>
                                                </td>
                                                <td style={{ padding: "16px 8px", textAlign: "right", fontWeight: 700 }}>₹{o.totalAmount}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "payments" && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {/* Section 1: Online Gateway Transactions */}
                            <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a", display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Shield size={24} style={{ color: '#2563eb' }} /> Online Payment Gateway Logs (Prepaid Orders)
                                </h2>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Txn Ref</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Date & Time</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Customer</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Channel</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Status</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13, textAlign: "right" }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gatewayTransactions.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No gateway transactions logged yet.</td></tr> : (
                                            gatewayTransactions.map(gt => (
                                                <tr key={gt.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "16px 8px", fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' }}>{gt.transactionRef}</td>
                                                    <td style={{ padding: "16px 8px", fontSize: 13 }}>{new Date(gt.createdAt).toLocaleString()}</td>
                                                    <td style={{ padding: "16px 8px" }}>
                                                        <div style={{ fontWeight: '600' }}>{gt.customerName}</div>
                                                        <div style={{ fontSize: 11, color: '#64748b' }}>{gt.customerEmail}</div>
                                                    </td>
                                                    <td style={{ padding: "16px 8px" }}>
                                                        <span style={{ fontSize: 11, fontWeight: '700', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>{gt.paymentMethod}</span>
                                                    </td>
                                                    <td style={{ padding: "16px 8px" }}>
                                                        <span style={{ 
                                                            fontSize: 11, fontWeight: '800', padding: '4px 10px', borderRadius: 12,
                                                            background: gt.status === 'SUCCESS' ? '#dcfce7' : gt.status === 'REFUNDED' ? '#f1f5f9' : '#fee2e2',
                                                            color: gt.status === 'SUCCESS' ? '#166534' : gt.status === 'REFUNDED' ? '#475569' : '#991b1b'
                                                        }}>{gt.status}</span>
                                                    </td>
                                                    <td style={{ padding: "16px 8px", textAlign: "right", fontWeight: 800 }}>₹{gt.amount}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Section 2: Khatha Ledger Dues Payments */}
                            <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>Khatha Ledger Cash & Manual Payments</h2>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>ID</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Date</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Customer</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Status</th>
                                            <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13, textAlign: "right" }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No manual payment logs found.</td></tr> : (
                                            payments.map(py => (
                                                <tr key={py.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "16px 8px" }}>#{py.id}</td>
                                                    <td style={{ padding: "16px 8px" }}>{py.paymentDate}</td>
                                                    <td style={{ padding: "16px 8px" }}>{py.customer?.name}</td>
                                                    <td style={{ padding: "16px 8px" }}><span style={{ color: '#166534', fontWeight: 600 }}>CONFIRMED</span></td>
                                                    <td style={{ padding: "16px 8px", textAlign: "right", fontWeight: 700 }}>₹{py.amount}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "fraud" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Fraud & Risk Detection</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                                {fraudAlerts.length === 0 ? <p>No suspicious activity detected.</p> : (
                                    fraudAlerts.map(f => (
                                        <div key={f.id} style={{ border: '2px solid #fee2e2', borderRadius: 16, padding: 20, background: '#fff1f2' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <ShieldAlert className="text-red-500" />
                                                <span style={{ fontSize: 11, fontWeight: 900, color: '#991b1b', background: '#fecaca', padding: '2px 8px', borderRadius: 8 }}>{f.severity} RISK</span>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{f.shopName || f.name}</div>
                                            <div style={{ color: '#991b1b', fontSize: 14, fontWeight: 600, marginBottom: 15 }}>{f.reason}</div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => handleVerify(f.id, 'SUSPENDED')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#991b1b', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Suspend Account</button>
                                                <button style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #991b1b', background: 'transparent', color: '#991b1b', fontWeight: 600, cursor: 'pointer' }}>Mark Safe</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "retailers" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Retailer Management</h2>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Shop Name</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Status</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>KYC</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13, textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {retailers.map(r => (
                                        <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 8px" }}>
                                                <div style={{ fontWeight: "600", color: "#0f172a" }}>{r.shopName || r.name}</div>
                                                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{r.phone}</div>
                                            </td>
                                            <td style={{ padding: "16px 8px" }}>
                                                <span className={`badge-${r.approvalStatus?.toLowerCase()}`} style={{
                                                   padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                   background: r.approvalStatus === 'APPROVED' ? '#dcfce7' : r.approvalStatus === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                                   color: r.approvalStatus === 'APPROVED' ? '#166534' : r.approvalStatus === 'REJECTED' ? '#991b1b' : '#854d0e'
                                                }}>{r.approvalStatus || 'PENDING'}</span>
                                            </td>
                                            <td style={{ padding: "16px 8px" }}>
                                                {(r.shopLicenseUrl || r.shopPhotoUrl) ? (
                                                    <button onClick={() => setViewingKyc(r)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Eye size={14} /> View Docs
                                                    </button>
                                                ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>No Docs</span>}
                                            </td>
                                            <td style={{ padding: "16px 8px", textAlign: "right" }}>
                                                <button onClick={() => deleteRetailer(r.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: 'pointer' }}><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "customers" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Customer Database</h2>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Customer Name</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Contact Info</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Associated Retailer</th>
                                        <th style={{ padding: "12px 8px", color: "#64748b", fontSize: 13, textAlign: "right" }}>Pending Dues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No customers registered yet.</td></tr>
                                    ) : customers.map(c => (
                                        <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "16px 8px" }}>
                                                <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                                                <div style={{ fontSize: 11, color: "#64748b" }}>ID: #{c.id}</div>
                                            </td>
                                            <td style={{ padding: "16px 8px" }}>
                                                <div style={{ fontSize: 14 }}>{c.phone}</div>
                                                <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.email}</div>
                                            </td>
                                            <td style={{ padding: "16px 8px" }}>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.retailer?.shopName || "N/A"}</div>
                                                <div style={{ fontSize: 11, color: "#64748b" }}>Retailer ID: #{c.retailer?.id}</div>
                                            </td>
                                            <td style={{ padding: "16px 8px", textAlign: "right" }}>
                                                <div style={{ fontWeight: 800, color: c.dueAmount > 0 ? "#ef4444" : "#10b981" }}>
                                                    ₹{c.dueAmount?.toFixed(2)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "products" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Product Moderation Queue</h2>
                            {pendingProducts.length === 0 ? <p style={{ color: '#64748b' }}>No pending products to review.</p> : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                                    {pendingProducts.map(p => (
                                        <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                                <img src={p.imageUrl || "https://placehold.co/100"} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>Retailer: {p.retailerName}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>₹{p.price}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => handleModerateProduct(p.id, 'APPROVED')} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                                                <button onClick={() => handleModerateProduct(p.id, 'REJECTED')} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "tickets" && (
                        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "24px", color: "#0f172a" }}>Support Tickets & Complaints</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {tickets.map(t => (
                                    <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: t.status === 'OPEN' ? '#fffaf0' : 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <div style={{ fontWeight: 700, fontSize: 16 }}>{t.ticketType?.replace('_', ' ')}</div>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: t.status === 'OPEN' ? '#d97706' : '#166534' }}>{t.status}</span>
                                        </div>
                                        <p style={{ margin: '0 0 15px', color: '#475569', fontSize: 14 }}>{t.description}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                From: {t.reporterType} #{t.reporterId} | Target: {t.targetType} #{t.targetId}
                                            </div>
                                            {t.status === 'OPEN' && (
                                                <button onClick={() => setResolvingTicket(t)} style={{ background: '#0f172a', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Resolve</button>
                                            )}
                                        </div>
                                        {t.resolutionNotes && (
                                            <div style={{ marginTop: 15, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                                                <strong>Resolution:</strong> {t.resolutionNotes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals for KYC and Tickets */}
                {viewingKyc && (
                    <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div style={{ background: 'white', borderRadius: 20, width: '90%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto', padding: 32 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                <h2>KYC Verification: {viewingKyc.shopName}</h2>
                                <button onClick={() => setViewingKyc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={24}/></button>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18}/> Shop License</h4>
                                    {viewingKyc.shopLicenseUrl ? (
                                        <img src={`http://localhost:8080/api/retailer/image/${viewingKyc.shopLicenseUrl}`} alt="License" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                    ) : <div style={{ height: 200, background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Not Uploaded</div>}
                                </div>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Camera size={18}/> Shop Photo</h4>
                                    {viewingKyc.shopPhotoUrl ? (
                                        <img src={`http://localhost:8080/api/retailer/image/${viewingKyc.shopPhotoUrl}`} alt="Shop Photo" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                    ) : <div style={{ height: 200, background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Not Uploaded</div>}
                                </div>
                            </div>

                            <div style={{ marginTop: 40, borderTop: '1px solid #f1f5f9', paddingTop: 24, display: 'flex', gap: 15, justifyContent: 'flex-end' }}>
                                <button onClick={() => handleVerify(viewingKyc.id, 'REJECTED')} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Reject KYC</button>
                                <button onClick={() => handleVerify(viewingKyc.id, 'APPROVED')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 32px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>Approve & Verify Retailer</button>
                            </div>
                        </div>
                    </div>
                )}

                {resolvingTicket && (
                     <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: '500px', padding: 32 }}>
                            <h3>Resolve Support Ticket</h3>
                            <textarea 
                                placeholder="Resolution notes (will be visible to user)..." 
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                style={{ width: '100%', height: 120, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', margin: '20px 0' }}
                            ></textarea>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => handleResolveTicket(resolvingTicket.id, 'RESOLVED', resolutionNotes)} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Mark Resolved</button>
                                <button onClick={() => setResolvingTicket(null)} style={{ flex: 1, border: '1px solid #e2e8f0', padding: '12px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminApp;
