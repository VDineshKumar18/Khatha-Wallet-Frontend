import {
  LayoutDashboard,
  Users,
  UserPlus,
  Receipt,
  Package,
  User,
  LogOut,
  FileText,
  Truck,
  PiggyBank, // ✅ New Icon
  FilePlus,
} from "lucide-react";

import logoImg from "./assets/landing/logo.svg";
import "./Sidebar.css";

function Sidebar({
  activeView,
  setActiveView,
  onLogout,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* <h2 className="brand">Khatha Wallet</h2> */}
        <div className="sidebar-brand-container">
          <img src={logoImg} alt="Khatha Wallet" className="sidebar-logo" />
        </div>

        <nav>
          <SidebarItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={!activeView}
            onClick={() => setActiveView(null)}
          />

          <SidebarItem
            icon={<Users size={18} />}
            label="Customers"
            active={activeView === "customers"}
            onClick={() => setActiveView("customers")}
          />

          {/* ✅ SCHEME CUSTOMERS LINK */}
          <SidebarItem
            icon={<PiggyBank size={18} />}
            label="Savings Scheme"
            active={activeView === "scheme"}
            onClick={() => setActiveView("scheme")}
          />

          {/* ✅ ONLINE ORDERS LINK */}
          <SidebarItem
            icon={<Package size={18} />}
            label="Online Orders"
            active={activeView === "onlineOrders"}
            onClick={() => setActiveView("onlineOrders")}
          />

          {/* ✅ ONLINE KHATHA CUSTOMERS LINK */}
          <SidebarItem
            icon={<Users size={18} />}
            label="Online Customers"
            active={activeView === "onlineCustomers"}
            onClick={() => setActiveView("onlineCustomers")}
          />

          <SidebarItem
            icon={<UserPlus size={18} />}
            label="Add Customer"
            active={activeView === "addCustomer"}
            onClick={() => setActiveView("addCustomer")}
          />

          <SidebarItem
            icon={<Receipt size={18} />}
            label="Billing"
            active={activeView === "billing"}
            onClick={() => setActiveView("billing")}
          />

          <SidebarItem
            icon={<FileText size={18} />}
            label="Bills"
            active={activeView === "bills"}
            onClick={() => setActiveView("bills")}
          />

          <SidebarItem
            icon={<FilePlus size={18} />}
            label="Add Invoice"
            active={activeView === "addInvoice"}
            onClick={() => setActiveView("addInvoice")}
          />

          <SidebarItem
            icon={<Package size={18} />}
            label="Products"
            active={activeView === "products"}
            onClick={() => setActiveView("products")}
          />

          <SidebarItem
            icon={<Truck size={18} />}
            label="Supplier"
            active={activeView === "supplier"}
            onClick={() => setActiveView("supplier")}
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


        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`sidebar-item ${active ? "active" : ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default Sidebar;
