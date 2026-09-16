import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import "./LoginModal.css";
import { sendOtp, verifyOtp, signupRetailer, sendCustomerOtp, verifyCustomerOtp } from "./api/authApi";
import logoIcon from "./assets/logo-icon.png";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Simple JWT decoder for Google ID Tokens
const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

function LoginModal({ onClose, onSuccess, onCustomerSuccess, onBrowseAsGuest, initialMode = "retailer", initialSignup = false }) {
  const [mode, setMode] = useState(initialMode); // 'retailer' | 'customer'

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [showSignup, setShowSignup] = useState(initialSignup);
  const [registeredConflict, setRegisteredConflict] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const googleBtnRef = useRef(null);

  // OTP Resend Timer Effect
  useEffect(() => {
    let interval = null;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpSent, timer]);

  // Initialize Google Sign-In
  // Disable Google Sign-In for now as requested
  /*
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320, // Use numeric value to fix warning
          text: "continue_with",
          shape: "rectangular",
        });
      }
    }
  }, [showSignup, mode]); // Re-render when switching modes or signup view
  */

  const handleGoogleCredentialResponse = async (response) => {
    try {
      setLoading(true);
      setError("");
      const userData = decodeJwt(response.credential);
      if (!userData || !userData.email) throw new Error("Google Authentication Failed");

      const gEmail = userData.email;
      const gName = userData.name || "";

      setEmail(gEmail);
      setName(gName);

      // CHECK IF REGISTERED
      try {
        if (mode === "retailer") {
          await sendOtp(gEmail);
          toast.success(`Google Account Recognized: ${gEmail}`);
          setOtpSent(true);
          setTimer(30);

          // Simulation: Automatically verify a dummy OTP
          setOtp("123456");

          // Re-running handleLogin logic directly with gEmail to avoid state lag
          const loginRes = await verifyOtp(gEmail, "123456");
          const data = loginRes?.data || loginRes;
          const retailerId = data?.retailerId || data?.id || data?.data?.retailerId;

          if (!retailerId) throw new Error("Verification Failed");

          sessionStorage.setItem("loggedIn", "true");
          sessionStorage.setItem("retailerId", retailerId);
          sessionStorage.setItem("retailerEmail", data.email || gEmail);
          if (data.name || data.retailerName) {
            sessionStorage.setItem("retailerName", data.name || data.retailerName);
          }
          onSuccess();
        } else {
          // Customer flow
          const res = await sendCustomerOtp(gEmail);
          setOtpSent(true);
          setTimer(30);
          // For customer, we don't auto-login unless we verify. 
          // Let them enter OTP for now or wait for backend support.
        }
      } catch (err) {
        // Not registered -> Redirect to Signup
        toast.info("Google Account verified. Please complete your profile.");
        setShowSignup(true);
        setOtpSent(false);
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ================= SEND OTP =================
  const handleSendOtp = async () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      if (mode === "retailer") {
        await sendOtp(email);
      } else {
        const res = await sendCustomerOtp(email);
        // OTP auto-fill removed for production/user testing
      }

      setOtpSent(true);
      setShowSignup(false);
      setTimer(30);
    } catch (err) {
      if (mode === "retailer") {
        setOtpSent(false);
        setShowSignup(true);
        setError(err?.message || "Email not registered. Please sign up.");
      } else {
        // ✅ CUSTOMER: If not found, show registration fields immediately
        if (err.status === 404 || err.message?.includes("not registered") || err.message?.includes("Email not registered")) {
          setOtpSent(false);
          setShowSignup(true);
          setMode("customer_register");
          setError("New Customer? Enter details to join.");
        } else {
          setError(err?.message || "Login failed");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGIN =================
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      if (mode === "retailer") {
        const res = await verifyOtp(email, otp);
        const data = res?.data || res;

        const retailerId =
          data?.retailerId || data?.id || data?.data?.retailerId;

        if (!retailerId) {
          throw new Error("Invalid OTP");
        }

        const retailerName = data.name || data.retailerName || "";

        sessionStorage.setItem("loggedIn", "true");
        sessionStorage.setItem("retailerId", retailerId);
        sessionStorage.setItem("retailerEmail", data.email || email);
        if (retailerName) {
          sessionStorage.setItem("retailerName", retailerName);
        }

        onSuccess(); // Retailer Success
      } else {
        // Customer Login
        const response = await verifyCustomerOtp(email, otp);

        // ✅ CHECK IF NEW USER
        if (response.isNewUser) {
          setOtpSent(false); // Hide OTP field
          setShowSignup(true); // Reuse signup state for "Join Shop" flow
          setMode("customer_register"); // Special internal mode
          return;
        }

        onCustomerSuccess(response); // Customer Success (pass accounts list)
      }

    } catch (err) {
      setError(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // ================= SIGN UP (Retailer) / REGISTER (Customer) =================
  const handleSignup = async () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setRegisteredConflict(false);

      // RETAILER SIGNUP
      if (mode === "retailer") {
        try {
          await signupRetailer({ email, name, phone });
          toast.success("Signup successful. Please login.");
          setShowSignup(false);
          setOtpSent(false);
        } catch (err) {
          if (err.message && (err.message.includes("already registered") || err.status === 400)) {
            setRegisteredConflict(true);
            setError("Email already registered. Continue with login.");
          } else {
            setError(err.message || "Signup failed");
          }
        }
        return;
      }

      // CUSTOMER REGISTRATION
      if (mode === "customer_register") {
        if (!name || !phone) {
          throw new Error("Name and Phone are required");
        }
        onCustomerSuccess({ isNewUser: true, email, name, phone });
      }

    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // This function is now legacy as GSI handles its own click, 
    // but we can keep it as a fallback or remove it.
    // For now, GSI renders its own button in the ref.
  };

  return ReactDOM.createPortal(
    <div className="login-page-container">
      {/* 🌑 OVERLAY BACKGROUND */}
      <div className="login-modal-overlay" onClick={onClose} />

      {/* 📦 MODAL CARD */}
      <div className="glass-card login-modal-card animate-scale">
        {/* 🔴 CLOSE BUTTON (Absolute Top Right of Card) */}
        <button className="page-close-btn" onClick={onClose}>✕</button>

        {/* 🎨 LEFT PANEL (Branding) */}
        <div className="login-left-panel">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon-box">🔷</div>
              <h2>Khatha Wallet</h2>
            </div>

            <h1 className="hero-title">
              The Digital Supermarket<br />for Your Town.
            </h1>

            <div className="login-features-list">
              <div className="login-feature-item">
                <span className="login-feature-icon">🛍️</span>
                <div>
                  <strong>Click & Collect</strong>
                  <p>Families order from home, pick up when ready.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">🏪</span>
                <div>
                  <strong>Your Shop Online</strong>
                  <p>Show your catalog to the whole town instantly.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">📒</span>
                <div>
                  <strong>Digital Khatha</strong>
                  <p>Manage customer credits & billing in one place.</p>
                </div>
              </div>
            </div>

            {/* Background decoration (optional) */}
            <div className="bg-decoration"></div>
          </div>
        </div>

        {/* 📝 RIGHT PANEL (Login Form) */}
        <div className="login-right-panel">
          <div className="login-form-wrapper">

            <div className="form-header">
              <h2>Login</h2>
              <p>Welcome back! Please enter your details to continue.</p>
            </div>

            {/* TOGGLE SWITCH */}
            <div className="role-toggle">
              <button
                className={mode === 'retailer' ? 'active' : ''}
                onClick={() => {
                  setMode("retailer");
                  localStorage.setItem("lastLoginMode", "retailer");
                  setOtpSent(false);
                  setError("");
                  setTimer(0);
                }}
              >
                Retailer
              </button>
              <button
                className={mode === 'customer' || mode === 'customer_register' ? 'active' : ''}
                onClick={() => {
                  setMode("customer");
                  localStorage.setItem("lastLoginMode", "customer");
                  setOtpSent(false);
                  setError("");
                  setTimer(0);
                }}
              >
                Customer
              </button>
            </div>

            {/* FORM INPUTS */}
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent || loading}
                />
              </div>
            </div>

            {otpSent && (
              <div className="input-group animate-slide-down">
                <label>OTP Code</label>
                <div className="otp-container">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      className="otp-box"
                      type="text"
                      maxLength={1}
                      value={otp[index] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isNaN(val)) return;

                        const newOtp = otp.split('');
                        while (newOtp.length < 6) newOtp.push(''); // Ensure length
                        newOtp[index] = val;
                        const finalOtp = newOtp.join('').slice(0, 6);
                        setOtp(finalOtp);

                        // Auto focus next
                        if (val && index < 5) {
                          document.getElementById(`otp-input-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[index] && index > 0) {
                          document.getElementById(`otp-input-${index - 1}`)?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").slice(0, 6);
                        if (pasted && /^\d+$/.test(pasted)) {
                          setOtp(pasted);
                        }
                      }}
                      disabled={loading}
                    />
                  ))}
                </div>
                <div className="otp-resend-container">
                  {timer > 0 ? (
                    <span className="otp-timer">Resend OTP in {timer}s</span>
                  ) : (
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Resend OTP"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SIGNUP FIELDS */}
            {showSignup && (mode === "retailer" || mode === "customer_register") && (
              <div className="signup-fields animate-slide-down">
                <div className="input-group">
                  <label>Full Name</label>
                  <input
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            {/* ACTION BUTTONS */}
            <div className="action-buttons">
              {!otpSent && !showSignup && (
                <button className="primary-btn" onClick={handleSendOtp} disabled={loading || !email}>
                  {loading ? "Sending..." : "Send OTP"} →
                </button>
              )}

              {otpSent && (
                <button className="primary-btn" onClick={handleLogin} disabled={loading || otp.length < 6}>
                  {loading ? "Verifying..." : "Login"}
                </button>
              )}

              {showSignup && (
                <div className="signup-actions animate-slide-down">
                  <button
                    className="primary-btn"
                    onClick={handleSignup}
                    disabled={loading || !name || !phone}
                  >
                    {mode === 'customer_register' ? 'Verify & Join' : 'Sign Up'}
                  </button>

                  {registeredConflict && (
                    <button
                      className="link-btn full-width"
                      style={{ marginTop: '12px' }}
                      onClick={() => {
                        setShowSignup(false);
                        setOtpSent(false);
                        setError("");
                        setRegisteredConflict(false);
                      }}
                    >
                      Already registered? Continue with login
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 
            <div className="divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <div className="social-buttons">
              <div ref={googleBtnRef} className="google-signin-wrapper"></div>
            </div> 
            */}

            <p className="footer-link">
              {showSignup ? (
                <>
                  Already have an account?{" "}
                  <span
                    className="link-text"
                    onClick={() => {
                      setShowSignup(false);
                      setOtpSent(false);
                      setError("");
                      setRegisteredConflict(false);
                    }}
                  >
                    Login
                  </span>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <span
                    className="link-text"
                    onClick={() => {
                      setShowSignup(true);
                      setError("");
                    }}
                  >
                    Start free trial
                  </span>
                </>
              )}
            </p>

            {(mode === "customer" || mode === "customer_register") && (
              <p className="footer-link" style={{ marginTop: '12px' }}>
                Just looking? <span className="link-text" style={{ color: '#2563eb' }} onClick={onBrowseAsGuest}>Browse as Guest</span>
              </p>
            )}

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default LoginModal;
