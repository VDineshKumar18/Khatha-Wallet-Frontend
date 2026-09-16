import { useState, useEffect } from "react";
import { X, CreditCard, Smartphone, Building, ShieldCheck, CheckCircle } from "lucide-react";
import "./PaymentGatewayModal.css";

function PaymentGatewayModal({ amount, customerName, customerEmail, retailerId, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState("card"); // card, upi, netbanking
    const [loading, setLoading] = useState(false);
    const [otpStep, setOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [successState, setSuccessState] = useState(false);
    const [txnRef, setTxnRef] = useState("");

    // Form inputs
    const [cardName, setCardName] = useState(customerName || "");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [focusedField, setFocusedField] = useState("");

    const [upiId, setUpiId] = useState("");
    const [selectedBank, setSelectedBank] = useState("");

    // Brand detection
    const getCardBrand = (num) => {
        const cleanNum = num.replace(/\D/g, "");
        if (cleanNum.startsWith("4")) return "VISA";
        if (cleanNum.startsWith("5")) return "MASTERCARD";
        if (cleanNum.startsWith("3")) return "AMEX";
        return "GENERIC";
    };

    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 16) value = value.slice(0, 16);
        // Format with spaces
        const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
        setCardNumber(formatted);
    };

    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 4) value = value.slice(0, 4);
        if (value.length > 2) {
            setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
        } else {
            setCardExpiry(value);
        }
    };

    const handleCvvChange = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 3) value = value.slice(0, 3);
        setCardCvv(value);
    };

    const triggerPayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate connecting to bank gateway
        setTimeout(() => {
            setLoading(false);
            if (activeTab === "card") {
                setOtpStep(true);
            } else {
                // Directly complete for UPI/Netbanking simulation
                completeCharge();
            }
        }, 2000);
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        if (otpCode.length < 6) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setOtpStep(false);
            completeCharge();
        }, 1500);
    };

    const completeCharge = async () => {
        setLoading(true);
        try {
            const body = {
                amount,
                customerEmail: customerEmail || "guest@khatha.com",
                customerName: customerName || "Guest",
                paymentMethod: activeTab.toUpperCase(),
                retailerId,
                cardNumber: cardNumber,
                upiId: upiId
            };

            const res = await fetch("http://localhost:8080/api/payments/gateway/charge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                setTxnRef(data.transactionRef);
                setSuccessState(true);
                setTimeout(() => {
                    onSuccess(data.transactionRef);
                }, 2000);
            } else {
                alert(data.message || "Payment Failed");
            }
        } catch (err) {
            console.error("Gateway error", err);
            alert("Network error: Failed to process payment");
        } finally {
            setLoading(false);
        }
    };

    if (successState) {
        return (
            <div className="gateway-modal-overlay">
                <div className="gateway-modal-card success-screen">
                    <div className="success-icon-wrapper">
                        <CheckCircle size={60} className="success-check" />
                    </div>
                    <h3>Payment Successful!</h3>
                    <p className="success-amount">₹ {amount}</p>
                    <p className="success-ref">Ref: {txnRef}</p>
                    <span className="success-tag">Securely Redirecting...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="gateway-modal-overlay">
            <div className="gateway-modal-card">
                <div className="gateway-header">
                    <div className="gateway-logo">
                        <ShieldCheck size={24} className="shield-icon" />
                        <span>Antigravity Pay</span>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="gateway-amount-banner">
                    <span className="label">Order Amount</span>
                    <span className="value">₹ {amount}</span>
                </div>

                {otpStep ? (
                    <form onSubmit={handleOtpSubmit} className="otp-step-form">
                        <h4 style={{ margin: "0 0 10px 0" }}>OTP Authentication</h4>
                        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                            Enter the 6-digit OTP code sent to your registered mobile number ending in **42. (Use code 123456)
                        </p>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            style={{
                                width: "100%",
                                padding: "14px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontSize: "20px",
                                letterSpacing: "8px",
                                outline: "none",
                                marginBottom: "20px"
                            }}
                            required
                        />
                        <button type="submit" className="pay-submit-btn" disabled={loading || otpCode.length < 6}>
                            {loading ? "Verifying..." : "Verify & Authorize"}
                        </button>
                    </form>
                ) : (
                    <>
                        {/* Tab Headers */}
                        <div className="gateway-tabs">
                            <button
                                className={`tab-btn ${activeTab === "card" ? "active" : ""}`}
                                onClick={() => setActiveTab("card")}
                            >
                                <CreditCard size={18} /> Card
                            </button>
                            <button
                                className={`tab-btn ${activeTab === "upi" ? "active" : ""}`}
                                onClick={() => setActiveTab("upi")}
                            >
                                <Smartphone size={18} /> UPI
                            </button>
                            <button
                                className={`tab-btn ${activeTab === "netbanking" ? "active" : ""}`}
                                onClick={() => setActiveTab("netbanking")}
                            >
                                <Building size={18} /> Net Banking
                            </button>
                        </div>

                        <form onSubmit={triggerPayment} className="gateway-body">
                            {activeTab === "card" && (
                                <div className="tab-content card-payment">
                                    {/* Visual Card Preview */}
                                    <div className={`visual-card ${focusedField === "cvv" ? "flipped" : ""}`}>
                                        <div className="card-face card-front">
                                            <div className="chip"></div>
                                            <div className="brand">{getCardBrand(cardNumber)}</div>
                                            <div className="number">{cardNumber || "•••• •••• •••• ••••"}</div>
                                            <div className="details">
                                                <div className="holder">
                                                    <span>CARDHOLDER</span>
                                                    <div>{cardName.toUpperCase() || "NAME SURNAME"}</div>
                                                </div>
                                                <div className="expiry">
                                                    <span>EXPIRES</span>
                                                    <div>{cardExpiry || "MM/YY"}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-face card-back">
                                            <div className="magnetic-strip"></div>
                                            <div className="signature-area">
                                                <span className="cvv-display">{cardCvv || "•••"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Form */}
                                    <div className="form-group">
                                        <label>Cardholder Name</label>
                                        <input
                                            type="text"
                                            placeholder="Name as printed on card"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                            onFocus={() => setFocusedField("name")}
                                            onBlur={() => setFocusedField("")}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="4111 1111 1111 1111"
                                            value={cardNumber}
                                            onChange={handleCardNumberChange}
                                            onFocus={() => setFocusedField("number")}
                                            onBlur={() => setFocusedField("")}
                                            required
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group half">
                                            <label>Expiry Date</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={handleExpiryChange}
                                                onFocus={() => setFocusedField("expiry")}
                                                onBlur={() => setFocusedField("")}
                                                required
                                            />
                                        </div>
                                        <div className="form-group half">
                                            <label>CVV</label>
                                            <input
                                                type="password"
                                                placeholder="123"
                                                value={cardCvv}
                                                onChange={handleCvvChange}
                                                onFocus={() => setFocusedField("cvv")}
                                                onBlur={() => setFocusedField("")}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "upi" && (
                                <div className="tab-content upi-payment">
                                    <div className="form-group">
                                        <label>UPI ID (VPA)</label>
                                        <input
                                            type="text"
                                            placeholder="mobileNumber@upi or username@okhdfcbank"
                                            value={upiId}
                                            onChange={(e) => setUpiId(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="upi-help-text">
                                        Ensure you approve the collect request in your UPI application (GPay, PhonePe, Paytm, etc.) within 5 minutes.
                                    </p>
                                </div>
                            )}

                            {activeTab === "netbanking" && (
                                <div className="tab-content netbanking-payment">
                                    <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px", display: "block" }}>
                                        Select your Bank
                                    </label>
                                    <div className="banks-grid">
                                        {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB"].map(bank => (
                                            <div
                                                key={bank}
                                                className={`bank-tile ${selectedBank === bank ? "active" : ""}`}
                                                onClick={() => setSelectedBank(bank)}
                                            >
                                                <div className="bank-logo-placeholder">{bank.slice(0, 2)}</div>
                                                <span>{bank} Bank</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="pay-submit-btn" disabled={loading || (activeTab === "netbanking" && !selectedBank)}>
                                {loading ? "Processing..." : `Pay ₹ ${amount}`}
                            </button>
                        </form>
                    </>
                )}

                <div className="gateway-footer">
                    <span>🛡️ PCI-DSS Certified 256-bit SSL Secure Payment</span>
                </div>
            </div>
        </div>
    );
}

export default PaymentGatewayModal;
