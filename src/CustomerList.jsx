import { useState } from "react";
import { Trash2, MessageCircle } from "lucide-react";
import { notifyCustomer } from "./api/notificationApi";
import { updateCustomerEmail, updateCustomerPhone, deleteCustomer } from "./api/customerApi";
import { toast } from "react-toastify"; // ✅ Use react-toastify
import { openWhatsApp } from "./utils/whatsappUtils";

function CustomerList({ customers = [], onBack, onSelectCustomer, title }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingPhoneId, setEditingPhoneId] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // ✅ SAFE FILTER (NO CRASH)
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const filteredCustomers = safeCustomers.filter(
    (c) =>
      c &&
      typeof c.name === "string" &&
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= NOTIFY ================= */
  const handleNotify = async (customer) => {
    if (!customer?.email) {
      toast.error("Email not available");
      return;
    }

    try {
      setSendingId(customer.id);
      await notifyCustomer(customer.id);

      toast.success(`Email sent to ${customer.email}`);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  /* ================= UPDATE EMAIL ================= */
  const handleUpdateEmail = async (customerId) => {
    if (!emailInput.trim()) return;

    try {
      await updateCustomerEmail(customerId, emailInput.trim());

      toast.success("Email updated successfully");

      setEditingCustomerId(null);
      setEmailInput("");
    } catch {
      toast.error("Failed to update email");
    }
  };

  /* ================= UPDATE PHONE ================= */
  const handleUpdatePhone = async (customerId) => {
    if (!phoneInput.trim()) return;

    try {
      await updateCustomerPhone(customerId, phoneInput.trim());
      toast.success("Phone number updated successfully");
      setEditingPhoneId(null);
      setPhoneInput("");
      
      // Reload to reflect changes (or trigger parent refresh)
      setTimeout(() => window.location.reload(), 1000); 
    } catch {
      toast.error("Failed to update phone number");
    }
  };

  /* ================= DELETE CUSTOMER (FINAL & CORRECT) ================= */
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm("Delete this customer permanently?")) return;

    try {
      await deleteCustomer(customerId);

      toast.success("Customer deleted successfully");
    } catch (err) {
      const backendMessage =
        err?.message || "Cannot delete customer";

      toast.error(backendMessage);
    }
  };

  /* ================= HELPERS ================= */
  const getInitials = (name) => {
    if (!name || name.toUpperCase() === "UNDEFINED") return "UD";
    const cleanName = name.trim();
    if (!cleanName) return "UD";

    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0][0] || "";
      const secondInitial = parts[1][0] || "";
      const initials = (firstInitial + secondInitial).toUpperCase();
      return initials.length > 0 ? initials : "UD";
    }
    return cleanName.slice(0, 2).toUpperCase() || "UD";
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isSchemeView = title === "Monthly Savings Members";

  return (
    <div className="content">
      <button className="btn back small" onClick={onBack}>
        ⬅ Back
      </button>

      <div className="card mt-20">
        <div className="row-between mb-20">
          <h3>{title || "Customer List"}</h3>
          <div className="search-wrapper" style={{ width: '300px' }}>
            <input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="modern-table desktop-only">
            <thead>
              <tr>
                <th>Name</th>
                <th>{isSchemeView ? "Saved" : "Due"}</th>
                <th>Email</th>
                <th>Notify</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" align="center">
                    No customers
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="row" style={{ gap: '14px', alignItems: 'center' }}>
                        <div className="customer-avatar">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="font-bold" style={{ fontSize: '15px' }}>{capitalize(c.name)}</div>
                          {c.isOnline && (
                            <span className="status-pill pill-info" style={{ fontSize: '9px', padding: '1px 6px', marginTop: '4px' }}>ONLINE</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      {isSchemeView ? (
                        <span className="status-pill pill-success">
                          ₹{c.schemeCollectedAmount?.toFixed(2) || "0.00"}
                        </span>
                      ) : c.dueAmount > 0 ? (
                        <span className="status-pill pill-danger">₹{c.dueAmount.toFixed(2)}</span>
                      ) : (
                        <span className="status-pill pill-success">PAID</span>
                      )}
                    </td>

                    <td>
                      {editingCustomerId === c.id ? (
                        <div className="row" style={{ gap: '8px' }}>
                          <input
                            type="email"
                            value={emailInput}
                            style={{ padding: '4px 8px', fontSize: '13px' }}
                            onChange={(e) => setEmailInput(e.target.value)}
                          />
                          <button
                            className="btn primary small"
                            onClick={() => handleUpdateEmail(c.id)}
                          >
                            Save
                          </button>
                        </div>
                      ) : c.email ? (
                        <span className="text-muted">{c.email}</span>
                      ) : (
                        <button
                          className="btn-view"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingCustomerId(c.id);
                            setEmailInput("");
                          }}
                        >
                          Update Email
                        </button>
                      )}
                    </td>

                    <td>
                      {c.dueAmount > 0 && !isSchemeView ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn-notify"
                            disabled={sendingId === c.id}
                            onClick={() => handleNotify(c)}
                            style={{ flex: 1 }}
                          >
                            {sendingId === c.id ? "Sending..." : "Notify"}
                          </button>
                          <button
                            onClick={() => openWhatsApp('due', c.id)}
                            title="Notify via WhatsApp"
                            style={{
                              padding: '6px 10px', background: '#25d366', color: 'white', 
                              border: 'none', borderRadius: '6px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      ) : isSchemeView ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn-notify"
                            onClick={() => handleNotify(c)}
                            style={{ flex: 1 }}
                          >
                            Notify
                          </button>
                          <button
                            onClick={() => openWhatsApp('scheme', c.id)}
                            title="Notify via WhatsApp"
                            style={{
                              padding: '6px 10px', background: '#25d366', color: 'white', 
                              border: 'none', borderRadius: '6px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>

                    <td>
                      <div className="row" style={{ gap: '8px' }}>
                        <button
                          className="btn-view"
                          onClick={() => onSelectCustomer(c)}
                        >
                          View
                        </button>

                        {!c.phone && editingPhoneId !== c.id && (
                          <button
                            className="btn primary small"
                            style={{ background: '#25d366', borderColor: '#25d366' }}
                            onClick={() => {
                              setEditingPhoneId(c.id);
                              setPhoneInput("");
                            }}
                          >
                            Add Phone
                          </button>
                        )}

                        {editingPhoneId === c.id && (
                           <div className="row" style={{ gap: '4px' }}>
                             <input
                               placeholder="Phone..."
                               value={phoneInput}
                               style={{ width: '100px', fontSize: '12px', padding: '4px' }}
                               onChange={(e) => setPhoneInput(e.target.value)}
                             />
                             <button className="btn primary small" onClick={() => handleUpdatePhone(c.id)}>Save</button>
                           </div>
                        )}

                        <button
                          className="btn-delete"
                          disabled={c.dueAmount > 0}
                          title={c.dueAmount > 0 ? "Cannot delete customer with bills" : "Delete Customer"}
                          onClick={() => handleDeleteCustomer(c.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ MOBILE CARD VIEW (REFINED) */}
        <div className="mobile-only" style={{ flexDirection: 'column' }}>
          {filteredCustomers.map(c => (
            <div className="mobile-card" key={c.id}>
              {/* Row 1: Primary Info (Name & Status) */}
              <div className="mobile-card-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="mobile-card-label">Customer Name</span>
                  <span className="mobile-card-value font-bold" style={{ fontSize: '16px' }}>
                    {capitalize(c.name)}
                    {c.isOnline && (
                      <span className="pill-info" style={{
                        marginLeft: '8px',
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        verticalAlign: 'middle'
                      }}>ONLINE</span>
                    )}
                  </span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="mobile-card-label">{isSchemeView ? "Saved" : "Status"}</span>
                  {isSchemeView ? (
                    <span className="status-pill pill-success">₹{c.schemeCollectedAmount?.toFixed(2)}</span>
                  ) : c.dueAmount > 0 ? (
                    <span className="status-pill pill-danger">DUE: ₹{c.dueAmount.toFixed(2)}</span>
                  ) : (
                    <span className="status-pill pill-success">PAID</span>
                  )}
                </div>
              </div>

              {/* Row 2: Secondary Info (Email if editing or exists) */}
              {(editingCustomerId === c.id || c.email) && (
                <div className="mobile-card-row" style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px dashed rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <span className="mobile-card-label">Email Address</span>
                    {editingCustomerId === c.id ? (
                      <div className="row" style={{ gap: '8px', width: '100%' }}>
                        <input
                          type="email"
                          value={emailInput}
                          autoFocus
                          placeholder="Enter email"
                          style={{ flex: 1, height: '36px', fontSize: '13px' }}
                          onChange={(e) => setEmailInput(e.target.value)}
                        />
                        <button className="btn primary small" onClick={() => handleUpdateEmail(c.id)}>Save</button>
                      </div>
                    ) : (
                      <span className="mobile-card-value text-muted" style={{ fontSize: '13px' }}>{c.email}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Row 3: Actions */}
              <div className="mobile-card-actions">
                {c.dueAmount > 0 && (
                  <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-notify"
                      style={{ flex: 1, height: '44px' }}
                      disabled={sendingId === c.id}
                      onClick={() => handleNotify(c)}
                    >
                      {sendingId === c.id ? "Sending..." : "Notify"}
                    </button>
                    <button
                      onClick={() => openWhatsApp('due', c.id)}
                      style={{
                        padding: '0 12px', background: '#25d366', color: 'white', 
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <MessageCircle size={20} />
                    </button>
                  </div>
                )}

                <button
                  className="btn-view"
                  style={{ flex: 1, height: '44px' }}
                  onClick={() => onSelectCustomer(c)}
                >
                  View Details
                </button>

                {!c.email && editingCustomerId !== c.id && (
                  <button
                    className="icon-btn"
                    title="Update Email"
                    onClick={() => {
                      setEditingCustomerId(c.id);
                      setEmailInput("");
                    }}
                  >
                    📧
                  </button>
                )}

                {!c.phone && editingPhoneId !== c.id && (
                  <button
                    className="icon-btn"
                    title="Update Phone"
                    style={{ background: '#25d366', color: 'white' }}
                    onClick={() => {
                      setEditingPhoneId(c.id);
                      setPhoneInput("");
                    }}
                  >
                    📱
                  </button>
                )}

                {editingPhoneId === c.id && (
                   <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '8px' }}>
                     <input
                       placeholder="Enter Phone"
                       value={phoneInput}
                       autoFocus
                       style={{ flex: 1, fontSize: '13px' }}
                       onChange={(e) => setPhoneInput(e.target.value)}
                     />
                     <button className="btn primary small" onClick={() => handleUpdatePhone(c.id)}>Save</button>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomerList;
