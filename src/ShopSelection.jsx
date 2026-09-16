import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "./LoginModal.css";
import { getPublicRetailers, registerCustomer } from "./api/authApi";
import { getNearbyRetailers } from "./api/retailerApi";

function ShopSelection({ accounts, onSelectShop, onBack, isModal = true, isRegistration = false, newCustomerData = null, mode = "shop" }) {
    const [shops, setShops] = useState(accounts || []);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [customerLocation, setCustomerLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    const [showRegistration, setShowRegistration] = useState(isRegistration);

    // If registration mode, load ALL public shops
    useEffect(() => {
        if (showRegistration) {
            loadShops();
        } else {
            setShops(accounts || []);
        }
    }, [showRegistration, accounts]);

    // Request customer location on mount
    useEffect(() => {
        if (showRegistration) {
            requestCustomerLocation();
        }
    }, [showRegistration]);

    const requestCustomerLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Your browser doesn't support location services");
            setLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setCustomerLocation(location);
                setLoadingLocation(false);
                loadNearbyShops(location.lat, location.lng);
            },
            (error) => {
                setLocationError("Please enable location to find nearby shops");
                setLoadingLocation(false);
                // Fall back to loading all shops
                loadShops();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const loadNearbyShops = async (lat, lng) => {
        try {
            setLoading(true);
            const response = await getNearbyRetailers(lat, lng, 10);
            setShops(response.data);
        } catch (err) {
            console.error("Failed to load nearby shops:", err);
            setError("Failed to load nearby shops");
            // Fallback to all shops
            loadShops();
        } finally {
            setLoading(false);
        }
    };

    const loadShops = async () => {
        try {
            setLoading(true);
            const data = await getPublicRetailers();
            setShops(data);
        } catch (err) {
            setError("Failed to load shops");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinShop = async (retailerId) => {
        if (!showRegistration) {
            onSelectShop(retailerId); // Ensure this passes the full object if available, or fetch it?
            // Actually, 'retailerId' param in map is: showRegistration ? acc.retailerId : acc
            // So if !showRegistration, it IS the object (acc).
            return;
        }

        // REGISTER NEW CUSTOMER
        // ... (existing registration logic) ...
        try {
            setLoading(true);

            // Fetch existing customer info from sessionStorage if we don't have newCustomerData
            let existingCustomer = null;
            if (!newCustomerData) {
                const storedAccounts = sessionStorage.getItem("customer_accounts");
                if (storedAccounts) {
                    try {
                        const parsed = JSON.parse(storedAccounts);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            existingCustomer = parsed[0]; // grab profile from any existing account
                        }
                    } catch (e) {
                        console.error("Failed to parse existing accounts", e);
                    }
                }
            }

            const email = newCustomerData?.email || existingCustomer?.email;
            const name = newCustomerData?.name || existingCustomer?.name || existingCustomer?.customerName || "Customer";
            const phone = newCustomerData?.phone || existingCustomer?.phone || existingCustomer?.customerPhone;

            if (!email || !phone) {
                const selectedShopObj = shops.find(s => s.retailerId === retailerId);
                onSelectShop({
                    retailerId: retailerId,
                    retailerName: selectedShopObj?.shopName || selectedShopObj?.retailerName || selectedShopObj?.name || "Shop",
                    isGuest: true
                });
                return;
            }

            const res = await registerCustomer({
                email: email,
                name: name,
                phone: phone,
                retailerId: retailerId.toString()
            });

            onSelectShop(res[0]);

        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const safeShops = Array.isArray(shops) ? shops : [];
    const filteredShops = safeShops.filter(s => {
        const name = (s.name || s.retailerName || "").toLowerCase();
        const shopName = (s.shopName || "").toLowerCase();
        const phone = (s.phone || s.retailerPhone || "");
        const query = search.toLowerCase();
        return name.includes(query) || shopName.includes(query) || phone.includes(query);
    });

    // Sort by distance if available
    const sortedShops = filteredShops.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
        }
        return 0;
    });

    const content = (
        <div className={`glass-card ${isModal ? "login-modal" : "shop-selection-panel"}`} style={isModal ? { maxWidth: 450 } : {}}>
            {isModal && <button className="close-btn" onClick={onBack}>✕</button>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className={isModal ? "modal-title" : "section-title"}>
                    {mode === 'scheme'
                        ? "Find a Savings Scheme 🐷"
                        : (showRegistration ? "Join a Shop 🏪" : "My Shops 🛍️")
                    }
                </h2>
                {!isRegistration && !isModal && (
                    <button
                        onClick={() => setShowRegistration(!showRegistration)}
                        style={{ fontSize: '0.8rem', padding: '5px 10px', cursor: 'pointer' }}
                    >
                        {showRegistration ? "Back to My Shops" : "Find Other Shops"}
                    </button>
                )}
            </div>

            <p style={{ color: '#64748b' }}>
                {newCustomerData
                    ? `Account Created! 🎉 Hi ${newCustomerData.name}, please choose a shop to start ordering:`
                    : (showRegistration
                        ? "Find your local store and join to start shopping."
                        : "Switch to another shop you are registered with:"
                    )
                }
            </p>

            {/* LOCATION STATUS */}
            {showRegistration && loadingLocation && (
                <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
                    📍 Detecting your location...
                </div>
            )}

            {showRegistration && locationError && (
                <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                    <div>⚠️ {locationError}</div>
                    <button
                        onClick={requestCustomerLocation}
                        style={{ marginTop: '8px', padding: '6px 12px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {showRegistration && customerLocation && (
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', marginBottom: '15px', color: '#10b981', textAlign: 'center' }}>
                    ✅ Showing shops near you (within 10km)
                </div>
            )}

            {/* SEARCH BAR */}
            {(showRegistration || shops.length > 5) && (
                <input
                    placeholder="Search by Shop Name or Phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        padding: '10px',
                        width: '100%',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        margin: '15px 0'
                    }}
                />
            )}

            {loading && <p>Loading shops...</p>}
            {error && <p className="error">{error}</p>}

            <div className="shop-list" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '300px', overflowY: 'auto' }}>
                {sortedShops.length === 0 && !loading && !loadingLocation && <p>No shops found nearby. Try increasing your search radius.</p>}

                {sortedShops.map((acc) => (
                    <button
                        key={acc.retailerId + "-" + (acc.customerId || "new")}
                        className="glass-card shop-card-btn"
                        onClick={() => handleJoinShop(showRegistration ? acc.retailerId : acc)}
                        disabled={loading}
                        style={{
                            padding: "15px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🏪 {acc.shopName || acc.retailerName || acc.name}</span>
                                {(acc.isVerified || acc.retailerIsVerified) && (
                                    <span title="Verified by Khatha Wallet" style={{ fontSize: '1rem', display: 'flex' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#3b82f6" />
                                        </svg>
                                    </span>
                                )}
                            </h3>
                            {acc.shopName && (
                                <p style={{ margin: "2px 0", color: "#64748b", fontSize: "0.8rem" }}>
                                    Owner: {acc.retailerName || acc.name}
                                </p>
                            )}
                            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                                📱 {acc.retailerPhone || acc.phone || "No phone"}
                            </p>
                            {acc.distance !== undefined && (
                                <span style={{
                                    background: '#e0f2fe',
                                    color: '#0284c7',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    marginTop: '4px',
                                    display: 'inline-block'
                                }}>
                                    📍 {acc.distance} km away
                                </span>
                            )}
                        </div>
                        {/* ✅ SCHEME DETAILS IN CARD */}
                        {mode === 'scheme' && (
                            <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#0ea5e9', display: 'flex', gap: 8, fontWeight: 600 }}>
                                <span style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                                    🎯 Target: ₹{acc.schemeTargetAmount || 6000}
                                </span>
                                <span style={{ background: '#f0f9ff', padding: '2px 6px', borderRadius: 4 }}>
                                    💰 Monthly: ₹{acc.schemeMonthlyAmount || 500}
                                </span>
                            </div>
                        )}

                        {showRegistration && (
                            <span style={{
                                background: mode === 'scheme' ? '#10b981' : '#3b82f6',
                                color: 'white', padding: '4px 10px',
                                borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'
                            }}>
                                {mode === 'scheme' ? 'ENROLL' : 'JOIN'}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div >
    );

    if (isModal) {
        return <div className="login-modal-overlay">{content}</div>;
    }

    return content;
}

export default ShopSelection;
