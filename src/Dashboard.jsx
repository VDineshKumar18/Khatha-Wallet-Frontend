import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getCustomers, createCustomer } from "./api/customerApi";
import { getBillsByCustomer } from "./api/billApi";
import { getProducts } from "./api/productApi";
import axiosClient from "./api/axiosClient";

// ✅ LAZY LOAD SUB-VIEWS FOR LIGHTHOUSE PERFORMANCE
const Billing = lazy(() => import("./Billing"));
const CustomerList = lazy(() => import("./CustomerList"));
const Products = lazy(() => import("./Products"));
const CustomerDetails = lazy(() => import("./CustomerDetails"));
const RetailerProfile = lazy(() => import("./RetailerProfile"));
const BillList = lazy(() => import("./BillList"));
const RetailerOrderManager = lazy(() => import("./RetailerOrderManager"));
const SupplierPage = lazy(() => import("./SupplierPage"));
const SchemeDetails = lazy(() => import("./SchemeDetails"));
const SyncContactsModal = lazy(() => import("./SyncContactsModal"));
const SelectContactModal = lazy(() => import("./SelectContactModal"));

import logoIcon from "./assets/landing/logo_icon.svg";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Menu, LayoutDashboard, ReceiptText, ShoppingBag, Users, LogOut, ChartBar, CreditCard, ChevronRight, Home, Package, FileText, User, UserPlus, PiggyBank } from "lucide-react";
import "./Dashboard.css";
import "./addcustomer.css";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const retailerId = sessionStorage.getItem("retailerId");
  const retailerName =
    sessionStorage.getItem("retailerName") ||
    sessionStorage.getItem("retailerEmail") ||
    "Retailer";

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (!retailerId) {
      sessionStorage.clear();
      window.location.reload();
    }
  }, [retailerId]);

  /* ================= STATE ================= */
  /* ================= ROUTING SYNC ================= */
  const getPathFromView = (view) => {
    switch (view) {
      case 'billing': return '/retailer/billing';
      case 'addInvoice': return '/retailer/add-invoice';
      case 'customers': return '/retailer/customers';
      case 'details': return '/retailer/customers/details';
      case 'onlineCustomers': return '/retailer/online-customers';
      case 'products': return '/retailer/inventory';
      case 'onlineOrders': return '/retailer/orders';
      case 'scheme': return '/retailer/savings';
      case 'schemeDetails': return '/retailer/savings/details';
      case 'profile': return '/retailer/profile';
      case 'bills': return '/retailer/bills';
      case 'supplier': return '/retailer/supplier';
      case 'addCustomer': return '/retailer/add-customer';
      default: return '/retailer';
    }
  };

  const getViewFromPath = (path) => {
    if (path.includes('/retailer/billing')) return 'billing';
    if (path.includes('/retailer/add-invoice')) return 'addInvoice';
    if (path.includes('/retailer/customers/details')) return 'details';
    if (path.includes('/retailer/customers')) return 'customers';
    if (path.includes('/retailer/online-customers')) return 'onlineCustomers';
    if (path.includes('/retailer/inventory')) return 'products';
    if (path.includes('/retailer/orders')) return 'onlineOrders';
    if (path.includes('/retailer/savings/details')) return 'schemeDetails';
    if (path.includes('/retailer/savings')) return 'scheme';
    if (path.includes('/retailer/profile')) return 'profile';
    if (path.includes('/retailer/bills')) return 'bills';
    if (path.includes('/retailer/supplier')) return 'supplier';
    if (path.includes('/retailer/add-customer')) return 'addCustomer';
    return null;
  };

  const [activeView, setActiveView] = useState(getViewFromPath(location.pathname));

  useEffect(() => {
    const view = getViewFromPath(location.pathname);
    setActiveView(view);
  }, [location.pathname]);

  const handleViewChange = (view) => {
    navigate(getPathFromView(view));
  };

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]); // ✅ NEW
  const [orders, setOrders] = useState([]); // ✅ NEW
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // ✅ Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [showSync, setShowSync] = useState(false);
  const [showSelectContact, setShowSelectContact] = useState(false); // ✅ NEW
  const [syncedContacts, setSyncedContacts] = useState([]); // ✅ NEW



  /* ================= LOAD DASHBOARD DATA ================= */
  const loadDashboardData = async () => {
    try {
      // 1. Customers
      const resCustomers = await getCustomers();
      const customerData = Array.isArray(resCustomers.data) ? resCustomers.data : [];
      setCustomers(customerData);

      // Sync selected customer
      if (selectedCustomer) {
        const updated = customerData.find((c) => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }

      if (retailerId) {
        // 2. Products (For Mobile Top 2)
        const resProducts = await getProducts(retailerId);
        const productData = Array.isArray(resProducts.data) ? resProducts.data : [];
        setProducts(productData);

        // 3. Online Orders (For Mobile Top 2)
        const resOrders = await axiosClient.get(`/orders/retailer/${retailerId}`);
        const orderData = Array.isArray(resOrders.data) ? resOrders.data : [];
        setOrders(orderData);
      }

    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []); // eslint-disable-line



  /* ================= LOAD BILLS ================= */
  const loadBills = async (customerId) => {
    const res = await getBillsByCustomer(customerId);
    setBills(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    if (!selectedCustomer?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBills(selectedCustomer.id);
  }, [selectedCustomer?.id]);

  /* ================= REFRESH WRAPPER ================= */
  const refreshData = async (customerId) => {
    await loadBills(customerId);
    await loadDashboardData(); // ✅ UPDATED
  };



  /* ================= CALCULATIONS ================= */
  const totalGave = customers.reduce((s, c) => s + (c.dueAmount || 0), 0);

  const totalReceived = customers.reduce((s, c) => s + (c.totalReceived || c.paidAmount || 0), 0);

  // TOP 2 LISTS
  const top2Customers = [...customers]
    .sort((a, b) => (b.dueAmount || 0) - (a.dueAmount || 0))
    .slice(0, 2);

  const top2Products = [...products]
    .sort((a, b) => (a.stock || 0) - (b.stock || 0)) // Low stock priority
    .slice(0, 2);

  const top2Orders = [...orders]
    .filter(o => o.status === 'PENDING') // Priority to pending
    .slice(0, 2);

  /* ================= BILLING CHART DATA ================= */
  const billingChartData = bills.reduce((acc, bill) => {
    const date = new Date(bill.date || bill.createdAt || 0);
    const month = date.toLocaleString("default", { month: "short" });

    const existing = acc.find((item) => item.month === month);

    if (existing) {
      existing.amount += bill.totalAmount || 0;
    } else {
      acc.push({
        month,
        amount: bill.totalAmount || 0,
      });
    }

    return acc;
  }, []);

  /* ================= PRODUCT SUMMARY DATA ================= */
  const productChartData = products.slice(0, 5).map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 10) + '..' : p.name,
    stock: p.quantity || 0,
  }));

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  /* ================= RENDER ================= */
  // Helper for friendly name display
  const getFriendlyName = (name) => {
    if (!name) return "User";
    const firstName = name.split(' ')[0];
    if (firstName.includes('@')) return firstName.split('@')[0];
    return firstName;
  };

  const getViewHeader = () => {
    switch (activeView) {
      case 'billing': return { title: "Quick Billing", sub: "Generate invoices and manage sales" };
      case 'onlineOrders': return { title: "Online Orders", sub: "Track and manage customer orders" };
      case 'customers': return { title: "Your Customers", sub: "Manage loyalty and credit dues" };
      case 'details': return { title: "Customer Activity", sub: "Track dues and transactions" };
      case 'scheme': return { title: "Savings Scheme", sub: "Monitor monthly savings members" };
      case 'products': return { title: "Stock Inventory", sub: "Manage products and pricing" };
      case 'profile': return { title: "My Profile", sub: "Account settings and logout" };
      case 'bills': return { title: "All Bills", sub: "History of all transactions" };
      case 'addCustomer': return { title: "New Customer", sub: "Add details to your database" };
      default: return {
        title: <>Hey, <span>{getFriendlyName(retailerName)}</span> 👋</>,
        sub: "Your shop overview for today"
      };
    }
  };

  const currentHeader = getViewHeader();

  return (
    <div className="app-layout">
      {/* ===== SIDEBAR ===== */}
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          activeView={activeView}
          setActiveView={handleViewChange}
          onLogout={handleLogout}
        />
      </div>

      {/* ================= MOBILE BOTTOM NAV (Hide when sidebar is open) ================= */}
      {!sidebarOpen && (
        <div className="bottom-nav mobile-only">
          <button
            className={`nav-item ${!activeView || activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleViewChange(null)}
          >
            <Home size={20} />
            <span>Home</span>
          </button>

          <button
            className={`nav-item ${activeView === 'billing' ? 'active' : ''}`}
            onClick={() => handleViewChange('billing')}
          >
            <ReceiptText size={20} />
            <span>Billing</span>
          </button>

          <button
            className={`nav-item ${activeView === 'onlineOrders' ? 'active' : ''}`}
            onClick={() => handleViewChange('onlineOrders')}
          >
            <ShoppingBag size={20} />
            <span>Orders</span>
          </button>

          <button
            className={`nav-item ${activeView === 'customers' ? 'active' : ''}`}
            onClick={() => handleViewChange('customers')}
          >
            <Users size={20} />
            <span>Customers</span>
          </button>

          <button
            className={`nav-item ${activeView === 'scheme' ? 'active' : ''}`}
            onClick={() => handleViewChange('scheme')}
          >
            <PiggyBank size={20} />
            <span>Savings</span>
          </button>
        </div>
      )}

      {/* ================= MOBILE STICKY HEADER ================= */}
      <div className="mobile-header mobile-only">
        <div className="mobile-header-left">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={logoIcon} alt="Logo" style={{ height: "30px", width: "auto" }} />
            <div className="mobile-logo-text">Khatha<span>Wallet</span></div>
          </div>
        </div>
        <div className="mobile-header-right">
          <button className="icon-btn profile-pill" onClick={() => handleViewChange('profile')}>
            <User size={20} />
          </button>
        </div>
      </div>
      {/* MOBILE BACKDROP */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            width: '100%',
            height: 'calc(100% - 64px)',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998
          }}
        />
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className={`main-content ${!sidebarOpen ? "full" : ""}`}>
        <div className="dashboard-root">


          {/* ===== DYNAMIC HEADER SECTION (DESKTOP) ===== */}
          <div className="dashboard-header-row desktop-only">
            <div className="welcome-section">
              <h1 className="welcome-text">{currentHeader.title}</h1>
              <p className="subtitle">{currentHeader.sub}</p>
            </div>
            {/* Optional: Add extra desktop-only header items here like search or date */}
          </div>

          {/* ===== DYNAMIC HEADER SECTION (MOBILE) ===== */}
          <div className="mobile-welcome-banner mobile-only">
            <h1>{currentHeader.title}</h1>
            <p>{currentHeader.sub}</p>
          </div>

          {/* ===== DASHBOARD HOME ===== */}
          {!activeView && (
            <div className="dashboard-scroll-area">
              {/* ===== GAVE / RECEIVED CARDS ===== */}
              <div className="summary-stats-row">
                <div
                  className="summary-card success"
                  onClick={() => handleViewChange("customers")}
                >
                  <div className="card-info">
                    <h3>Total Received</h3>
                    <h2>₹ {totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  </div>
                  <div className="card-icon-bg">
                    <CreditCard size={48} />
                  </div>
                </div>

                <div
                  className="summary-card danger"
                  onClick={() => handleViewChange("customers")}
                >
                  <div className="card-info">
                    <h3>Total Gave (Dues)</h3>
                    <h2>₹ {totalGave.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                  </div>
                  <div className="card-icon-bg">
                    <Users size={48} />
                  </div>
                </div>
              </div>

              {/* ===== QUICK ACTIONS GRID ===== */}
              <div className="quick-actions-row">
                <div className="glass-card quick-action" onClick={() => handleViewChange('bills')}>
                  <div className="action-icon purple"><ReceiptText size={20} /></div>
                  <span>All Bills</span>
                </div>
                <div className="glass-card quick-action" onClick={() => handleViewChange('addCustomer')}>
                  <div className="action-icon blue"><UserPlus size={20} /></div>
                  <span>Add Customer</span>
                </div>
                <div className="glass-card quick-action" onClick={() => handleViewChange('products')}>
                  <div className="action-icon green"><Package size={20} /></div>
                  <span>Inventory</span>
                </div>
                <div className="glass-card quick-action" onClick={() => handleViewChange('onlineOrders')}>
                  <div className="action-icon orange"><ShoppingBag size={20} /></div>
                  <span>Orders</span>
                </div>
              </div>

              {/* ===== SECTION CARDS WITH CHARTS ===== */}
              <div className="cards-row">
                {/* BILLING / CUSTOMERS CARD */}
                <div
                  className="glass-card section-card"
                  onClick={() => handleViewChange("billing")}
                >
                  <div className="section-header">
                    <h3><ReceiptText size={20} color="#4f46e5" /> Revenue Insights</h3>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>

                  <div className="desktop-only">
                    <p>Comparison of received payments vs. pending dues.</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Received', value: totalReceived },
                            { name: 'Pending', value: totalGave }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* MOBILE TOP 2 CUSTOMERS */}
                  <div className="mobile-only mt-4">
                    <p className="mini-label">Top Dues</p>
                    {top2Customers.map(c => (
                      <div key={c.id} className="mini-item">
                        <span className="name">{c.name}</span>
                        <span className="value danger">₹{c.dueAmount?.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PRODUCTS CARD */}
                <div
                  className="glass-card section-card"
                  onClick={() => handleViewChange("products")}
                >
                  <div className="section-header">
                    <h3><Package size={20} color="#16a34a" /> Inventory Status</h3>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>

                  <div className="desktop-only">
                    <p>Monitor stock levels for your top moving products.</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={productChartData}>
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="stock" fill="#16a34a" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* MOBILE TOP 2 PRODUCTS */}
                  <div className="mobile-only mt-4">
                    <p className="mini-label">Low Stock</p>
                    {top2Products.map(p => (
                      <div key={p.id} className="mini-item">
                        <span className="name">{p.name}</span>
                        <span className="value warning">{p.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ WRAP DYNAMIC VIEWS IN SUSPENSE FOR CODESPLITTING */}
          <Suspense fallback={<div className="loader">Loading...</div>}>
            {/* ===== CUSTOMER LIST ===== */}
            {
              activeView === "customers" && (
                <CustomerList
                  customers={customers}
                  onBack={() => handleViewChange(null)}
                  onSelectCustomer={(c) => {
                    setSelectedCustomer(c);
                    handleViewChange("details");
                  }}
                />
              )
            }

            {/* ===== SCHEME MEMBERS LIST (FILTERED) ===== */}
            {
              activeView === "scheme" && (
                <CustomerList
                  customers={customers.filter(c => c.isSchemeActive)}
                  title="Monthly Savings Members"
                  onBack={() => handleViewChange(null)}
                  onSelectCustomer={(c) => {
                    setSelectedCustomer(c);
                    handleViewChange("schemeDetails"); // ✅ Go to Scheme Details
                  }}
                />
              )
            }

            {/* ===== SCHEME DETAILS VIEW ===== */}
            {
              activeView === "schemeDetails" && selectedCustomer && (
                <SchemeDetails
                  customer={selectedCustomer}
                  bills={bills} // Dashboard loads bills when selectedCustomer changes
                  refreshBills={refreshData} // ✅ Pass refresh function
                  onBack={() => {
                    handleViewChange("scheme");
                    setSelectedCustomer(null);
                  }}
                />
              )
            }

            {/* ===== CUSTOMER DETAILS ===== */}
            {
              activeView === "details" && selectedCustomer && (
                <CustomerDetails
                  customer={selectedCustomer}
                  bills={bills}
                  refreshBills={refreshData} // ✅ Use wrapper
                  onBack={() => {
                    handleViewChange("customers");
                    setSelectedCustomer(null);
                  }}
                />
              )
            }
            {/* ===== ADD CUSTOMER ===== */}
            {
              activeView === "addCustomer" && (
                <div className="content">
                  <button className="btn back small" onClick={() => handleViewChange(null)}>
                    ⬅ Back
                  </button>

                  <div className="card mt-20">
                    <div className="add-customer-header mb-20">
                      <h3>👤 Add New Customer</h3>
                      <p className="subtitle">Enter customer details to add them to your database</p>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Customer Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <div className="search-wrapper">
                          <input
                            placeholder="Enter full name"
                            value={newCustomer.name}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, name: e.target.value })
                            }
                            style={{ width: '100%', paddingLeft: '40px' }}
                          />
                          <style>{`.search-wrapper.name-icon::before { content: '👤'; }`}</style>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                        <div className="search-wrapper phone-icon">
                          <input
                            placeholder="Enter phone number"
                            value={newCustomer.phone}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, phone: e.target.value })
                            }
                            style={{ width: '100%', paddingLeft: '40px' }}
                          />
                          <style>{`.phone-icon::before { content: '📞'; }`}</style>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Email Address</label>
                        <div className="search-wrapper email-icon">
                          <input
                            placeholder="Enter email"
                            value={newCustomer.email}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, email: e.target.value })
                            }
                            style={{ width: '100%', paddingLeft: '40px' }}
                          />
                          <style>{`.email-icon::before { content: '✉️'; }`}</style>
                        </div>
                      </div>
                    </div>

                    <div className="form-actions mt-20">
                      <button
                        className="btn primary"
                        style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                        onClick={async () => {
                          if (!newCustomer.name || !newCustomer.phone) {
                            import("react-toastify").then(({ toast }) => {
                              toast.error("Please enter Name and Phone number");
                            });
                            return;
                          }

                          try {
                            await createCustomer(newCustomer);
                            setNewCustomer({ name: "", phone: "", email: "" });
                            loadDashboardData();
                            handleViewChange("customers");
                          } catch (err) {
                            console.error("Save failed", err);
                          }
                        }}
                      >
                        💾 Save Customer
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            {showSync && (
              <SyncContactsModal
                onClose={() => setShowSync(false)}
                onImport={(contacts) => {
                  setSyncedContacts(contacts);
                  setShowSync(false);
                  setShowSelectContact(true);
                }}
              />
            )}

            {/* ✅ SELECT CONTACT MODAL */}
            {showSelectContact && (
              <SelectContactModal
                contacts={syncedContacts}
                onClose={() => setShowSelectContact(false)}
                onSelect={(contact) => {
                  setNewCustomer({
                    name: contact.name || "",
                    phone: contact.phone || "", // Google might not give phone, but if it does
                    email: contact.email || "",
                  });
                  setShowSelectContact(false);
                }}
              />
            )}


            {
              activeView === "billing" && (
                <Billing onBack={() => handleViewChange(null)} />
              )
            }

            {
              activeView === "addInvoice" && (
                <Billing quickMode={true} onBack={() => handleViewChange(null)} />
              )
            }

            {
              activeView === "products" && (
                <Products onBack={() => handleViewChange(null)} />
              )
            }

            {
              activeView === "profile" && (
                <RetailerProfile
                  onBack={() => handleViewChange(null)}
                  onLogout={handleLogout}
                />
              )
            }


            {
              activeView === "bills" && (
                <BillList onBack={() => handleViewChange(null)} />
              )
            }

            {/* ✅ NEW ONLINE ORDERS VIEW */}
            {
              activeView === "onlineOrders" && (
                <RetailerOrderManager onBack={() => handleViewChange(null)} />
              )
            }

            {/* ✅ ONLINE KHATHA CUSTOMERS VIEW */}
            {
              activeView === "onlineCustomers" && (
                <CustomerList
                  customers={(() => {
                    // 1. Create a Set of existing customer phones for fast lookup
                    const existingPhones = new Set(
                      customers
                        .map(c => c.phone?.trim())
                        .filter(p => p)
                    );

                    // 2. Extract unique customers from orders with paymentMode === 'KHATHA'
                    // 3. ONLY include those NOT in existingPhones
                    const onlineKhathaOrders = orders.filter(o =>
                      o.paymentMode === 'KHATHA' &&
                      o.customerPhone &&
                      !existingPhones.has(o.customerPhone.trim())
                    );

                    const unknownCustomers = [];
                    const seenPhones = new Set();

                    onlineKhathaOrders.forEach(order => {
                      const phone = order.customerPhone.trim();
                      if (!seenPhones.has(phone)) {
                        seenPhones.add(phone);
                        unknownCustomers.push({
                          id: `online_${order.id}`,
                          name: order.customerName,
                          phone: phone,
                          dueAmount: order.totalAmount,
                          isOnline: true
                        });
                      }
                    });
                    return unknownCustomers;
                  })()}
                  title="Online Khatha Customers"
                  onBack={() => handleViewChange(null)}
                  onSelectCustomer={(c) => {
                    // For now, view details might be limited if they aren't fully registered
                    setSelectedCustomer(c);
                    handleViewChange("details");
                  }}
                />
              )
            }

            {/* ✅ SUPPLIER VIEW */}
            {
              activeView === "supplier" && (
                <SupplierPage onBack={() => handleViewChange(null)} />
              )
            }
          </Suspense>

        </div>
      </main >
    </div >
  );
}


export default Dashboard;

