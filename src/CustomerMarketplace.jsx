import { useState, useEffect } from "react";
import { Plus, Minus, Store, Grid, Tag, MapPin, ChevronLeft, ChevronRight, ShoppingBag, Flag } from "lucide-react";
import { toast } from "react-toastify";
import { getAllProducts } from "./api/productApi";
import axiosClient from "./api/axiosClient";
import "./CustomerApp.css";

// 🖼️ Category Images
import fruitsImg from "./assets/categories/fruits_veg.png";
import staplesImg from "./assets/categories/staples.png";
import spicesImg from "./assets/categories/spices.png";
import oilImg from "./assets/categories/oil_ghee.png";
import dairyImg from "./assets/categories/dairy.png";
import bakeryImg from "./assets/categories/bakery.png";
import snacksImg from "./assets/categories/snacks.png";
import beveragesImg from "./assets/categories/beverages.png";
import personalImg from "./assets/categories/personal_care.png";
import cleaningImg from "./assets/categories/cleaning.png";
import babyImg from "./assets/categories/baby_care.png";
import healthImg from "./assets/categories/health.png";
import petImg from "./assets/categories/pet_care.png";
import meatImg from "./assets/categories/meat_eggs.png";
import readyImg from "./assets/categories/ready_foods.png";
import dispImg from "./assets/categories/disposables.png";
import seasonalImg from "./assets/categories/seasonal.png";
import miscImg from "./assets/categories/misc.png";

// ✅ CATEGORY MAPPING (Icon + Label)
const CATEGORY_DATA = {
    "ALL": { label: "All Items", icon: "🛍️", isEmoji: true },
    "FRUITS_VEGETABLES": { label: "Fruits & Veg", icon: fruitsImg, isEmoji: false },
    "STAPLES_GRAINS": { label: "Staples", icon: staplesImg, isEmoji: false },
    "SPICES_MASALAS": { label: "Spices", icon: spicesImg, isEmoji: false },
    "COOKING_OILS_GHEE": { label: "Oil & Ghee", icon: oilImg, isEmoji: false },
    "DAIRY_PRODUCTS": { label: "Dairy", icon: dairyImg, isEmoji: false },
    "BAKERY_BREAD": { label: "Bakery", icon: bakeryImg, isEmoji: false },
    "SNACKS_PACKAGED": { label: "Snacks", icon: snacksImg, isEmoji: false },
    "BEVERAGES": { label: "Beverages", icon: beveragesImg, isEmoji: false },
    "PERSONAL_CARE": { label: "Personal Care", icon: personalImg, isEmoji: false },
    "HOUSEHOLD_CLEANING": { label: "Cleaning", icon: cleaningImg, isEmoji: false },
    "BABY_CARE": { label: "Baby Care", icon: babyImg, isEmoji: false },
    "HEALTH_WELLNESS": { label: "Health", icon: healthImg, isEmoji: false },
    "PET_CARE": { label: "Pet Care", icon: petImg, isEmoji: false },
    "MEAT_FISH_EGGS": { label: "Meat & Eggs", icon: meatImg, isEmoji: false },
    "READY_TO_EAT": { label: "Ready Foods", icon: readyImg, isEmoji: false },
    "PAPER_DISPOSABLES": { label: "Disposables", icon: dispImg, isEmoji: false },
    "SEASONAL_FESTIVAL": { label: "Seasonal", icon: seasonalImg, isEmoji: false },
    "MISCELLANEOUS": { label: "Others", icon: miscImg, isEmoji: false }
};

// 🛠️ Alias Resolver
const resolveCategory = (cat) => {
    if (!cat) return "MISCELLANEOUS";
    const upper = cat.toUpperCase();
    if (upper === "FRUITS") return "FRUITS_VEGETABLES";
    if (upper === "STAPLES") return "STAPLES_GRAINS";
    if (upper === "SPICES") return "SPICES_MASALAS";
    if (upper === "OIL") return "COOKING_OILS_GHEE";
    if (upper === "DAIRY") return "DAIRY_PRODUCTS";
    if (upper === "BAKERY") return "BAKERY_BREAD";
    if (upper === "SNACKS") return "SNACKS_PACKAGED";
    return CATEGORY_DATA[upper] ? upper : "MISCELLANEOUS";
};

function CustomerMarketplace({ products: propProducts, cart, addToCart, removeFromCart, isGlobal = false, retailerName, retailerIsVerified }) {
    const [products, setProducts] = useState(propProducts || []);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [locationStatus, setLocationStatus] = useState("Detecting location...");
    const [userLocation, setUserLocation] = useState(null); // 🌍 Location State
    const [selectedCategory, setSelectedCategory] = useState("ALL"); // ✅ Category State
    const [loading, setLoading] = useState(false);
    const [shops, setShops] = useState([]); // 🏪 Nearby Shops
    const [selectedRetailerId, setSelectedRetailerId] = useState(null); // 🎯 Shop Filter
    const [retailerFilterData, setRetailerFilterData] = useState(null); 

    useEffect(() => {
        if (isGlobal) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        setLocationStatus("Showing nearby products 📍");
                    },
                    (error) => {
                        setLocationStatus("Showing all products (Location denied)");
                        loadGlobalProducts(null);
                    }
                );
            } else {
                setLocationStatus("Geolocation not supported");
                loadGlobalProducts(null);
            }
        } else {
            setProducts(propProducts || []);
        }
    }, [isGlobal, propProducts]);

    useEffect(() => {
        if (isGlobal && userLocation) {
            loadGlobalProducts(userLocation);
            loadNearbyShops(userLocation);
        }
    }, [userLocation, isGlobal]);

    const loadNearbyShops = async (loc) => {
        try {
            const res = await axiosClient.get("/retailer/nearby", {
                params: { lat: loc.lat, lng: loc.lng, radius: 10 }
            });
            setShops(res.data || []);
        } catch (err) {
            console.error("Failed to load nearby shops", err);
        }
    };

    useEffect(() => {
        let list = Array.isArray(products) ? products : [];
        
        // 1. Filter by Retailer if selected
        if (selectedRetailerId) {
            list = list.filter(p => p.retailerId === selectedRetailerId);
        }

        // 2. Filter by Category
        if (selectedCategory !== "ALL") {
            list = list.filter(p => p.category === selectedCategory);
        }

        setFilteredProducts(list);
    }, [selectedCategory, products, selectedRetailerId]);

    const loadGlobalProducts = async (location = null) => {
        try {
            setLoading(true);
            const res = await getAllProducts(location);
            const rawProducts = res.data || [];

            // 🔄 DE-DUPLICATE (Global Market can have duplicates across retailers/categories)
            const seen = new Map();
            rawProducts.forEach(p => {
                const key = (p.barcode || p.name).toLowerCase().trim();
                const existing = seen.get(key);
                // Priority: Keep if it has a specific category, MRP, or is the first found
                if (!existing || (existing.category === 'MISCELLANEOUS' && p.category !== 'MISCELLANEOUS')) {
                    seen.set(key, p);
                }
            });

            setProducts(Array.from(seen.values()));
        } catch (err) {
            console.error("Failed to load global products", err);
        } finally {
            setLoading(false);
        }
    };

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const submitReport = async () => {
        if (!reportReason) {
            toast.warning("Please select a reason to report.");
            return;
        }

        let customerAccounts = [];
        try { customerAccounts = JSON.parse(sessionStorage.getItem("customer_accounts") || "[]"); } catch (e) { }

        if (customerAccounts.length === 0 || !customerAccounts[0].email) {
            toast.error("Please log in to report a product.");
            return;
        }

        try {
            setIsSubmittingReport(true);
            const response = await fetch("http://localhost:8080/api/reports/product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    customerEmail: customerAccounts[0].email,
                    reason: reportReason
                })
            });

            if (response.ok) {
                toast.success("Report submitted. We'll investigate this shop.");
                setShowReportModal(false);
                setReportReason("");
            } else {
                toast.error("Failed to submit report.");
            }
        } catch (error) {
            toast.error("Network error submitting report.");
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setCurrentImageIndex(0);
        document.body.style.overflow = 'hidden';
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
        document.body.style.overflow = 'auto';
    };

    const getProductMockImages = (product) => {
        const catData = CATEGORY_DATA[resolveCategory(product.category)] || { icon: "📦", isEmoji: true };
        
        const renderIcon = (size = '80px') => (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                {catData.isEmoji || typeof catData.icon !== 'string' || !catData.icon.includes('/') ? (
                    <span style={{ fontSize: size }}>{catData.icon}</span>
                ) : (
                    <img src={catData.icon} alt={product.category} style={{ width: '80%', height: '80%', objectFit: 'contain', opacity: 0.9 }} />
                )}
            </div>
        );

        if (product.imageUrl && typeof product.imageUrl === 'string') {
            return [
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />,
                renderIcon(),
                <div style={{ fontSize: '80px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✨</div>
            ];
        }
        
        return [
            renderIcon(),
            <div style={{ fontSize: '80px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📸</div>,
            <div style={{ fontSize: '80px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✨</div>
        ];
    };

    const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % 3);
    const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + 3) % 3);

    if (loading) return <div className="loader">Loading Market...</div>;

    const safeProducts = Array.isArray(products) ? products : [];

    // Helper to handle shop click
    const handleShopSelect = (shop) => {
        setSelectedRetailerId(shop.retailerId);
        setRetailerFilterData(shop);
        // Reset category to see all products of that shop initially? 
        // User said "product catalog of shop only", so all products.
        setSelectedCategory("ALL"); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="customer-body">
            {isGlobal && !selectedRetailerId && shops.length > 0 && (
                <div className="shop-discovery-section fade-in" style={{ padding: '20px 0 10px 0' }}>
                    <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Store size={18} color="#3b82f6" /> Discover Local Shops
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>{shops.length} Nearby</span>
                    </div>
                    <div className="shop-scroll-row" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '0 20px 10px 20px', scrollbarWidth: 'none' }}>
                        {shops.map(shop => {
                            const rating = shop.rating ? Number(shop.rating).toFixed(1) : "4.5";
                            const ratingCount = shop.ratingCount || 0;
                            const time = Math.floor(20 + Math.random() * 25);
                            
                            // Calculate min price for this shop from loaded products
                            const shopProducts = products.filter(p => p.retailerId === shop.retailerId);
                            const minPrice = shopProducts.length > 0 
                                ? Math.min(...shopProducts.map(p => p.currentPrice || p.price))
                                : 0;

                            return (
                                <div 
                                    key={shop.retailerId} 
                                    className="swiggy-card"
                                    onClick={() => handleShopSelect(shop)}
                                    style={{ minWidth: '240px' }}
                                >
                                    <div className="swiggy-img-container">
                                        <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                                            <Store size={48} color="#3b82f6" strokeWidth={1} />
                                        </div>
                                        <div className="swiggy-overlay">
                                            <div className="swiggy-promo-text">
                                                {minPrice > 0 ? `ITEMS STARTS AT ₹${minPrice}` : 'FREE DELIVERY'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="swiggy-info">
                                        <h5 className="swiggy-name">{shop.shopName || shop.name}</h5>
                                        <div className="swiggy-rating-row">
                                            <div className="swiggy-rating-badge">★</div>
                                            <span className="swiggy-rating-text">{rating} ({ratingCount})</span>
                                            <span className="swiggy-dot">•</span>
                                            <span className="swiggy-time">{time}-{time+10} mins</span>
                                        </div>
                                        <div className="swiggy-sub-info">Verified, Local Shop</div>
                                        <div className="swiggy-location">{shop.distance?.toFixed(1)} km away</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isGlobal && (
                <div style={{ background: '#f0fdf4', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.9rem', borderBottom: '1px solid #dcfce7' }}>
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                    <span><strong>Customer Protection:</strong> Buy from verified shops (✅) for guaranteed quality and safe returns.</span>
                </div>
            )}

            {/* 1. Category Bar */}
            <div className="category-scroll-container">
                <div className="category-list">
                    {Object.entries(CATEGORY_DATA).map(([key, data]) => (
                        <div
                            key={key}
                            className={`category-item ${selectedCategory === key ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(key)}
                        >
                            <div className="cat-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {data.isEmoji || typeof data.icon !== 'string' || !data.icon.includes('/') ? (
                                    <span style={{ fontSize: '24px' }}>{data.icon}</span>
                                ) : (
                                    <img src={data.icon} alt={data.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </div>
                            <span className="cat-label">{data.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Section Header */}
            <div style={{ padding: '0 20px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 className="section-title" style={{ margin: 0 }}>
                        {selectedCategory === "ALL" ? "All Products" : CATEGORY_DATA[selectedCategory].label}
                    </h3>
                    {selectedRetailerId && (
                        <button 
                            onClick={() => { setSelectedRetailerId(null); setRetailerFilterData(null); }}
                            style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                        >
                            Back to All
                        </button>
                    )}
                </div>
                
                {(retailerName || retailerFilterData) && (
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        Shopping at
                        <span style={{ fontWeight: 600, color: '#3b82f6', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {retailerFilterData?.shopName || retailerFilterData?.name || retailerName}
                            {(retailerIsVerified || retailerFilterData?.isVerified) && (
                                <svg title="Verified by Khatha Wallet" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#3b82f6" />
                                </svg>
                            )}
                        </span>
                        {retailerFilterData && (
                            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                                ★ {retailerFilterData.rating ? Number(retailerFilterData.rating).toFixed(1) : "4.5"} ({retailerFilterData.ratingCount || 0})
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* 3. Product Grid / Category Layout */}
            {filteredProducts.length === 0 ? (
                <div className="empty-state-premium fade-in">
                    <div className="empty-icon-wrapper">
                        <ShoppingBag size={80} strokeWidth={1} />
                    </div>
                    <h3>No products found</h3>
                    <p>Try a different category or check back later.</p>
                </div>
            ) : (
                <div className="swiggy-grid">
                    {filteredProducts.map((product) => {
                        const price = product.currentPrice || product.price || product.sellingPrice;
                        const hasDiscount = product.mrp && product.mrp > price;
                        const discountPercent = hasDiscount ? Math.round(((product.mrp - price) / product.mrp) * 100) : 0;
                        const rating = (4.0 + Math.random() * 1.0).toFixed(1);
                        const time = Math.floor(15 + Math.random() * 20);

                        return (
                            <div
                                key={product.barcode || product.id}
                                className="swiggy-card"
                                onClick={() => openProductModal(product)}
                            >
                                <div className="swiggy-img-container">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="swiggy-img" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {CATEGORY_DATA[resolveCategory(product.category)]?.isEmoji ? (
                                                <span style={{ fontSize: '48px' }}>{CATEGORY_DATA[resolveCategory(product.category)]?.icon || "📦"}</span>
                                            ) : (
                                                <img 
                                                    src={CATEGORY_DATA[resolveCategory(product.category)]?.icon} 
                                                    alt={product.category} 
                                                    style={{ width: '80%', height: '80%', objectFit: 'contain', opacity: 0.9 }} 
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div className="swiggy-overlay">
                                        <div className="swiggy-promo-text">
                                            {hasDiscount ? `${discountPercent}% OFF UPTO ₹${Math.round((product.mrp - price))}` : `₹${price}`}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="swiggy-info">
                                    <h4 className="swiggy-name">{product.name}</h4>
                                    <div className="swiggy-sub-info">
                                        {CATEGORY_DATA[resolveCategory(product.category)]?.label}, {product.unit || 'per unit'}
                                    </div>
                                    <div className="swiggy-location">
                                        {product.retailerName || "Khatha Wallet Local"}
                                    </div>
                                    
                                    <div className="swiggy-cart-controls">
                                        {cart[product.barcode] ? (
                                            <div className="qty-control" onClick={(e) => e.stopPropagation()} style={{ width: '100px', height: '36px' }}>
                                                <button onClick={() => removeFromCart(product.barcode)}><Minus size={16} /></button>
                                                <span>{cart[product.barcode].qty}</span>
                                                <button onClick={() => addToCart(product)}><Plus size={16} /></button>
                                            </div>
                                        ) : (
                                            <button
                                                className={`swiggy-add-btn ${product.quantity <= 0 ? 'disabled' : ''}`}
                                                disabled={product.quantity <= 0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (product.quantity <= 0) return;
                                                    addToCart(product);
                                                }}
                                            >
                                                {product.quantity <= 0 ? 'SOLD OUT' : 'ADD'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* 4. Centered Detail Modal */}
            {selectedProduct && (
                <div className="modal-backdrop" onClick={closeProductModal}>
                    <div className="modal-content-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-actions">
                            <button className="close-btn-ghost" onClick={closeProductModal}>
                                <ChevronLeft size={24} />
                            </button>
                            <div style={{ display: 'flex', gap: '15px', color: '#64748b' }}>
                                <button
                                    className="close-btn-ghost"
                                    style={{ color: '#ef4444' }}
                                    onClick={() => setShowReportModal(true)}
                                    title="Report this product"
                                >
                                    <Flag size={20} />
                                </button>
                                <Tag size={20} />
                                <MapPin size={20} />
                            </div>
                        </div>

                        <div className="modal-body-scroll">
                            <div className="product-detail-img-container">
                                <div className="carousel-track" style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}>
                                    {getProductMockImages(selectedProduct).map((img, index) => (
                                        <div key={index} className="carousel-slide">{img}</div>
                                    ))}
                                </div>
                                <button className="carousel-btn left" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft size={24} /></button>
                                <button className="carousel-btn right" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight size={24} /></button>
                                <div className="carousel-dots">
                                    {[0, 1, 2].map(i => (
                                        <span key={i} className={`dot ${currentImageIndex === i ? 'active' : ''}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="product-detail-info">
                                <h2>{selectedProduct.name}</h2>
                                <p className="product-detail-unit">
                                    {selectedProduct.unit || (selectedProduct.productType === 'WEIGHT' ? '1 kg' : selectedProduct.productType === 'LIQUID' ? '1 L' : 'per unit')}
                                </p>

                                <div className="product-detail-price">
                                    <span className="current-price-lg">₹{selectedProduct.currentPrice || selectedProduct.price}</span>
                                    {selectedProduct.mrp && selectedProduct.mrp > (selectedProduct.currentPrice || selectedProduct.price) && (
                                        <>
                                            <span className="mrp-lg">₹{selectedProduct.mrp}</span>
                                            <span className="discount-badge-lg">
                                                {Math.round(((selectedProduct.mrp - (selectedProduct.currentPrice || selectedProduct.price)) / selectedProduct.mrp) * 100)}% OFF
                                            </span>
                                        </>
                                    )}
                                </div>

                                {selectedProduct.quantity <= 0 ? (
                                    <div className="stock-status-detail out">Temporarily Out of Stock</div>
                                ) : selectedProduct.quantity <= 5 ? (
                                    <div className="stock-status-detail low">Hurry! Only {selectedProduct.quantity} left in stock</div>
                                ) : null}

                                <div className="detail-section">
                                    <h4>Description</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                                        {selectedProduct.description || "No description available for this premium product."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-fixed">
                            {cart[selectedProduct.barcode] ? (
                                <div className="qty-control" style={{ height: '54px', padding: '0 24px', width: '100%', borderRadius: '16px' }}>
                                    <button onClick={() => removeFromCart(selectedProduct.barcode)}>
                                        <Minus size={24} />
                                    </button>
                                    <span style={{ fontSize: '20px', fontWeight: '800' }}>{cart[selectedProduct.barcode].qty}</span>
                                    <button onClick={() => addToCart(selectedProduct)}>
                                        <Plus size={24} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className={`add-btn-large ${selectedProduct.quantity <= 0 ? 'disabled' : ''}`}
                                    disabled={selectedProduct.quantity <= 0}
                                    onClick={() => addToCart(selectedProduct)}
                                >
                                    {selectedProduct.quantity <= 0 ? 'ITEM OUT OF STOCK' : 'ADD TO CART'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Nav Section (Floating at bottom of backdrop) */}
                    {safeProducts.filter(p => p.category === selectedProduct.category && p.barcode !== selectedProduct.barcode).length > 0 && (
                        <div className="modal-quick-nav-container" onClick={(e) => e.stopPropagation()}>
                            <div className="quick-nav-header" style={{ padding: '0 20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    More in {CATEGORY_DATA[resolveCategory(selectedProduct.category)]?.label || 'Related'}
                                </span>
                            </div>
                            <div className="quick-nav-scroll">
                                {safeProducts
                                    .filter(p => p.category === selectedProduct.category && p.barcode !== selectedProduct.barcode)
                                    .slice(0, 15)
                                    .map((p) => (
                                        <div
                                            key={p.barcode}
                                            className="quick-nav-item related"
                                            onClick={() => openProductModal(p)}
                                        >
                                            <div className="quick-nav-img-circle" style={{ overflow: 'hidden' }}>
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                                                        {CATEGORY_DATA[resolveCategory(p.category)]?.isEmoji ? (
                                                            <span style={{ fontSize: '24px' }}>{CATEGORY_DATA[resolveCategory(p.category)]?.icon || "📦"}</span>
                                                        ) : (
                                                            <img 
                                                                src={CATEGORY_DATA[resolveCategory(p.category)]?.icon} 
                                                                alt={p.category} 
                                                                style={{ width: '80%', height: '80%', objectFit: 'contain', opacity: 0.8 }} 
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="quick-nav-price" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', marginTop: '-10px', zIndex: 1 }}>₹{p.currentPrice || p.price}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. Report Modal */}
            {showReportModal && (
                <div className="modal-backdrop" onClick={() => setShowReportModal(false)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '24px', borderRadius: '16px' }}>
                        <h3 style={{ marginTop: 0, color: '#e30022', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Flag size={20} /> Report Product
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px' }}>
                            Help us keep Khatha Wallet safe. Why are you reporting <strong>{selectedProduct?.name}</strong>?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {["Fake/Counterfeit Product", "Misleading Image/Description", "Price is significantly higher than MRP", "Inappropriate Content"].map((reason) => (
                                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: reportReason === reason ? '2px solid #ef4444' : '1px solid #e2e8f0' }}>
                                    <input
                                        type="radio"
                                        name="reportReason"
                                        value={reason}
                                        checked={reportReason === reason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        style={{ accentColor: '#ef4444' }}
                                    />
                                    <span style={{ fontSize: '0.95rem', fontWeight: reportReason === reason ? 600 : 400 }}>{reason}</span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowReportModal(false)}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitReport}
                                disabled={!reportReason || isSubmittingReport}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: (!reportReason || isSubmittingReport) ? 'not-allowed' : 'pointer', opacity: (!reportReason || isSubmittingReport) ? 0.7 : 1 }}
                            >
                                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerMarketplace;

