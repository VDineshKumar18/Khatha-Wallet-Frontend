import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getRetailerProfile, updateRetailerProfile, uploadKYCDocument } from "./api/retailerApi";
import { User, Phone, Mail, Save, ArrowLeft, Loader2, MapPin, CreditCard, Pencil, X, PiggyBank, LogOut, Users, UserPlus, Calendar, Clock, Trash2, CheckCircle, XCircle, ShieldCheck, FileText, Camera, AlertTriangle, Upload } from "lucide-react";
import * as staffApi from "./api/staffApi";
import "./RetailerProfile.css";

function RetailerProfile({ onBack, onLogout }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
  const [schemeTargetAmount, setSchemeTargetAmount] = useState(6000);
  const [schemeMonthlyAmount, setSchemeMonthlyAmount] = useState(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // KYC / Verification State
  const [gstNumber, setGstNumber] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const [shopLicenseUrl, setShopLicenseUrl] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [uploading, setUploading] = useState({ LICENSE: false, PHOTO: false });

  // Staff State
  const [activeTab, setActiveTab] = useState("PROFILE"); // PROFILE or STAFF
  const [staffList, setStaffList] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // staffId -> attendance record
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "Staff", dailyWage: 500 });
  const [pendingAttendance, setPendingAttendance] = useState({}); // staffId -> pending status
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState({}); // staffId -> loading state

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStaffHistory, setSelectedStaffHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadProfile();
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    try {
      setLoadingStaff(true);
      const rId = sessionStorage.getItem("retailerId");
      const [staffRes, attendanceRes] = await Promise.all([
        staffApi.getStaff(rId),
        staffApi.getTodayAttendance(rId)
      ]);

      const safeStaffList = Array.isArray(staffRes.data) ? staffRes.data : [];
      setStaffList(safeStaffList);

      const attendance = {};
      const safeAttendanceList = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      safeAttendanceList.forEach(rec => {
        attendance[rec.staffId] = rec;
      });
      setAttendanceMap(attendance);

      // Reset pending selections when data reloads
      setPendingAttendance({});
    } catch (err) {
      console.error("Failed to load staff data", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.phone || !newStaff.dailyWage) {
      toast.error("Please fill all staff details");
      return;
    }
    try {
      const rId = sessionStorage.getItem("retailerId");
      await staffApi.addStaff(newStaff, rId);
      toast.success("Staff added successfully");
      setShowAddStaff(false);
      setNewStaff({ name: "", phone: "", role: "Staff", dailyWage: 500 });
      loadStaffData();
    } catch (err) {
      toast.error("Failed to add staff");
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Are you sure you want to remove this staff?")) return;
    try {
      const rId = sessionStorage.getItem("retailerId");
      await staffApi.deleteStaff(id, rId);
      toast.success("Staff removed");
      loadStaffData();
    } catch (err) {
      toast.error("Failed to remove staff");
    }
  };

  const selectAttendanceStatus = (staffId, status) => {
    setPendingAttendance(prev => ({
      ...prev,
      [staffId]: status
    }));
  };

  const handleSubmitAttendance = async (staffId) => {
    const status = pendingAttendance[staffId];
    if (!status) return;

    try {
      setSubmittingAttendance(prev => ({ ...prev, [staffId]: true }));
      const rId = sessionStorage.getItem("retailerId");
      await staffApi.markAttendance({ staffId, status }, rId);
      toast.success(`Marked as ${status}`);
      loadStaffData();
    } catch (err) {
      toast.error("Failed to mark attendance");
    } finally {
      setSubmittingAttendance(prev => ({ ...prev, [staffId]: false }));
    }
  };

  const loadMonthlyHistory = async (staffId, month, year) => {
    try {
      setHistoryLoading(true);
      const rId = sessionStorage.getItem("retailerId");
      const res = await staffApi.getMonthlyAttendance(staffId, month, year, rId);
      setHistoryData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (staff) => {
    setSelectedStaffHistory(staff);
    setShowHistory(true);
    loadMonthlyHistory(staff.id, historyMonth, historyYear);
  };

  const loadProfile = async () => {
    try {
      const res = await getRetailerProfile();
      const data = res.data;
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setShopName(data.shopName || "");
      setUpiId(data.upiId || sessionStorage.getItem("retailer_upi_id") || "");
      setPayeeName(data.payeeName || sessionStorage.getItem("retailer_payee_name") || "");
      setLatitude(data.latitude || null);
      setLongitude(data.longitude || null);
      setDeliveryRadiusKm(data.deliveryRadiusKm || 10);
      setSchemeTargetAmount(data.schemeTargetAmount || 6000);
      setSchemeMonthlyAmount(data.schemeMonthlyAmount || 500);
      
      setGstNumber(data.gstNumber || "");
      setApprovalStatus(data.approvalStatus || "PENDING");
      setShopLicenseUrl(data.shopLicenseUrl || "");
      setShopPhotoUrl(data.shopPhotoUrl || "");
      setIsVerified(data.isVerified || false);

      if (data.name) sessionStorage.setItem("retailerName", data.name);
      if (data.email) sessionStorage.setItem("retailerEmail", data.email);

    } catch (err) {
      console.error("Failed to load profile", err);
      if (err.response && err.response.status === 404) {
        toast.error("Session expired or Retailer not found.");
      }
      setName(sessionStorage.getItem("retailerName") || "");
      setEmail(sessionStorage.getItem("retailerEmail") || "");
      setUpiId(localStorage.getItem("retailer_upi_id") || "");
      setPayeeName(localStorage.getItem("retailer_payee_name") || "");
    } finally {
      setLoading(false);
    }
  };

  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setDetectingLocation(false);
        toast.success("Location detected!");
      },
      (error) => {
        setDetectingLocation(false);
        toast.error(`Error: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      sessionStorage.setItem("retailer_upi_id", upiId);
      sessionStorage.setItem("retailer_payee_name", payeeName);
      const payload = {
        name, phone, shopName, upiId, payeeName,
        latitude, longitude, deliveryRadiusKm,
        schemeTargetAmount: Number(schemeTargetAmount),
        schemeMonthlyAmount: Number(schemeMonthlyAmount),
        gstNumber
      };
      await updateRetailerProfile(payload);
      sessionStorage.setItem("retailerShopName", shopName);
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      const res = await uploadKYCDocument(file, type);
      toast.success(`${type === 'LICENSE' ? 'Shop License' : 'Shop Photo'} uploaded!`);
      
      // Update local state with the new filename
      if (type === 'LICENSE') setShopLicenseUrl(res.data.fileName);
      else setShopPhotoUrl(res.data.fileName);
      
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLoading(true);
    loadProfile();
  };

  return (
    <div className="profile-container fade-in">
      {loading ? (
        <div className="loading-screen">
          <Loader2 className="animate-spin" size={40} />
        </div>
      ) : (
        <>
          <div className="profile-cover">
            <div className="profile-actions-top">
              <button className="back-btn-abs" onClick={onBack}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="logout-btn-abs" onClick={onLogout}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
            <div className="profile-header-content">
              <div className="profile-avatar-large">
                <User size={60} />
              </div>
              <div className="profile-info-basic">
                <h1>{shopName || "Retailer Store"}</h1>
                <p>Retailer ID: #KH-{sessionStorage.getItem("retailerId")?.substring(0, 6) || "USER"}</p>
                <div className="tab-switcher">
                  <button className={activeTab === "PROFILE" ? "active" : ""} onClick={() => setActiveTab("PROFILE")}>Profile Settings</button>
                  <button className={activeTab === "STAFF" ? "active" : ""} onClick={() => setActiveTab("STAFF")}>Staff & Attendance</button>
                  <button className={activeTab === "VERIFICATION" ? "active" : ""} onClick={() => setActiveTab("VERIFICATION")}>
                    <ShieldCheck size={14} style={{ marginRight: 6 }} />
                    Verification
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeTab === "PROFILE" ? (
            <div className="profile-grid">
              <div className="left-column">
                <div className="glass-card detail-card">
                  <div className="card-title"><User size={20} className="text-blue-500" /> Business Details</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Business Name / Shop Name</label>
                      <input value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={!isEditing} />
                    </div>
                    <div className="form-group">
                      <label>Contact Name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} />
                      </div>
                      <div className="form-group">
                        <label>Email Address</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className={!isEditing ? "read-only" : ""} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Monthly Scheme Settings (Moved to Left Column) */}
                <div className="glass-card payment-card" style={{ marginTop: '20px', borderColor: '#bae6fd' }}>
                  <div className="card-title" style={{ color: '#0284c7' }}><PiggyBank size={20} className="text-blue-500" /> Monthly Scheme Settings</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Target Amount (₹)</label>
                      <input type="number" value={schemeTargetAmount} onChange={(e) => setSchemeTargetAmount(e.target.value)} disabled={!isEditing} />
                    </div>
                    <div className="form-group">
                      <label>Monthly Deposit (₹)</label>
                      <input type="number" value={schemeMonthlyAmount} onChange={(e) => setSchemeMonthlyAmount(e.target.value)} disabled={!isEditing} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="right-column">
                <div className="glass-card location-card">
                  <div className="card-title"><MapPin size={20} className="text-green-500" /> Preferences / Location</div>
                  <div className="form-group">
                    <label>Operating Region (GPS)</label>
                    <button className="detect-btn" onClick={detectMyLocation} disabled={detectingLocation || !isEditing}>
                      {detectingLocation ? <Loader2 className="animate-spin" size={14} /> : <MapPin size={14} />}
                      {latitude ? "Update Location" : "Detect Location"}
                    </button>
                  </div>
                  <div className="form-group">
                    <label>Delivery Radius (km)</label>
                    <input type="range" min="1" max="50" value={deliveryRadiusKm} onChange={(e) => setDeliveryRadiusKm(parseInt(e.target.value))} disabled={!isEditing} />
                  </div>
                </div>

                <div className="glass-card payment-card">
                  <div className="card-title"><CreditCard size={20} className="text-purple-500" /> Linked Accounts (UPI)</div>
                  <div className="form-group"><label>UPI ID (VPA)</label><input value={upiId} onChange={(e) => setUpiId(e.target.value)} disabled={!isEditing} /></div>
                  <div className="form-group"><label>Payee Name</label><input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} disabled={!isEditing} /></div>
                </div>
              </div>
            </div>
          ) : activeTab === "VERIFICATION" ? (
            <div className="verification-view" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
              <div className="glass-card detail-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck className="text-blue-500" /> Account Verification Status
                  </h3>
                  <div className={`status-badge ${approvalStatus.toLowerCase()}`} style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    textTransform: 'uppercase',
                    background: approvalStatus === 'APPROVED' ? '#dcfce7' : approvalStatus === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                    color: approvalStatus === 'APPROVED' ? '#166534' : approvalStatus === 'REJECTED' ? '#991b1b' : '#854d0e'
                  }}>
                    {approvalStatus}
                  </div>
                </div>

                {isVerified ? (
                  <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <CheckCircle className="text-green-600" />
                    <div>
                      <h4 style={{ margin: 0, color: '#166534' }}>Verified Merchant</h4>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#15803d' }}>Your business documents have been approved. Your shop is now visible to all customers.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 20, background: '#fffbeb', borderRadius: 12, border: '1px solid #fef3c7', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <AlertTriangle className="text-amber-600" />
                    <div>
                      <h4 style={{ margin: 0, color: '#92400e' }}>Verification Required</h4>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#b45309' }}>Please upload the following documents to get your shop verified and visible to customers.</p>
                    </div>
                  </div>
                )}

                <div className="form-grid" style={{ marginTop: 30 }}>
                  <div className="form-group">
                    <label>GST Number (Optional)</label>
                    <input 
                      placeholder="e.g. 22AAAAA0000A1Z5" 
                      value={gstNumber} 
                      onChange={(e) => setGstNumber(e.target.value)} 
                      disabled={!isEditing} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                  <div className="upload-box-kyc">
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Shop License / Registration</label>
                    <div className="kyc-dropzone" onClick={() => !uploading.LICENSE && document.getElementById('license-up').click()}>
                      {uploading.LICENSE ? <Loader2 className="animate-spin" /> : (shopLicenseUrl ? <FileText className="text-blue-500" /> : <Upload />)}
                      <span>{shopLicenseUrl ? "License Uploaded ✓" : "Upload Shop License"}</span>
                    </div>
                    <input id="license-up" type="file" hidden onChange={(e) => handleFileUpload(e, 'LICENSE')} accept="image/*,.pdf" />
                  </div>

                  <div className="upload-box-kyc">
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8 }}>Shop Front Logo / Photo</label>
                    <div className="kyc-dropzone" onClick={() => !uploading.PHOTO && document.getElementById('photo-up').click()}>
                      {uploading.PHOTO ? <Loader2 className="animate-spin" /> : (shopPhotoUrl ? <Camera className="text-blue-500" /> : <Camera />)}
                      <span>{shopPhotoUrl ? "Photo Uploaded ✓" : "Upload Shop Photo"}</span>
                    </div>
                    <input id="photo-up" type="file" hidden onChange={(e) => handleFileUpload(e, 'PHOTO')} accept="image/*" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="staff-view-container">
              <div className="staff-header-row">
                <h2>Supermarket Staff</h2>
                <button className="add-staff-btn" onClick={() => setShowAddStaff(true)}><UserPlus size={18} /> Add New Staff</button>
              </div>
              {showAddStaff && (
                <div className="glass-card add-staff-form" style={{ maxWidth: '600px', margin: '0 auto 30px' }}>
                  <h3><UserPlus size={18} /> New Staff Member</h3>
                  <div className="form-grid">
                    <div className="form-group"><label>Full Name</label><input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} /></div>
                    <div className="form-group"><label>Phone Number</label><input value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} /></div>
                    <div className="form-row">
                      <div className="form-group"><label>Role</label><select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}><option value="Cashier">Cashier</option><option value="Stock Manager">Stock Manager</option><option value="Delivery Boy">Delivery Boy</option><option value="Staff">General Staff</option></select></div>
                      <div className="form-group"><label>Daily Wage (₹)</label><input type="number" value={newStaff.dailyWage} onChange={(e) => setNewStaff({ ...newStaff, dailyWage: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="edit-actions" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button className="cancel-btn-floating" onClick={() => setShowAddStaff(false)} style={{ padding: '10px 20px', fontSize: '13px' }}>Cancel</button>
                    <button className="save-btn-floating" onClick={handleAddStaff} style={{ padding: '10px 20px', fontSize: '13px' }}>Add Staff</button>
                  </div>
                </div>
              )}
              <div className="staff-attendance-board">
                <div className="board-header">
                  <div className="date-info"><Calendar size={18} /> {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div className="board-stats">Total Staff: {staffList.length} | Present: {Object.values(attendanceMap).filter(a => a.status === 'PRESENT').length}</div>
                </div>
                {loadingStaff ? <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div> : (
                  <div className="staff-list-grid">
                    {staffList.length === 0 ? <div className="empty-staff" style={{ textAlign: 'center', gridColumn: '1/-1', padding: '40px', color: '#64748b' }}>No staff members added yet.</div> : (
                      staffList.map(staff => {
                        const record = attendanceMap[staff.id];
                        const currentStatus = record?.status || "PENDING";
                        const pendingStatus = pendingAttendance[staff.id];
                        const isSubmitting = submittingAttendance[staff.id];

                        return (
                          <div key={staff.id} className={`staff-card glass-card ${currentStatus.toLowerCase()}`}>
                            <div className="staff-main">
                              <div className="staff-avatar">{staff.name.charAt(0)}</div>
                              <div className="staff-details"><h4>{staff.name}</h4><p className="role">{staff.role}</p><p className="wage">Wage: ₹{staff.dailyWage}/day</p></div>
                              <button className="delete-staff-btn" onClick={() => handleDeleteStaff(staff.id)}><Trash2 size={16} /></button>
                            </div>
                            <div className="attendance-controls">
                              <button className={`status-btn present ${(pendingStatus || currentStatus) === 'PRESENT' ? 'selected' : ''}`} onClick={() => selectAttendanceStatus(staff.id, 'PRESENT')}><CheckCircle size={14} /> Present</button>
                              <button className={`status-btn half ${(pendingStatus || currentStatus) === 'HALF_DAY' ? 'selected' : ''}`} onClick={() => selectAttendanceStatus(staff.id, 'HALF_DAY')}><Clock size={14} /> Half Day</button>
                              <button className={`status-btn absent ${(pendingStatus || currentStatus) === 'ABSENT' ? 'selected' : ''}`} onClick={() => selectAttendanceStatus(staff.id, 'ABSENT')}><XCircle size={14} /> Absent</button>
                            </div>

                            {pendingStatus && pendingStatus !== currentStatus && (
                              <button
                                className="submit-attendance-btn"
                                onClick={() => handleSubmitAttendance(staff.id)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Confirm {pendingStatus.replace('_', ' ').toLowerCase()}
                              </button>
                            )}

                            {record && !pendingStatus && <div className="earning-badge">Today's Earning: <span>₹{record.dailyEarning}</span></div>}
                            <button className="view-history-btn" onClick={() => openHistory(staff)}><Calendar size={14} /> View Monthly History</button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* History Modal */}
              {showHistory && selectedStaffHistory && (
                <div className="history-modal-overlay">
                  <div className="history-modal glass-card">
                    <div className="history-header">
                      <h3>{selectedStaffHistory.name}'s Attendance History</h3>
                      <button className="close-history-btn" onClick={() => setShowHistory(false)}><X size={20} /></button>
                    </div>

                    <div className="history-controls">
                      <div className="month-picker">
                        <select value={historyMonth} onChange={(e) => {
                          const m = parseInt(e.target.value);
                          setHistoryMonth(m);
                          loadMonthlyHistory(selectedStaffHistory.id, m, historyYear);
                        }}>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                        <select value={historyYear} onChange={(e) => {
                          const y = parseInt(e.target.value);
                          setHistoryYear(y);
                          loadMonthlyHistory(selectedStaffHistory.id, historyMonth, y);
                        }}>
                          {[historyYear, historyYear - 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="history-summary-stats">
                        <div className="stat-pill present">P: {historyData.filter(h => h.status === 'PRESENT').length}</div>
                        <div className="stat-pill half">H: {historyData.filter(h => h.status === 'HALF_DAY').length}</div>
                        <div className="stat-pill absent">A: {historyData.filter(h => h.status === 'ABSENT').length}</div>
                        <div className="stat-pill total">Total: ₹{historyData.reduce((acc, h) => acc + h.dailyEarning, 0)}</div>
                      </div>
                    </div>

                    <div className="history-table-container">
                      {historyLoading ? <div className="loading-center"><Loader2 className="animate-spin" /></div> : (
                        <table className="history-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Earning</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.length === 0 ? (
                              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No records found for this month.</td></tr>
                            ) : (
                              historyData.map(h => (
                                <tr key={h.id}>
                                  <td>{new Date(h.date).toLocaleDateString()}</td>
                                  <td><span className={`status-tag ${h.status.toLowerCase()}`}>{h.status.replace('_', ' ')}</span></td>
                                  <td>₹{h.dailyEarning}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="action-buttons-floating">
            {!isEditing ? (
              <button className="edit-btn-floating" onClick={() => setIsEditing(true)} style={{ display: activeTab === "STAFF" ? "none" : "flex" }}><Pencil size={18} /> Edit Profile</button>
            ) : (
              <div className="edit-actions">
                <button className="cancel-btn-floating" onClick={handleCancel} disabled={saving}><X size={18} /> Cancel</button>
                <button className="save-btn-floating" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {saving ? "Saving..." : "Save Changes"}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default RetailerProfile;
