import { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import { useTranslation } from "react-i18next";

// ✅ LAZY LOAD COMPONENTS
const Dashboard = lazy(() => import("./Dashboard"));
const LoginModal = lazy(() => import("./LoginModal"));
const Landing = lazy(() => import("./Landing"));
const CustomerApp = lazy(() => import("./CustomerApp"));
const AdminApp = lazy(() => import("./AdminApp"));

// ✅ Loading Fallback
import logoIcon from "./assets/logo-icon.png";

// ✅ Loading Fallback
const LoadingScreen = () => (
  <div className="loader-container">
    <img src={logoIcon} alt="Loading..." className="logo-spinner" />
    <p>Loading Khatha...</p>
  </div>
);

function App() {
  useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [loggedIn, setLoggedIn] = useState(
    sessionStorage.getItem("loggedIn") === "true" &&
    !!sessionStorage.getItem("retailerId")
  );

  const [showLoginModal, setShowLoginModal] = useState(false);

  /* ================= MODE SWITCH ================= */
  const [customerAccounts, setCustomerAccounts] = useState(() => {
    const storedList = sessionStorage.getItem("customer_accounts");
    if (storedList) return JSON.parse(storedList);

    const storedSingle = sessionStorage.getItem("customer_retailer");
    if (storedSingle) return [JSON.parse(storedSingle)];

    return [];
  });

  const [appMode, setAppMode] = useState(() => {
    if (sessionStorage.getItem("customer_retailer") || sessionStorage.getItem("customer_accounts")) {
      return "customer";
    }
    return "retailer";
  });

  /* ================= LOGIN MODAL PERSISTENCE ================= */
  const [lastLoginMode, setLastLoginMode] = useState(() =>
    localStorage.getItem("lastLoginMode") || "retailer"
  );

  const handleCustomerStartShopping = () => {
    const hasAccount = localStorage.getItem("hasCustomerAccount") === "true";
    if (hasAccount) {
      setShowLoginModal("customer");
    } else {
      sessionStorage.removeItem("customer_accounts");
      sessionStorage.removeItem("customer_retailer");
      setCustomerAccounts([]);
      setAppMode("customer");
      navigate("/customer");
    }
  };

  const handleLoginClick = (mode) => {
    // If mode is a string (e.g. from Landing feature buttons), use it.
    // Otherwise (e.g. from header Login button event), default to lastLoginMode.
    const targetMode = typeof mode === 'string' ? mode : lastLoginMode;
    setShowLoginModal(targetMode);
  };

  // 🔐 AUTH GUARD & ROUTE REDIRECTION
  useEffect(() => {
    const logged = sessionStorage.getItem("loggedIn");
    const retailerId = sessionStorage.getItem("retailerId");

    if (logged === "true" && !retailerId) {
      sessionStorage.clear();
      setLoggedIn(false);
      navigate("/");
      return;
    }

    // Redirect based on current state and path
    if (loggedIn && location.pathname === "/") {
      navigate(appMode === "customer" ? "/customer" : "/retailer");
    }
  }, [loggedIn, appMode, location.pathname, navigate]);


  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* LANDING PAGE */}
        <Route path="/" element={
          loggedIn ? <Navigate to={appMode === "customer" ? "/customer" : "/retailer"} replace /> : (
            <Landing 
              onLoginClick={handleLoginClick} 
              onBrowseAsCustomer={handleCustomerStartShopping}
              onBrowseAsGuest={() => {
                sessionStorage.removeItem("customer_accounts");
                sessionStorage.removeItem("customer_retailer");
                setCustomerAccounts([]);
                setAppMode("customer");
                navigate("/customer");
              }}
            />
          )
        } />

        {/* RETAILER DASHBOARD */}
        <Route path="/retailer/*" element={
          loggedIn ? <Dashboard /> : <Navigate to="/" replace />
        } />

        {/* CUSTOMER APP */}
        <Route path="/customer/*" element={
          <CustomerApp
            initialAccounts={customerAccounts}
            onLoginRequired={() => setShowLoginModal("customer")}
            onLogout={() => {
              sessionStorage.removeItem("customer_accounts");
              sessionStorage.removeItem("customer_retailer");
              setAppMode("retailer");
              navigate("/");
            }}
          />
        } />

        {/* ADMIN PORTAL */}
        <Route path="/super-admin/*" element={<AdminApp />} />
        <Route path="/admin/*" element={<AdminApp />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showLoginModal && (
        <LoginModal
          initialMode={showLoginModal === 'signup' ? 'retailer' : showLoginModal} // default to retailer if signup selected, user can toggle
          initialSignup={showLoginModal === 'signup'}
          onClose={() => setShowLoginModal(false)}
          onBrowseAsGuest={() => {
            sessionStorage.removeItem("customer_accounts");
            sessionStorage.removeItem("customer_retailer");
            setCustomerAccounts([]);
            setAppMode("customer");
            setShowLoginModal(false);
            navigate("/customer");
          }}
          onSuccess={() => {
            localStorage.setItem("lastLoginMode", "retailer");
            setLastLoginMode("retailer");
            setLoggedIn(true);
            setShowLoginModal(false);
            navigate("/retailer");
          }}
          onCustomerSuccess={(accounts) => {
            localStorage.setItem("lastLoginMode", "customer");
            setLastLoginMode("customer");
            localStorage.setItem("hasCustomerAccount", "true"); // Flag customer account persistence

            // Persist for refresh
            sessionStorage.setItem("customer_accounts", JSON.stringify(accounts));

            if (accounts.length === 1) {
              sessionStorage.setItem("customer_retailer", JSON.stringify(accounts[0]));
            }
            setCustomerAccounts(accounts);
            setAppMode("customer");
            setShowLoginModal(false);
            if (!location.pathname.startsWith("/customer")) {
              navigate("/customer");
            }
          }}
        />
      )}
    </Suspense>
  );
}



export default App;
