import {
    Store,
    ShoppingCart,
    Package,
    LogOut,
    User,
    Globe,
    MapPin,
    PiggyBank
} from "lucide-react";

import logoImg from "./assets/landing/logo.svg";
import "./Sidebar.css";

function CustomerSidebar({
    activeView,
    setActiveView,
    onLogout,
    cartCount,
    isLoggedIn,
    onLoginRequired
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="sidebar-brand-container">
                    <img src={logoImg} alt="Khatha Wallet" className="sidebar-logo" />
                </div>

                <nav>
                    {/* Shop Items removed from here */}

                    {/* ✅ GLOBAL MARKET */}
                    <SidebarItem
                        icon={<Globe size={18} />}
                        label="All Products"
                        active={activeView === "all_products"}
                        onClick={() => setActiveView("all_products")}
                    />

                    <SidebarItem
                        icon={<ShoppingCart size={18} />}
                        label={`Cart (${cartCount || 0})`}
                        active={activeView === "cart"}
                        onClick={() => setActiveView("cart")}
                    />

                    <SidebarItem
                        icon={<Package size={18} />}
                        label="My Orders"
                        active={activeView === "orders"}
                        onClick={() => setActiveView("orders")}
                    />

                    <SidebarItem
                        icon={<PiggyBank size={18} />}
                        label="Savings Scheme"
                        active={activeView === "scheme"}
                        onClick={() => setActiveView("scheme")}
                    />

                    <SidebarItem
                        icon={<User size={18} />}
                        label="Profile"
                        active={activeView === "profile"}
                        onClick={() => setActiveView("profile")}
                    />
                </nav>
            </div>

            <div className="sidebar-bottom">
                {/* Discover Nearby Shops */}
                <button className="logout-btn" style={{ background: '#10b981', color: 'white' }} onClick={() => setActiveView("discoverShops")}>
                    <MapPin size={16} />
                    Discover Nearby Shops
                </button>

                {/* Switch Shop Option */}
                <button className="logout-btn" onClick={() => setActiveView("switchShop")}>
                    <Store size={16} />
                    My Shops
                </button>

                {/* ✅ Requested Shop Items Button */}
                <button className="logout-btn" onClick={() => setActiveView("products")}>
                    <ShoppingCart size={16} />
                    Shop Items
                </button>



                {isLoggedIn ? (
                    <button className="logout-btn" onClick={onLogout}>
                        <LogOut size={16} />
                        Logout
                    </button>
                ) : (
                    <button className="logout-btn" onClick={onLoginRequired} style={{ background: '#2563eb', color: 'white' }}>
                        <LogOut size={16} />
                        Login / Sign Up
                    </button>
                )}
            </div>
        </aside>
    );
}

function SidebarItem({ icon, label, active, onClick }) {
    return (
        <div
            className={`sidebar-item ${active ? "active" : ""}`}
            onClick={onClick}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

export default CustomerSidebar;
