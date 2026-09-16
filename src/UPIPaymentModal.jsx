import { useState, useEffect } from "react";
import { QRCode } from "react-qrcode-logo";
import { toast } from "react-toastify"; // ✅ Import Toast
// Actually strict export of react-qrcode-logo is 'QRCode'

import { X, CheckCircle, Share2, Copy } from "lucide-react";
import "./UPIPaymentModal.css";

function UPIPaymentModal({ amount, customerName, onClose, onPaymentConfirmed }) {
    const [upiId, setUpiId] = useState("");
    const [payeeName, setPayeeName] = useState("");
    const [timer, setTimer] = useState(300); // 5 minutes timer for session

    useEffect(() => {
        // Load from session storage (populated by Profile or Login)
        const storedUpi = sessionStorage.getItem("retailer_upi_id");
        const storedName = sessionStorage.getItem("retailer_payee_name");

        setUpiId(storedUpi);
        setPayeeName(storedName);

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onClose(); // ✅ Auto Close
                    toast.error("Payment session expired");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!upiId) {
        return (
            <div className="upi-modal-overlay">
                <div className="glass-card upi-modal-card error">
                    <h3>⚠️ UPI ID Not Configured</h3>
                    <p>Please go to <b>Profile</b> and set your UPI ID first.</p>
                    <button className="btn primary" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    // UPI URL Format: upi://pay?pa=<upi_id>&pn=<payee_name>&am=<amount>&cu=INR
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName || "Merchant")}&am=${amount}&cu=INR`;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    return (
        <div className="upi-modal-overlay">
            <div className="glass-card upi-modal-card bounce-in">
                <div className="modal-header">
                    <h3>UPI Payment</h3>
                    <button className="close-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="qr-section">
                    <div className="qr-wrapper">
                        <QRCode
                            value={upiUrl}
                            size={200}
                            logoImage="/logo192.png" // Using default react logo if available, or remove
                            logoWidth={40}
                            removeQrCodeBehindLogo={true}
                            eyeRadius={5}
                        />
                    </div>
                    <div className="amount-display">
                        ₹ {amount}
                    </div>
                    <div className="timer-pill">
                        Expires in {formatTime(timer)}
                    </div>
                </div>

                <div className="details-section">
                    <div className="detail-row">
                        <span>Paying to:</span>
                        <strong>{payeeName || upiId}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Customer:</span>
                        <span>{customerName || "Walk-in"}</span>
                    </div>
                </div>

                <div className="info-box">
                    <p>1. Scan this QR with any UPI App (GPay, PhonePe, Paytm)</p>
                    <p>2. Complete the payment on your phone</p>
                    <p>3. <b>Wait for success message</b> on phone</p>
                </div>

                <div className="action-buttons">
                    <button className="btn success full-width" onClick={onPaymentConfirmed}>
                        <CheckCircle size={18} />
                        I Received Payment
                    </button>

                    <button className="btn dangerous full-width" onClick={onClose} style={{ marginTop: '8px', background: '#fee2e2', color: '#ef4444' }}>
                        <X size={18} />
                        Customer Cancelled
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UPIPaymentModal;
