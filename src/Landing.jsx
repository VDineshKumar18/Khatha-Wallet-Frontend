import { useEffect, useState } from "react";
import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./styles/landing.css";

import heroImg from "./assets/landing/hero.png";
import billingImg from "./assets/landing/inventory.png"; // fallback or original preview images
import inventoryImg from "./assets/landing/inventory.png";
import gstImg from "./assets/landing/gst.png";
import logoImg from "./assets/landing/logo.svg";


function Landing({ onLoginClick, onBrowseAsCustomer, onBrowseAsGuest }) {
  const navigate = useNavigate();
  const [autoPopupShown, setAutoPopupShown] = useState(false);

  /* ================= INTERACTIVE SHOWCASE STATE ================= */
  const FEATURES = [
    { id: 'billing', label: 'Fast Billing', icon: '🧾', desc: 'Create GST bills in seconds.' },
    { id: 'inventory', label: 'Inventory', icon: '📦', desc: 'Track stock in real-time.' },
    { id: 'khatha', label: 'Khatha Ledger', icon: '📒', desc: 'Manage customer dues easily.' },
    { id: 'analytics', label: 'Reports', icon: '📊', desc: 'View daily sales & profits.' }
  ];

  const [activeFeature, setActiveFeature] = useState(FEATURES[0]);

  // Auto-rotate features (Reduced frequency and paused on mobile for performance)
  useEffect(() => {
    const timer = setInterval(() => {
      if (window.innerWidth > 768) {
        setActiveFeature((prev) => {
          const currentIndex = FEATURES.findIndex((f) => f.id === prev.id);
          const nextIndex = (currentIndex + 1) % FEATURES.length;
          return FEATURES[nextIndex];
        });
      }
    }, 5000); // Increased interval to 5s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400 && !autoPopupShown) {
        setAutoPopupShown(true);
        onLoginClick();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [autoPopupShown, onLoginClick]);

  return (
    <div className="landing-root">
      {/* ================= HEADER ================= */}
      <header className="landing-header">
        <div className="brand">
          <img src={logoImg} alt="Khatha Wallet" className="nav-logo" />
        </div>

        <div className="header-nav-pill">
          <button className="nav-link-btn" onClick={onLoginClick}>
            Login
          </button>
          <button className="nav-link-btn highlight" onClick={() => onLoginClick('signup')}>
            Signup
          </button>
        </div>
      </header>

      {/* ================= SUB-HEADER NAV ================= */}
      <div className="subheader-nav">
        <div className="header-nav-pill">
          <button className="nav-link-btn" onClick={() => onLoginClick('retailer')}>
            Retailer
          </button>
          <button className="nav-link-btn" onClick={() => navigate('/admin')}>
            Admin
          </button>
          <button className="nav-link-btn highlight" onClick={onBrowseAsGuest}>
            Products
          </button>
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="hero-text">
          <h1 className="hero-title">"Digital Supermarket for Towns & Villages"</h1>
          <p>
            Bringing tech to non-delivery zones.<br />
            <strong>"Click & Collect"</strong>: Customers order from home, retailers pack it, customers pick up. No waiting.<br />
            <strong>"Connected Commerce"</strong>: Smart catalogs, stock alerts, and digital khatha.
          </p>
          <div className="hero-actions">
            <button className="btn primary large" onClick={() => onLoginClick('signup')} aria-label="Start Using Khatha Wallet">
              Start Saving Time
            </button>
            <p className="small-note">Modernizing 50,000+ Rural Businesses</p>
          </div>
        </div>

        <img
          src={heroImg}
          alt="Khatha Wallet Dashboard Preview showing Inventory and Billing features"
          style={{ contentVisibility: 'auto' }}
          fetchPriority="high"
        />
      </section>

      {/* ================= USER TYPE SPLIT ================= */}
      <section className="user-split-section">
        <div className="split-card seller">
          <div className="tag">FOR RETAILERS</div>
          <h2>Transform your Shop into a Digital Supermarket</h2>
          <p>Get orders online, manage inventory, and track customer khatha.</p>
          <button className="btn white-outline" onClick={() => onLoginClick('retailer')} aria-label="Digitize My Shop (For Retailers)">
            Digitize My Shop &gt;
          </button>
        </div>

        <div className="split-card customer">
          <div className="tag">FOR CUSTOMERS</div>
          <h2>Shop Smart, Skip the Wait</h2>
          <p>Order from home, pick up when ready. Zero waiting time.</p>
          <button className="btn white" onClick={onBrowseAsCustomer} aria-label="Start Shopping (For Customers)">
            Start Shopping &gt;
          </button>
        </div>
      </section>


      {/* ================= CONCEPT: TIME SAVER ================= */}
      <section className="concept-section">
        <h2 className="section-title">Why Khatha Wallet?</h2>
        <p className="section-subtitle">Bridging the gap between Town Retailers & Families</p>

        <div className="concept-grid">
          <div className="concept-card old-way">
            <h3>⏳ The Old Way</h3>
            <ul>
              <li>❌ Write a paper list</li>
              <li>❌ Walk to the shop</li>
              <li>❌ Wait for packing (30 mins)</li>
              <li>❌ Carry heavy bags home</li>
            </ul>
            <div className="result bad">Result: Hours Wasted</div>
          </div>

          <div className="arrow-divider">VS</div>

          <div className="concept-card new-way">
            <h3>🚀 The Khatha Wallet Way</h3>
            <ul>
              <li>✅ Browse catalog on phone</li>
              <li>✅ Click & Order from home</li>
              <li>✅ Shop packs it ready</li>
              <li>✅ Pick up & Go (5 mins)</li>
            </ul>
            <div className="result good">Result: Smart Living</div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE FEATURE SHOWCASE ================= */}
      <section className="interactive-showcase">
        <div className="showcase-container">

          {/* LEFT: STICKY PHONE */}
          <div className="showcase-left">
            <div className="phone-mockup-sticky">
              <div className="notch"></div>
              <div className="screen">
                <div className="screen-header">
                  <span>{activeFeature ? activeFeature.label : 'Khatha'}</span>
                  <span>🔔</span>
                </div>
                <div className="screen-content dynamic">
                  <ScreenContent feature={activeFeature?.id || 'billing'} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: FEATURE NAVIGATION */}
          <div className="showcase-right">
            <div className="showcase-intro">
              <h2>Experience the power of<br /> <span className="gradient-text">Khatha Wallet</span></h2>
              <p>Hover over a feature to see it in action.</p>
            </div>

            <div className="feature-list">
              {FEATURES.map((f) => (
                <div
                  key={f.id}
                  className={`feature-item ${activeFeature?.id === f.id ? 'active' : ''}`}
                  onMouseEnter={() => setActiveFeature(f)}
                >
                  <div className="f-icon">{f.icon}</div>
                  <div className="f-info">
                    <h3>{f.label}</h3>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="features">
        <Feature
          img={inventoryImg}
          title="Smart Inventory Management"
          text={
            <>
              <p>
                Track all your products with real-time stock updates.
                Manage quantities in boxes, bags, kilograms or pieces
                without confusion.
              </p>
              <ul>
                <li>✔ Real-time stock tracking</li>
                <li>✔ Multiple units (kg, pcs, boxes)</li>
                <li>✔ Low-stock alerts</li>
                <li>✔ Easy product search</li>
              </ul>
            </>
          }
        />

        <Feature
          img={billingImg}
          title="Fast & Accurate Billing"
          text={
            <>
              <p>
                Create professional bills in seconds and accept payments
                through Cash, UPI, Bank or Khatha.
              </p>
              <ul>
                <li>✔ GST & non-GST billing</li>
                <li>✔ Instant bill generation</li>
                <li>✔ Multiple payment modes</li>
                <li>✔ Printable invoices</li>
              </ul>
            </>
          }
          reverse
        />

        <Feature
          img={gstImg}
          title="Khatha, GST & Dues Tracking"
          text={
            <>
              <p>
                Never lose track of money again. Khatha Wallet keeps a clear
                record of what customers owe you and what you’ve received.
              </p>
              <ul>
                <li>✔ Customer-wise khatha ledger</li>
                <li>✔ GST calculation support</li>
                <li>✔ Payment history & balance</li>
                <li>✔ Business summary reports</li>
              </ul>
            </>
          }
        />
      </section>
      {/* ================= HIGHLIGHTS ================= */}
      <section className="highlights">
        <h2 className="section-title">Powerful Highlights</h2>
        <p className="section-subtitle">
          Everything you need to run your business smoothly — faster, smarter and safer
        </p>

        <div className="highlight-slider">
          <div className="highlight-track">
            {/* DUPLICATE CONTENT FOR INFINITE SCROLL */}
            {[...HIGHLIGHTS_DATA, ...HIGHLIGHTS_DATA].map((h, index) => (
              <Highlight key={index} {...h} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="cta">
        <h2>Everything your business needs — in one Wallet</h2>
        <p>
          No setup cost • No credit card required • Built for Indian businesses
        </p>
        <button className="btn primary large" onClick={onLoginClick} aria-label="Get Started with Khatha Wallet">
          Start Using Khatha Wallet
        </button>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h3>Khatha Wallet</h3>
            <p>
              A secure and simple billing, inventory and khatha management
              system for small and growing businesses in India.
            </p>
          </div>

          <div>
            <h4>Features</h4>
            <ul>
              <li>Billing & Invoicing</li>
              <li>Inventory Management</li>
              <li>Customer Khatha</li>
              <li>GST Support</li>
            </ul>
          </div>

          <div>
            <h4>Industries</h4>
            <ul>
              <li>Grocery Stores</li>
              <li>Medical Shops</li>
              <li>Retail Stores</li>
              <li>Wholesale Traders</li>
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul>
              <li>Email: khathawallet.noreply@gmail.com</li>
              <li>India</li>
              <li>Mon–Sat: 9 AM – 7 PM</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Khatha Wallet. Built with ❤️ for Indian Retailers.</p>
          <div className="social-links">
            <a
              href="https://github.com/pandu2518/Khatha-Wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="View on GitHub"
            >
              <Github size={24} />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </footer>
    </div >
  );
}

function Highlight({ icon, title, text }) {
  return (
    <div className="highlight-card">
      <div className="highlight-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function Feature({ img, title, text, reverse }) {
  return (
    <div className={`feature ${reverse ? "reverse" : ""}`}>
      <img src={img} alt={title} loading="lazy" decoding="async" />
      <div className="feature-text">
        <h3>{title}</h3>
        {text}
      </div>
    </div>
  );
}

function ScreenContent({ feature }) {
  if (feature === 'billing') {
    return (
      <div className="mini-ui billing">
        <div className="row"><span>Item</span><span>Qty</span></div>
        <div className="list-item"><span>Rice Bag</span><span>2</span></div>
        <div className="list-item"><span>Oil 1L</span><span>1</span></div>
        <div className="list-item"><span>Sugar</span><span>5</span></div>
        <div className="total-bar"><span>Total</span><span>₹ 1,250</span></div>
        <div className="btn-fake">Print Bill</div>
      </div>
    );
  }
  if (feature === 'inventory') {
    return (
      <div className="mini-ui inventory">
        <div className="grid-2">
          <div className="card-fake"><span>📦 Rice</span><span className="badge">Low</span></div>
          <div className="card-fake"><span>🥤 Coke</span><span className="badge ok">OK</span></div>
          <div className="card-fake"><span>🍪 Brit</span><span className="badge ok">OK</span></div>
          <div className="card-fake"><span>🧼 Soap</span><span className="badge">Low</span></div>
        </div>
        <div className="btn-fake primary">+ Add Product</div>
      </div>
    );
  }
  if (feature === 'khatha') {
    return (
      <div className="mini-ui khatha">
        <div className="user-row">
          <div className="avatar">R</div>
          <div className="info"><span>Rajesh</span><span className="red">Due: ₹ 500</span></div>
        </div>
        <div className="user-row">
          <div className="avatar">S</div>
          <div className="info"><span>Suresh</span><span className="green">Paid</span></div>
        </div>
        <div className="user-row">
          <div className="avatar">A</div>
          <div className="info"><span>Amit</span><span className="red">Due: ₹ 1200</span></div>
        </div>
      </div>
    );
  }
  // Analytics
  return (
    <div className="mini-ui analytics">
      <div className="chart-bar">
        <div className="bar" style={{ height: '40%' }}></div>
        <div className="bar" style={{ height: '70%' }}></div>
        <div className="bar" style={{ height: '50%' }}></div>
        <div className="bar" style={{ height: '90%' }}></div>
        <div className="bar" style={{ height: '60%' }}></div>
      </div>
      <div className="stat-row">
        <div className="stat"><span>Sales</span><b>₹ 50k</b></div>
        <div className="stat"><span>Profit</span><b>₹ 12k</b></div>
      </div>
    </div>
  );
}



const HIGHLIGHTS_DATA = [
  { icon: "🛒", title: "Click & Collect", text: "Order from home, pick up pre-packed bags. Zero wait time." },
  { icon: "📱", title: "Digital Catalog", text: "Browse products and prices on your phone before visiting." },
  { icon: "⏰", title: "Time Saver", text: "No more standing in queues or reading out long lists." },
  { icon: "🧾", title: "Smart Billing", text: "Retailers generate bills instantly as you order." },
  { icon: "📒", title: "Digital Khatha", text: "Manage credits and payments transparently." },
  { icon: "🔔", title: "Order Ready Alerts", text: "Get notified when your bag is packed and ready." },
  { icon: "🏙️", title: "Town Optimized", text: "Built for non-delivery zones. The smart alternative." },
  { icon: "📦", title: "Inventory Live", text: "Know what's in stock before you leave home." },
  { icon: "📝", title: "Smart Order List", text: "Replace paper lists with a shared family cart." },
  { icon: "🚚", title: "Supplier Connect", text: "Manage suppliers and purchase orders easily." },
  { icon: "🏷️", title: "Schemes & Offers", text: "Create special savings for loyal customers." },
];

export default Landing;
