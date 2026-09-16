import { useEffect, useState } from "react";
import axiosClient from "./api/axiosClient";
import MobileScanner from "./MobileScanner";
import { toast } from "react-toastify";
import {
  ArrowLeft, Search, Plus, Trash2, Edit2,
  Package, ScanBarcode, ChevronLeft, ChevronRight, Filter, Printer, ChevronUp, AlertTriangle, XCircle, CheckCircle, FilePlus, Image, Download
} from "lucide-react";
import Barcode from "react-barcode";
import { createRoot } from "react-dom/client";
import { scanProduct, lookupUPC, uploadProductImage } from "./api/productApi"; // ✅ IMPORT

import "./product.css";

/* ================= CATEGORY LIST ================= */
const PRODUCT_CATEGORIES = [
  { value: "FRUITS_VEGETABLES", label: "Fruits & Vegetables" },
  { value: "STAPLES_GRAINS", label: "Staples & Grains" },
  { value: "SPICES_MASALAS", label: "Spices & Masalas" },
  { value: "COOKING_OILS_GHEE", label: "Cooking Oils & Ghee" },
  { value: "DAIRY_PRODUCTS", label: "Dairy Products" },
  { value: "BAKERY_BREAD", label: "Bakery & Bread" },
  { value: "SNACKS_PACKAGED", label: "Snacks & Packaged Foods" },
  { value: "READY_TO_EAT", label: "Ready to Eat / Cook" },
  { value: "MEAT_FISH_EGGS", label: "Meat, Fish & Eggs" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "PERSONAL_CARE", label: "Personal Care" },
  { value: "HOUSEHOLD_CLEANING", label: "Household & Cleaning" },
  { value: "BABY_CARE", label: "Baby Care" },
  { value: "HEALTH_WELLNESS", label: "Health & Wellness" },
  { value: "PET_CARE", label: "Pet Care" },
  { value: "PAPER_DISPOSABLES", label: "Paper & Disposables" },
  { value: "SEASONAL_FESTIVAL", label: "Seasonal & Festival" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" }
];

const LOW_STOCK_THRESHOLD = 10;

function Products({ onBack }) {
  const retailerId = sessionStorage.getItem("retailerId");
  const [products, setProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showScanner, setShowScanner] = useState(false); // ✅ SCANNER STATE
  const [editingProduct, setEditingProduct] = useState(null); // ✅ EDIT MODAL STATE

  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "", // ✅ NEW
    price: "",
    priceQuantity: "1", // ✅ Default to 1 unit
    productType: "WEIGHT",
    category: "",
    bagSizeKg: "",
    packetsPerBox: "",
    packetSize: "",
    unitsPerBox: "",
    boxes: "",
    unit: "",
    imageUrl: "" // ✅ NEW
  });

  const loadProducts = async () => {
    const res = await axiosClient.get("/products", {
      params: { retailerId, includeAllStatuses: true }
    });
    setProducts(res.data || []);
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isScanning, setIsScanning] = useState(false);

  const handleExport = () => {
    const csvRows = [];
    csvRows.push(["Name", "Category", "Price", "Stock", "Type", "Barcode"]);

    products.forEach(p => {
      csvRows.push([
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.category,
        p.price,
        p.quantity,
        p.productType,
        `"${p.barcode || ""}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ IMAGE COMPRESSION LOGIC
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.8 // Slightly higher quality
          );
        };
      };
    });
  };

  const fetchProductDetails = async () => {
    if (!newProduct.barcode) {
      toast.warn("Please enter a barcode first");
      return;
    }

    try {
      setIsScanning(true);
      const data = await lookupUPC(newProduct.barcode);
      // Backend now returns status: "OK" or "NOT_FOUND"
      if (data && data.status === "OK") {
        setNewProduct(prev => ({
          ...prev,
          name: data.name || prev.name,
          imageUrl: data.imageUrl || prev.imageUrl,
          category: prev.category || "MISCELLANEOUS"
        }));
        toast.success("Product details fetched!");
      } else {
        // If not found, we just inform the user and let them type manually
        toast.info(data.message || "Not found in Open Food Facts. You can enter details manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lookup failed. Please enter details manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.info("Uploading image...");
      const res = await uploadProductImage(file);
      if (res.data && res.data.imageUrl) {
        setNewProduct(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
        toast.success("Image uploaded!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed.");
    }
  };

  const handleScannerResult = async (barcode) => {
    setShowScanner(false);
    toast.info(`🔍 Scanned: ${barcode}. Auto-filling...`);
    setNewProduct(prev => ({ ...prev, barcode }));
    setShowAddForm(true);

    // Auto-fetch details after short delay to ensure state update
    setTimeout(async () => {
      try {
        setIsScanning(true);
        const data = await lookupUPC(barcode);
        if (data && data.status === "OK") {
          setNewProduct(prev => ({
            ...prev,
            name: data.name || prev.name,
            imageUrl: data.imageUrl || prev.imageUrl,
            category: prev.category || "MISCELLANEOUS"
          }));
          toast.success("Details Auto-filled!");
        } else {
          toast.warn("Barcode recognized, but no web details found.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to auto-fill details");
      } finally {
        setIsScanning(false);
      }
    }, 100);
  };

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsScanning(true);

      console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      const compressedFile = await compressImage(file);
      console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      const res = await scanProduct(compressedFile);
      const { id, name, ocrText, confidence, barcode, price } = res.data;

      if (id) {
        // Product exists
        setSearchTerm(name); // Search for it in the table
        toast.success(`Match Found: ${name}`);
      } else {
        // Not found - SUGGEST ADDING NEW
        let likelyName = (name && name !== "UNKNOWN") ? name : (ocrText || "");

        setNewProduct(prev => ({
          ...prev,
          name: likelyName,
          barcode: barcode || "",
          price: price || ""
        }));

        setShowAddForm(true);
        if (likelyName) {
          const priceMsg = price > 0 ? ` (Price: ₹${price})` : "";
          toast.info(`📝 Suggested: "${likelyName}"${priceMsg}. Please verify details.`);
        } else {
          toast.warn("⚠️ Product not recognized. Please enter manually.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Scan Failed. Please try again or enter manually.");
    } finally {
      setIsScanning(false);
      e.target.value = null; // Reset input
    }
  };



  const addProduct = async () => {
    const { name, barcode, price, productType, category, boxes, priceQuantity } = newProduct;

    if (!name || !price || !category || !boxes) {
      toast.error("Name, price, category and initial boxes are required");
      return;
    }

    // ✅ Calculate Unit Price
    const qty = Number(priceQuantity) || 1;
    if (qty <= 0) {
      toast.error("Price quantity must be greater than 0");
      return;
    }
    const unitPrice = Number(price) / qty;

    const payload = {
      name,
      price: unitPrice,
      productType,
      category,
      barcode,
      unit: newProduct.unit, // ✅ NEW
      imageUrl: newProduct.imageUrl
    }; // ✅ Use Calculated Unit Price

    if (productType === "WEIGHT") {
      if (!newProduct.bagSizeKg) {
        toast.error("Bag size required");
        return;
      }
      payload.bagSizeKg = Number(newProduct.bagSizeKg);
    }

    if (productType === "LIQUID") {
      if (!newProduct.packetsPerBox || !newProduct.packetSize) {
        toast.error("Liquid configuration required");
        return;
      }
      payload.packetsPerBox = Number(newProduct.packetsPerBox);
      payload.packetSize = Number(newProduct.packetSize);
    }

    if (productType === "UNIT") {
      if (!newProduct.unitsPerBox) {
        toast.error("Units per box required");
        return;
      }
      payload.unitsPerBox = Number(newProduct.unitsPerBox);
    }

    try {
      await axiosClient.post("/products", payload, {
        params: { retailerId, boxes }
      });

      setNewProduct({
        name: "",
        barcode: "",
        price: "",
        priceQuantity: "1", // ✅ Reset to 1
        productType: "WEIGHT",
        category: "",
        bagSizeKg: "",
        packetsPerBox: "",
        packetSize: "",
        unitsPerBox: "",
        boxes: "",
        unit: "",
        imageUrl: ""
      });

      toast.success("Product added successfully!");
      loadProducts();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data || "Failed to add product";
      toast.error(typeof msg === 'string' ? msg : "Failed to add product");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axiosClient.delete(`/products/${id}`, {
        params: { retailerId }
      });
      toast.success("Product deleted");
      loadProducts();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete product");
    }
  };

  const addStock = async (product, boxes) => {
    if (!boxes || boxes <= 0) {
      toast.error("Enter valid boxes");
      return;
    }

    if (
      (product.productType === "WEIGHT" && !product.bagSizeKg) ||
      (product.productType === "LIQUID" &&
        (!product.packetsPerBox || !product.packetSize)) ||
      (product.productType === "UNIT" && !product.unitsPerBox)
    ) {
      toast.error("Stock configuration missing. Edit product first.");
      return;
    }

    await axiosClient.post(
      `/products/${product.id}/add-stock`,
      null,
      { params: { boxes } }
    );

    loadProducts();
  };

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? p.category === filterCategory : true;
    const matchesLowStock = filterLowStock ? p.quantity <= LOW_STOCK_THRESHOLD : true;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handlePrintBarcode = (product) => {
    if (!product.barcode) {
      toast.error("No barcode to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=400,height=400");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: Arial, sans-serif;
            }
            .label { text-align: center; }
            .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .price { font-size: 12px; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name}</div>
            <div id="barcode-container"></div>
            <div class="price">Rs. ${product.price}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Render React component into the new window
    const container = printWindow.document.getElementById("barcode-container");
    const root = createRoot(container);
    root.render(
      <Barcode
        value={product.barcode}
        width={1.5}
        height={40}
        fontSize={12}
      />
    );

    // Wait for render then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="products-page">

      {/* HEADER */}
      {/* HEADER */}
      <div className="products-header">
        <div className="header-left">
          <button className="btn-back-square" onClick={onBack} title="Go Back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2>📦 Products</h2>
            <p>Manage your stock levels and pricing</p>
          </div>
        </div>

        <div className="header-actions">
          {/* BARCODE SCANNER (ENABLED) */}
          <button
            className="btn icon-btn secondary"
            onClick={() => setShowScanner(true)}
            title="Scan Barcode"
          >
            <ScanBarcode size={18} />
          </button>

          <button
            className="btn secondary"
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Export to Excel"
          >
            <Download size={18} />
            <span className="desktop-only">Excel</span>
          </button>

          <button
            className={`btn ${showAddForm ? 'secondary' : 'primary'} large-primary-btn`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <ChevronUp size={20} /> : <Plus size={20} />}
            <span>{showAddForm ? "Close Form" : "Add New Product"}</span>
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="glass-card stat-card blue">
          <div className="stat-icon"><Package size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Total SKUs</div>
          </div>
        </div>

        <div className="glass-card stat-card orange">
          <div className="stat-icon"><AlertTriangle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">
              {products.filter(p => p.quantity <= LOW_STOCK_THRESHOLD && p.quantity > 0).length}
            </div>
            <div className="stat-label">Low Stock items</div>
          </div>
        </div>

        <div className="glass-card stat-card red">
          <div className="stat-icon"><XCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">
              {products.filter(p => p.quantity <= 0).length}
            </div>
            <div className="stat-label">Out of Stock</div>
          </div>
        </div>
      </div>

      {/* 4. FILTERS & SEARCH */}
      <div className="glass-card filters-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-wrapper">
          <Filter className="filter-icon" size={16} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* LOW STOCK FILTER BUTTON */}
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', border: '1.5px solid',
            borderColor: filterLowStock ? '#ef4444' : '#e5e7eb',
            background: filterLowStock ? '#fef2f2' : 'white',
            color: filterLowStock ? '#ef4444' : '#374151',
            whiteSpace: 'nowrap'
          }}
        >
          🔴 Low Stock
          {lowStockCount > 0 && (
            <span style={{
              background: filterLowStock ? '#ef4444' : '#fee2e2',
              color: filterLowStock ? 'white' : '#ef4444',
              borderRadius: '20px', padding: '1px 7px', fontSize: '12px', fontWeight: 700
            }}>
              {lowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* ADD PRODUCT CARD */}
      {/* 4. ADD PRODUCT CARD */}
      {showAddForm && (
        <div className="glass-card add-product-section slide-down">
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '10px' }}>
                <Plus size={20} />
              </div>
              <h3>Add New Product</h3>
            </div>
          </div>

          <div className="add-product-grid">
            {/* NAME */}
            <div className="input-group">
              <label><Package size={14} /> Product Name</label>
              <input
                placeholder="e.g. Tomato Madness"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
              />
            </div>

            {/* BARCODE */}
            <div className="input-group">
              <label><ScanBarcode size={14} /> Barcode (Optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Scan or type barcode"
                  value={newProduct.barcode}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, barcode: e.target.value })
                  }
                />
                <button
                  className="btn secondary"
                  onClick={fetchProductDetails}
                  disabled={isScanning}
                  style={{ whiteSpace: 'nowrap', padding: '0 16px', height: '44px' }}
                >
                  {isScanning ? "..." : "Auto-fill"}
                </button>
              </div>
            </div>

            {/* IMAGE URL / UPLOAD */}
            <div className="input-group">
              <label><FilePlus size={14} /> Product Image</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder="Paste URL or Upload"
                  style={{ flex: 1 }}
                  value={newProduct.imageUrl}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, imageUrl: e.target.value })
                  }
                />
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="manual-product-image"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="manual-product-image" className="btn secondary" style={{ margin: 0, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image size={18} />
                  </label>
                </div>
              </div>
            </div>

            {/* PREVIEW ROW */}
            {(newProduct.imageUrl || newProduct.barcode || newProduct.unit) && (
              <div className="form-preview-container">
                <div className="form-image-preview">
                  {newProduct.imageUrl ? (
                    <img src={newProduct.imageUrl} alt="Preview" />
                  ) : (
                    <Package size={24} color="#cbd5e1" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    {newProduct.name || "Product Preview"}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {newProduct.barcode || "No Barcode"} {newProduct.unit && `• ${newProduct.unit}`}
                  </div>
                </div>
              </div>
            )}

            {/* PRICE & QTY */}
            <div className="input-group">
              <label>Price (₹) for Quantity</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Price"
                  type="number"
                  min="0"
                  style={{ flex: 1.5 }}
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: Math.max(0, Number(e.target.value)) || "" })
                  }
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
                <input
                  placeholder="Qty"
                  type="number"
                  min="1"
                  style={{ flex: 1 }}
                  value={newProduct.priceQuantity}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, priceQuantity: Math.max(1, Number(e.target.value)) || "1" })
                  }
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
                <select
                  style={{ flex: 1.5 }}
                  value={newProduct.productType}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, productType: e.target.value })
                  }
                >
                  <option value="WEIGHT">kg</option>
                  <option value="LIQUID">L</option>
                  <option value="UNIT">Unit</option>
                </select>
              </div>
            </div>

            {/* CATEGORY & UNIT */}
            <div className="input-row-flex" style={{ display: 'flex', gap: '8px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label><Filter size={14} /> Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, category: e.target.value })
                  }
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label>Display Unit (e.g. 1kg, 500g)</label>
                <input
                  placeholder="e.g. 500g"
                  value={newProduct.unit}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, unit: e.target.value })
                  }
                />
              </div>
            </div>

            {/* INITIAL STOCK */}
            <div className="input-group">
              <label>Initial Opening Stock (Boxes)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={newProduct.boxes}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, boxes: Math.max(0, Number(e.target.value)) || "" })
                }
                onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
              />
            </div>

            {/* DYNAMIC FIELDS BASED ON PRODUCT TYPE */}
            {newProduct.productType === "WEIGHT" && (
              <div className="input-group">
                <label>Bag Size (kg)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={newProduct.bagSizeKg}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, bagSizeKg: Math.max(0, Number(e.target.value)) || "" })
                  }
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
              </div>
            )}
            {newProduct.productType === "UNIT" && (
              <div className="input-group">
                <label>Units per Box</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 24"
                  value={newProduct.unitsPerBox}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, unitsPerBox: Math.max(0, Number(e.target.value)) || "" })
                  }
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
              </div>
            )}
            {newProduct.productType === "LIQUID" && (
              <>
                <div className="input-group">
                  <label>Packets per Box</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={newProduct.packetsPerBox}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, packetsPerBox: Math.max(0, Number(e.target.value)) || "" })
                    }
                    onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                  />
                </div>
                <div className="input-group">
                  <label>Packet Size (L)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1"
                    value={newProduct.packetSize}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, packetSize: Math.max(0, Number(e.target.value)) || "" })
                    }
                    onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                  />
                </div>
              </>
            )}

            {/* ACTION */}
            <div className="input-group" style={{ justifyContent: 'flex-end', paddingTop: '24px' }}>
              <button className="btn primary" onClick={addProduct} style={{ height: '52px', fontSize: '16px' }}>
                <Plus size={20} />
                Confirm & Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PRODUCTS TABLE */}
      <div className="glass-card products-card" style={{ padding: 0, overflowX: 'auto', position: 'relative' }}>
        <table className="modern-table" style={{ tableLayout: 'fixed', minWidth: '950px' }}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Barcode</th>
              <th>Total Stock</th>
              <th>Add Stock</th>
              <th className="action-col">Action</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                  {searchTerm ? "No products found" : "No products added yet"}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onAddStock={addStock}
                  onDelete={deleteProduct}
                  onPrint={handlePrintBarcode}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE CARDS ===== */}
      <div className="mobile-cards">
        {filteredProducts.map((p) => (
          <MobileProductCard
            key={p.id}
            product={p}
            onAddStock={addStock}
            onDelete={deleteProduct}
            onPrint={handlePrintBarcode}
            onEdit={(product) => setEditingProduct(product)}
            LOW_STOCK_THRESHOLD={LOW_STOCK_THRESHOLD}
          />
        ))}
      </div>

      {/* ✅ BARCODE SCANNER MODAL */}
      {showScanner && (
        <MobileScanner
          onScan={handleScannerResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ✅ MOBILE EDIT MODAL (Top Level) */}
      {editingProduct && (
        <MobileProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

/* PRODUCT ROW */
function ProductRow({ product, onAddStock, onDelete, onPrint }) { // ✅ Receive onPrint
  const [boxes, setBoxes] = useState("");
  const [editing, setEditing] = useState(false);

  const [editData, setEditData] = useState({
    price: product.price,
    category: product.category,
    bagSizeKg: product.bagSizeKg || "",
    packetSize: product.packetSize || "",
    packetsPerBox: product.packetsPerBox || "",
    unitsPerBox: product.unitsPerBox || "",
    unit: product.unit || "",
    imageUrl: product.imageUrl || ""
  });

  const saveEdit = async () => {
    try {
      await axiosClient.put(`/products/${product.id}`, editData);
      toast.success("Product updated");
      setEditing(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    }
  };

  const unit =
    product.productType === "WEIGHT"
      ? "kg"
      : product.productType === "LIQUID"
        ? "L"
        : "pcs";

  return (
    <tr>
      <td>
        <div className="table-img-container">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="table-img-placeholder"><Package size={16} /></div>
          )}
        </div>
      </td>
      <td>
        <div style={{ fontWeight: 600 }}>{product.name}</div>
        {product.approvalStatus && product.approvalStatus !== 'APPROVED' && (
          <span style={{ 
            fontSize: '9px', 
            fontWeight: 800, 
            padding: '2px 6px', 
            borderRadius: '4px', 
            marginTop: '4px', 
            display: 'inline-block',
            background: product.approvalStatus === 'PENDING' ? '#fef3c7' : '#fee2e2',
            color: product.approvalStatus === 'PENDING' ? '#b45309' : '#b91c1c',
            border: product.approvalStatus === 'PENDING' ? '1px solid #fde68a' : '1px solid #fca5a5'
          }}>
            {product.approvalStatus === 'PENDING' ? 'PENDING APPROVAL' : 'REJECTED BY ADMIN'}
          </span>
        )}
      </td>

      <td>
        {editing ? (
          <select
            value={editData.category}
            onChange={(e) =>
              setEditData({ ...editData, category: e.target.value })
            }
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="status-pill pill-info" style={{ textTransform: 'none', fontWeight: 600 }}>
            {product.category.replaceAll("_", " ")}
          </span>
        )}
      </td>

      <td>
        {editing ? (
          <input
            type="number"
            min="0"
            value={editData.price}
            onChange={(e) =>
              setEditData({ ...editData, price: Math.max(0, Number(e.target.value)) || "" })
            }
            onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
          />
        ) : (
          <span style={{ fontWeight: 700, color: 'hsl(var(--primary-h), var(--primary-s), var(--primary-l))' }}>
            ₹ {product.price}
          </span>
        )}
      </td>

      {/* ✅ BARCODE / EDIT TYPE-SPECIFIC */}
      <td style={{ textAlign: "center" }}>
        {editing ? (
          <div className="edit-input-group">
            {product.productType === "WEIGHT" && (
              <>
                <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Bag Size (kg)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="kg"
                  value={editData.bagSizeKg}
                  onChange={(e) => setEditData({ ...editData, bagSizeKg: Math.max(0, Number(e.target.value)) || "" })}
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
              </>
            )}
            {product.productType === "UNIT" && (
              <>
                <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Units/Box</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Units"
                  value={editData.unitsPerBox}
                  onChange={(e) => setEditData({ ...editData, unitsPerBox: Math.max(0, Number(e.target.value)) || "" })}
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
              </>
            )}
            {product.productType === "LIQUID" && (
              <>
                <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Packets/Box</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Pks"
                  value={editData.packetsPerBox}
                  onChange={(e) => setEditData({ ...editData, packetsPerBox: Math.max(0, Number(e.target.value)) || "" })}
                  onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
                />
              </>
            )}
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Display Unit</label>
              <input
                placeholder="e.g. 500g"
                value={editData.unit}
                onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
              />
            </div>
          </div>
        ) : product.barcode ? (
          <Barcode
            value={product.barcode}
            height={30}
            width={1}
            fontSize={10}
            margin={0}
          />
        ) : (
          <span style={{ color: "#ccc", fontSize: "12px" }}>No Barcode</span>
        )}
      </td>

      <td>
        {editing ? (
          product.productType === "LIQUID" ? (
            <div className="edit-input-group">
              <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Size (L)</label>
              <input
                type="number"
                min="0"
                placeholder="Size"
                value={editData.packetSize}
                onChange={(e) => setEditData({ ...editData, packetSize: Math.max(0, Number(e.target.value)) || "" })}
                onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
              />
            </div>
          ) : (
            <span className="stock-preview">{product.quantity} {unit}</span>
          )
        ) : (
          <span className={`status-pill ${product.quantity <= LOW_STOCK_THRESHOLD ? 'pill-danger' : 'pill-success'}`}>
            {product.quantity} {unit}
            {product.quantity <= LOW_STOCK_THRESHOLD && <span style={{ marginLeft: 4 }}>⚠️</span>}
          </span>
        )}
      </td>

      <td>
        <div className="add-stock-box">
          <input
            type="number"
            min="0"
            placeholder="Boxes"
            value={boxes}
            onChange={(e) => setBoxes(Math.max(0, Number(e.target.value)) || "")}
            onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && e.preventDefault()}
          />
          <button onClick={() => onAddStock(product, boxes)}>
            Add
          </button>
        </div>
      </td>

      <td className="action-col">
        {editing ? (
          <div className="edit-save-actions">
            <button className="btn primary small save-btn" onClick={saveEdit}>Save</button>
            <button className="btn ghost small cancel-link" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="edit-btn" onClick={() => setEditing(true)}>
              <FilePlus size={14} /> Edit
            </button>
            <div className="btn-row" style={{ justifyContent: 'center', gap: '6px' }}>
              {product.barcode && (
                <button
                  className="icon-btn"
                  onClick={() => onPrint(product)}
                  title="Print Barcode"
                >
                  <Printer size={14} />
                </button>
              )}
              <button
                className="icon-btn delete-btn"
                onClick={() => onDelete(product.id)}
                title="Delete Product"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

/* MOBILE PRODUCT CARD */
function MobileProductCard({ product, onAddStock, onDelete, onPrint, onEdit, LOW_STOCK_THRESHOLD }) {
  const [showStockInput, setShowStockInput] = useState(false);
  const [boxesToAdd, setBoxesToAdd] = useState("");

  const handleAddStock = () => {
    if (boxesToAdd && !isNaN(boxesToAdd)) {
      onAddStock(product, parseInt(boxesToAdd));
      setBoxesToAdd("");
      setShowStockInput(false);
    } else {
      toast.warn("Please enter a valid number of boxes");
    }
  };

  return (
    <div className="mobile-product-card">
      <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title" style={{ color: '#1e293b', fontWeight: 700, fontSize: '14px' }}>{product.name}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
            <span className="status-pill pill-info" style={{ fontSize: '9px', margin: 0 }}>{product.category.replace("_", " ")}</span>
            {product.approvalStatus && product.approvalStatus !== 'APPROVED' && (
              <span style={{ 
                fontSize: '8px', 
                fontWeight: 800, 
                padding: '1px 5px', 
                borderRadius: '4px', 
                background: product.approvalStatus === 'PENDING' ? '#fef3c7' : '#fee2e2',
                color: product.approvalStatus === 'PENDING' ? '#b45309' : '#b91c1c',
                border: product.approvalStatus === 'PENDING' ? '1px solid #fde68a' : '1px solid #fca5a5'
              }}>
                {product.approvalStatus === 'PENDING' ? 'PENDING' : 'REJECTED'}
              </span>
            )}
          </div>
        </div>
        <div className="card-top-right" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div className="card-price" style={{ color: 'hsl(var(--primary-h), var(--primary-s), var(--primary-l))', fontWeight: 700 }}>₹ {product.price}</div>
          <div className="card-img-container" style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: '4px' }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Package size={20} color="#cbd5e1" />
            )}
          </div>
        </div>
      </div>

      <div className="card-barcode" style={{ marginTop: '8px' }}>
        {product.barcode && <Barcode value={product.barcode} height={20} width={1.4} fontSize={9} displayValue={false} />}
      </div>

      <div className="product-info-row" style={{ marginTop: '8px' }}>
        <span className={`status-pill ${product.quantity <= LOW_STOCK_THRESHOLD ? 'pill-danger' : 'pill-success'}`} style={{ fontSize: '10px' }}>
          Stock: {product.quantity} {product.productType === 'WEIGHT' ? 'kg' : product.productType === 'LIQUID' ? 'L' : 'pcs'}
        </span>
      </div>

      <div className="card-actions" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
        {showStockInput ? (
          <div className="inline-add-stock" style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Boxes"
              value={boxesToAdd}
              onChange={(e) => setBoxesToAdd(e.target.value)}
              autoFocus
              style={{ flex: 1, height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '0 8px' }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStock();
                if (e.key === "Escape") setShowStockInput(false);
              }}
            />
            <button className="btn primary small" onClick={handleAddStock}>Add</button>
            <button className="btn ghost small" onClick={() => setShowStockInput(false)}>Cancel</button>
          </div>
        ) : (
          <div className="action-buttons" style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <button className="btn small" onClick={() => setShowStockInput(true)}>+ Stock</button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {product.barcode && (
                <button className="btn secondary small icon-btn" onClick={() => onPrint(product)} title="Print Barcode">
                  <Printer size={16} />
                </button>
              )}

              <button className="edit-btn small" onClick={() => onEdit(product)} style={{ background: '#eff6ff', color: '#1e40af', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}>Edit</button>

              <button className="btn delete-btn small" onClick={() => onDelete(product.id)} style={{ padding: '0 8px' }}>🗑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* MOBILE PRODUCT EDIT MODAL */
function MobileProductEditModal({ product, onClose }) {
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price,
    category: product.category,
    bagSizeKg: product.bagSizeKg || "",
    packetsPerBox: product.packetsPerBox || "",
    packetSize: product.packetSize || "",
    unitsPerBox: product.unitsPerBox || "",
    unit: product.unit || "",
    imageUrl: product.imageUrl || ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await axiosClient.put(`/products/${product.id}`, formData);
      toast.success("Product updated successfully!");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mobile-edit-overlay">
      <div className="mobile-edit-sheet">
        <div className="edit-sheet-header">
          <h3>Edit Product</h3>
          <button className="close-sheet-btn" onClick={onClose}><XCircle size={24} /></button>
        </div>

        <div className="edit-sheet-body">
          <div className="edit-field">
            <label>Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="edit-field-row">
            <div className="edit-field">
              <label>Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="edit-field">
              <label>Display Unit</label>
              <input
                type="text"
                placeholder="e.g. 500g"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="edit-field">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {PRODUCT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {product.productType === "WEIGHT" && (
            <div className="edit-field">
              <label>Bag Size (kg)</label>
              <input
                type="number"
                value={formData.bagSizeKg}
                onChange={(e) => setFormData({ ...formData, bagSizeKg: e.target.value })}
              />
            </div>
          )}

          {product.productType === "UNIT" && (
            <div className="edit-field">
              <label>Units per Box</label>
              <input
                type="number"
                value={formData.unitsPerBox}
                onChange={(e) => setFormData({ ...formData, unitsPerBox: e.target.value })}
              />
            </div>
          )}

          {product.productType === "LIQUID" && (
            <div className="edit-field-row">
              <div className="edit-field">
                <label>Packets/Box</label>
                <input
                  type="number"
                  value={formData.packetsPerBox}
                  onChange={(e) => setFormData({ ...formData, packetsPerBox: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label>Packet Size (L)</label>
                <input
                  type="number"
                  value={formData.packetSize}
                  onChange={(e) => setFormData({ ...formData, packetSize: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="edit-sheet-footer">
          <button className="btn ghost" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Products;
