import { useState, useEffect, Suspense, lazy } from "react";
import { Store, ShoppingCart, Package, User, Menu, Globe } from "lucide-react"; // ✅ Import Icons
import CustomerLogin from "./CustomerLogin";
import ShopSelection from "./ShopSelection";
import CustomerSidebar from "./CustomerSidebar";
import axiosClient from "./api/axiosClient";
import { toast } from "react-toastify"; // ✅ Use react-toastify
import "./CustomerApp.css";
import logoIcon from "./assets/landing/logo_icon.svg";

// ✅ LAZY LOAD SUB-COMPONENTS
const CustomerMarketplace = lazy(() => import("./CustomerMarketplace"));
const CustomerCart = lazy(() => import("./CustomerCart"));
const CustomerOrders = lazy(() => import("./CustomerOrders"));
const CustomerProfile = lazy(() => import("./CustomerProfile"));
const CustomerScheme = lazy(() => import("./CustomerScheme")); // ✅ New Component

import { useNavigate, useLocation } from "react-router-dom"; // ✅ NEW

function CustomerApp({ onLogout, initialAccounts, onLoginRequired }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Mapping Functions
    const getPathFromView = (view) => {
        switch (view) {
            case 'products': return '/customer/shop';
            case 'all_products': return '/customer/market';
            case 'cart': return '/customer/cart';
            case 'orders': return '/customer/orders';
            case 'profile': return '/customer/profile';
            case 'scheme': return '/customer/savings';
            case 'switchShop': return '/customer/select-shop';
            case 'discoverShops': return '/customer/discover';
            default: return '/customer';
        }
    };

    const getViewFromPath = (path) => {
        if (path.includes('/customer/shop')) return 'products';
        if (path.includes('/customer/market')) return 'all_products';
        if (path.includes('/customer/cart')) return 'cart';
        if (path.includes('/customer/orders')) return 'orders';
        if (path.includes('/customer/profile')) return 'profile';
        if (path.includes('/customer/savings')) return 'scheme';
        if (path.includes('/customer/select-shop')) return 'switchShop';
        if (path.includes('/customer/discover')) return 'discoverShops';

        // Default logic
        if (!initialAccounts || (Array.isArray(initialAccounts) && initialAccounts.length === 0) || initialAccounts?.isNewUser) {
            return initialAccounts?.isNewUser ? "discoverShops" : "all_products";
        }
        return "products";
    };

    // Auth & Routing State
    const [step, setStep] = useState("MARKETPLACE"); // ALWAYS GO TO DASHBOARD

    const [accounts, setAccounts] = useState(() => {
        if (Array.isArray(initialAccounts) && initialAccounts.length > 0) return initialAccounts;
        const stored = sessionStorage.getItem("customer_accounts");
        return stored ? JSON.parse(stored) : [];
    });

    // Auto-select first account if available
    const [selectedAccount, setSelectedAccount] = useState(() => {
        const stored = JSON.parse(sessionStorage.getItem("customer_retailer") || "null");
        if (stored) return stored;
        if (Array.isArray(initialAccounts) && initialAccounts.length > 0) return initialAccounts[0];
        return null;
    });

    // Guest check
    const isLoggedIn = selectedAccount && !selectedAccount.isGuest;

    // New User Data
    const newUserData = (initialAccounts && initialAccounts.isNewUser) ? initialAccounts : null;

    // Dashboard State synchronized with URL
    const [activeView, setActiveView] = useState(getViewFromPath(location.pathname));

    useEffect(() => {
        const view = getViewFromPath(location.pathname);
        if (view !== activeView) {
            setActiveView(view);
        }
    }, [location.pathname]);

    // Sync initialAccounts prop with state
    useEffect(() => {
        if (Array.isArray(initialAccounts) && initialAccounts.length > 0) {
            setAccounts(initialAccounts);
            
            // Auto-select the first account if we don't have one, or if the current one is guest
            const storedRetailer = JSON.parse(sessionStorage.getItem("customer_retailer") || "null");
            if (storedRetailer && !storedRetailer.isGuest) {
                setSelectedAccount(storedRetailer);
            } else {
                setSelectedAccount(initialAccounts[0]);
                sessionStorage.setItem("customer_retailer", JSON.stringify(initialAccounts[0]));
            }
        }
    }, [initialAccounts]);

    const handleViewChange = (view) => {
        const restrictedViews = ['orders', 'profile', 'scheme', 'switchShop'];
        if (restrictedViews.includes(view) && !isLoggedIn) {
            toast.info("Please login to access this feature.");
            onLoginRequired();
            return;
        }
        navigate(getPathFromView(view));
    };

    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768); // ✅ Responsive Init




    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Data State
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => {
        const stored = sessionStorage.getItem("customer_cart");
        return stored ? JSON.parse(stored) : {};
    });

    useEffect(() => {
        sessionStorage.setItem("customer_cart", JSON.stringify(cart));
    }, [cart]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        if (selectedAccount) {
            loadProducts();
            loadOrders();
        }
    }, [selectedAccount]); // Reload if account changes

    const loadProducts = async () => {
        try {
            const res = await axiosClient.get("/products", {
                params: { retailerId: selectedAccount.retailerId }
            });
            setProducts(res.data || []);
        } catch (err) {
            console.error("Failed to load products", err);
        }
    };

    const loadOrders = async () => {
        if (!selectedAccount || selectedAccount.isGuest) return;
        try {
            const res = await axiosClient.get(`/orders/customer/${selectedAccount.customerId}`);
            setOrders(res.data || []);
        } catch (err) {
            console.error("Failed to load orders", err);
        }
    };

    // Cart Actions
    const addToCart = (product) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[product.barcode]) {
                newCart[product.barcode].qty += 1;
            } else {
                newCart[product.barcode] = { ...product, qty: 1 };
            }
            return newCart;
        });
        toast.success("Added to cart"); // ✅ Use toast.success
    };

    const removeFromCart = (barcode) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (!newCart[barcode]) return prev;
            if (newCart[barcode].qty > 1) {
                newCart[barcode].qty -= 1;
            } else {
                delete newCart[barcode];
            }
            return newCart;
        });
    };

    const clearCart = () => setCart({});

    // Auth Actions
    const handleLoginSuccess = (retailerList) => {
        setAccounts(retailerList);
        if (retailerList.length > 0) {
            selectShop(retailerList[0]);
        } else {
            handleViewChange("switchShop");
        }
    };

    const selectShop = (account) => {
        setAccounts((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            const exists = current.find((a) => a.retailerId === account.retailerId);
            if (!exists) {
                const updated = [...current, account];
                sessionStorage.setItem("customer_accounts", JSON.stringify(updated));
                return updated;
            }
            return current;
        });
        sessionStorage.setItem("customer_retailer", JSON.stringify(account));
        setSelectedAccount(account);
        handleViewChange("products"); // Go to products after selection
    };

    const handleLogout = () => {
        sessionStorage.removeItem("customer_retailer");
        sessionStorage.removeItem("customer_accounts");
        setSelectedAccount(null);
        setStep("LOGIN");
        onLogout();
    };

    // Render Logic
    if (step === "LOGIN") {
        return (
            <div className="login-modal-overlay">
                <div className="login-modal">
                    <h2>Session Expired</h2>
                    <button onClick={onLogout}>Go Back</button>
                </div>
            </div>
        );
    }

    // REMOVED: if (step === "SELECT_SHOP") ...

    // MAIN DASHBOARD LAYOUT
    // MAIN DASHBOARD LAYOUT
    return (
        <div className="app-layout">
            {/* ================= MOBILE STICKY HEADER ================= */}
            <div className="mobile-header mobile-only">
                <div className="mobile-header-left">
                    <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Open Navigation Menu">
                        <Menu size={22} />
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <img src={logoIcon} alt="Logo" style={{ height: "30px", width: "auto" }} />
                        <div className="mobile-logo-text">Khatha<span>Wallet</span></div>
                    </div>
                </div>
                <div className="mobile-header-right">
                    <button className="icon-btn profile-pill" onClick={() => handleViewChange('profile')} aria-label="Go to My Profile">
                        <User size={20} />
                    </button>
                </div>
            </div>

            {/* ✅ SIDEBAR (Hidden on mobile unless open) */}
            <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <CustomerSidebar
                    activeView={activeView}
                    setActiveView={handleViewChange}
                    onLogout={handleLogout}
                    cartCount={Object.values(cart).reduce((s, i) => s + i.qty, 0)}
                    isLoggedIn={isLoggedIn}
                    onLoginRequired={onLoginRequired}
                />
            </div>

            {/* ✅ MOBILE OVERLAY BACKDROP */}
            {sidebarOpen && (
                <div
                    className="mobile-backdrop mobile-only"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', top: '64px', left: 0, width: '100%', height: 'calc(100% - 64px)',
                        background: 'rgba(0,0,0,0.5)', zIndex: 998
                    }}
                />
            )}

            {/* ✅ MOBILE BOTTOM NAV (Hide when sidebar is open) */}
            {!sidebarOpen && (
                <div className="bottom-nav mobile-only">
                    <button
                        className={`nav-item ${activeView === 'products' ? 'active' : ''}`}
                        onClick={() => handleViewChange('products')}
                        aria-label="Shop Products"
                    >
                        <Store size={20} />
                        <span>Shop</span>
                    </button>

                    <button
                        className={`nav-item ${activeView === 'cart' ? 'active' : ''}`}
                        onClick={() => handleViewChange('cart')}
                        aria-label={`View Cart (${Object.values(cart).reduce((s, i) => s + i.qty, 0)} items)`}
                    >
                        <div style={{ position: 'relative' }}>
                            <ShoppingCart size={20} />
                            {Object.keys(cart).length > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -8,
                                    background: 'red', color: 'white',
                                    fontSize: '9px', borderRadius: '50%', padding: '2px 4px'
                                }}>
                                    {Object.values(cart).reduce((s, i) => s + i.qty, 0)}
                                </span>
                            )}
                        </div>
                        <span>Cart</span>
                    </button>

                    <button
                        className={`nav-item ${activeView === 'orders' ? 'active' : ''}`}
                        onClick={() => handleViewChange('orders')}
                        aria-label="My Orders"
                    >
                        <Package size={20} />
                        <span>Orders</span>
                    </button>

                    <button
                        className={`nav-item ${activeView === 'all_products' ? 'active' : ''}`}
                        onClick={() => handleViewChange('all_products')}
                        aria-label="Discover All Products"
                    >
                        <Globe size={20} />
                        <span>All Products</span>
                    </button>

                    <button
                        className="nav-item"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open More Options"
                    >
                        <Menu size={20} />
                        <span>Menu</span>
                    </button>
                </div>
            )}

            <main className={`main-content ${!sidebarOpen ? 'full' : ''}`}>
                <div className="dashboard-root">
                    {/* Hide Main Header on Profile Page since Profile has its own header */}
                    {activeView !== 'profile' && (
                        <div className="premium-hero-banner">
                            <div className="hero-content">
                                <h2 className="fade-in">Welcome Back 👋</h2>
                            </div>
                            <div className="hero-visual">
                                <div className="floating-blob"></div>
                            </div>
                        </div>
                    )}

                    {/* ✅ WRAP CONTENT IN SUSPENSE */}
                    <Suspense fallback={<div className="loader">Loading...</div>}>
                        {activeView === "products" && (
                            <CustomerMarketplace
                                products={products}
                                cart={cart}
                                addToCart={addToCart}
                                removeFromCart={removeFromCart}
                                retailerName={selectedAccount?.retailerName}
                                retailerIsVerified={selectedAccount?.retailerIsVerified}
                            />
                        )}

                        {/* ✅ GLOBAL MARKETPLACE */}
                        {activeView === "all_products" && (
                            <CustomerMarketplace
                                isGlobal={true}
                                cart={cart}
                                addToCart={addToCart}
                                removeFromCart={removeFromCart}
                            />
                        )}

                        {activeView === "cart" && (
                            <CustomerCart
                                cart={cart}
                                account={selectedAccount}
                                addToCart={addToCart}
                                removeFromCart={removeFromCart}
                                clearCart={clearCart}
                                onLoginRequired={onLoginRequired}
                                onOrderPlaced={() => {
                                    loadOrders();
                                    handleViewChange("orders");
                                }}
                            />
                        )}

                        {activeView === "orders" && (
                            isLoggedIn ? (
                                <CustomerOrders
                                    orders={orders}
                                    onRefresh={loadOrders}
                                    currentUserId={selectedAccount?.customerId}
                                />
                            ) : (
                                <div className="glass-card login-prompt-card" style={{ textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
                                    <h3>Login Required</h3>
                                    <p style={{ color: '#64748b', margin: '10px 0 20px' }}>Please log in to view your orders.</p>
                                    <button className="primary-btn" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={onLoginRequired}>Login / Sign Up</button>
                                </div>
                            )
                        )}

                        {activeView === "profile" && (
                            isLoggedIn && selectedAccount ? (
                                <CustomerProfile customerId={selectedAccount.customerId} />
                            ) : (
                                <div className="glass-card login-prompt-card" style={{ textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
                                    <h3>Login Required</h3>
                                    <p style={{ color: '#64748b', margin: '10px 0 20px' }}>Please log in to view your profile.</p>
                                    <button className="primary-btn" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={onLoginRequired}>Login / Sign Up</button>
                                </div>
                            )
                        )}

                        {activeView === "scheme" && (
                            isLoggedIn && selectedAccount ? (
                                <CustomerScheme
                                    customer={selectedAccount}
                                    onEnroll={async (retailerId) => {
                                        // 1. Check if we already have an account with this retailer
                                        const existingAccount = accounts.find(a => a.retailerId === retailerId);

                                        let accountToEnroll = existingAccount;

                                        if (!existingAccount) {
                                            // 2. If not, register first
                                            try {
                                                // Trigger normal shop selection logic to register
                                                // This is a bit tricky since selectShop just sets state.
                                                // We need to call the registration API manually here?
                                                // Actually, simplest is to switch shop to that retailer (which handles registration internally in ShopSelection if we used that)
                                                // But here we are getting retailerId from ShopSelection.

                                                // Let's rely on a helper or just do it here:
                                                // We need access to registerCustomer from authApi
                                                const { registerCustomer } = await import("./api/authApi");
                                                const res = await registerCustomer({
                                                    email: selectedAccount.email, // Use current email
                                                    name: selectedAccount.customerName,
                                                    phone: selectedAccount.phone || "0000000000",
                                                    retailerId: retailerId.toString()
                                                });

                                                accountToEnroll = res[0];

                                                // Update accounts list
                                                setAccounts(prev => [...prev, accountToEnroll]);

                                            } catch (err) {
                                                toast.error("Failed to join shop: " + err.message);
                                                return;
                                            }
                                        }

                                        // 3. Enroll in Scheme
                                        try {
                                            const { updateCustomerScheme } = await import("./api/customerApi");

                                            // ✅ USE RETAILER CONFIG for Scheme
                                            const targetAmount = accountToEnroll.schemeTargetAmount || 6000.0;
                                            const monthlyAmount = accountToEnroll.schemeMonthlyAmount || 500.0;

                                            await updateCustomerScheme(accountToEnroll.customerId, {
                                                isSchemeActive: true,
                                                schemeStartDate: new Date().toISOString().split('T')[0],
                                                schemeMonthlyAmount: monthlyAmount,
                                                schemeTargetAmount: targetAmount,
                                                schemeCollectedAmount: 0.0,
                                                schemeMonthsPaid: 0
                                            });

                                            toast.success("Successfully enrolled in Savings Scheme!");

                                            // 4. Switch to that shop and show scheme
                                            selectShop({
                                                ...accountToEnroll,
                                                isSchemeActive: true,
                                                schemeCollectedAmount: 0.0,
                                                schemeTargetAmount: targetAmount,
                                                schemeMonthlyAmount: monthlyAmount, // Ensure state has this
                                                schemeMonthsPaid: 0
                                            });
                                            handleViewChange("scheme");

                                        } catch (err) {
                                            toast.error("Enrollment failed: " + err.message);
                                        }
                                    }}
                                />
                            ) : (
                                <div className="glass-card login-prompt-card" style={{ textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
                                    <h3>Login Required</h3>
                                    <p style={{ color: '#64748b', margin: '10px 0 20px' }}>Please log in to view and enroll in savings schemes.</p>
                                    <button className="primary-btn" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={onLoginRequired}>Login / Sign Up</button>
                                </div>
                            )
                        )}

                        {activeView === "switchShop" && (
                            <ShopSelection
                                accounts={accounts}
                                onSelectShop={selectShop}
                                isModal={false}
                                isRegistration={false}
                                newCustomerData={newUserData}
                            />
                        )}

                        {activeView === "discoverShops" && (
                            <ShopSelection
                                accounts={[]}
                                onSelectShop={selectShop}
                                isModal={false}
                                isRegistration={true}
                                newCustomerData={newUserData}
                            />
                        )}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

export default CustomerApp;
