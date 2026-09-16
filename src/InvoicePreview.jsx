import "./InvoicePreview.css";
import logoImg from "./assets/landing/logo.svg";

function InvoicePreview({ customer, billItems, total, billNumber, retailerInfo, status, paidAmount, dueAmount, paymentMode, gatewayTransactionRef, onClose }) {
  // Calculate subtotal and tax if not provided (default 5% from Billing.jsx)
  const gst = Math.round((total * 5) / 105);
  const subTotal = total - gst;

  return (
    <div className="invoice-overlay">
      <div className="invoice-a4" id="invoice-print">
        {/* Branding Section */}
        <div className="branding-header">
          <img src={logoImg} alt="Khatha Wallet" className="invoice-main-logo" />
          <div className="branding-text">
            <span className="brand-name">Khatha Wallet</span>
            <span className="brand-tagline">Premium Business Solutions</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="invoice-header">
          <div className="company-info">
            <h1>{retailerInfo?.shopName || "[Shop Name]"}</h1>
            <p>{retailerInfo?.name || "[Retailer Name]"}</p>
            <p>{retailerInfo?.phone || "[Phone]"}</p>
            <p>{retailerInfo?.email || "[Email]"}</p>
          </div>
          <div className="invoice-title">
            <h2>INVOICE</h2>
            <div className="invoice-meta-grid">
              <table className="meta-table">
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{billNumber || "---"}</td>
                    <td>{new Date().toLocaleDateString()}</td>
                  </tr>
                </tbody>
                <thead>
                  <tr>
                    <th>CUSTOMER ID</th>
                    <th>TERMS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{customer?.id || "---"}</td>
                    <td>Due on Receipt</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="address-section">
          <div className="address-block">
            <div className="bill-to-header">
              <h3>BILL TO</h3>
              <img src={logoImg} alt="Khatha Wallet" className="invoice-logo-mini" />
            </div>
            <p><b>Name:</b> {customer?.name || "Cash Sale"}</p>
            {customer?.phone && <p><b>Phone:</b> {customer.phone}</p>}
            {customer?.email && <p><b>Email:</b> {customer.email}</p>}
            {customer?.address && <p><b>Address:</b> {customer.address}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-desc">DESCRIPTION</th>
              <th className="col-qty">QTY</th>
              <th className="col-price">UNIT PRICE</th>
              <th className="col-amount">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {billItems.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.price).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{(item.price * item.qty).toFixed(2)}</td>
              </tr>
            ))}
            {/* Blank rows to fill space and maintain layout like the screenshot */}
            {[...Array(Math.max(0, 5 - billItems.length))].map((_, i) => (
              <tr key={`blank-${i}`}>
                <td style={{ borderBottom: 'none' }}>&nbsp;</td>
                <td style={{ borderBottom: 'none' }}>&nbsp;</td>
                <td style={{ borderBottom: 'none' }}>&nbsp;</td>
                <td style={{ borderBottom: 'none' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="invoice-footer-grid">
          <div className="footer-left">
            <p className="footer-note">Thank you for your business!</p>
            {paymentMode && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                <div><b>Payment Method:</b> {paymentMode === "ONLINE" ? "Online Gateway (Card/Netbanking)" : paymentMode}</div>
                {gatewayTransactionRef && <div><b>Transaction Ref:</b> <code style={{ color: '#2563eb', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }}>{gatewayTransactionRef}</code></div>}
              </div>
            )}
          </div>
          <div className="footer-right">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label">TOTAL</td>
                  <td className="value">₹ {Number(total).toFixed(2)}</td>
                </tr>
                {paidAmount !== undefined && (
                  <tr>
                    <td className="label">PAID</td>
                    <td className="value">₹ {Number(paidAmount).toFixed(2)}</td>
                  </tr>
                )}
                {dueAmount !== undefined && (
                  <tr>
                    <td className="label">DUE</td>
                    <td className="value">₹ {Number(dueAmount).toFixed(2)}</td>
                  </tr>
                )}
                {status && (
                  <tr>
                    <td className="label">STATUS</td>
                    <td className="value" style={{ color: status === 'PAID' ? '#16a34a' : '#dc2626' }}>
                      {status}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="invoice-contact-info">
          <p>If you have any questions about this invoice, please contact</p>
          <p>{retailerInfo?.name || "[Retailer Name]"}, Phone: {retailerInfo?.phone || "[Phone]"}, {retailerInfo?.email || "[Email]"}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="invoice-actions-fixed">
        <button className="btn-invoice close" onClick={onClose}>Close</button>
        <button className="btn-invoice print" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

export default InvoicePreview;
