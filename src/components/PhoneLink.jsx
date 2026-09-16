import { useState } from "react";

/**
 * PhoneLink - Smart phone number component
 * - Mobile: Opens native phone dialer via tel: link
 * - Desktop: Shows number + click to copy (no Chrome dialog popup)
 */
function PhoneLink({ phone, className = "", showIcon = true }) {
    const [copied, setCopied] = useState(false);

    if (!phone) return null;

    const cleaned = phone.replace(/\s+/g, "");

    // Detect mobile device
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
        navigator.userAgent
    );

    const handleDesktopClick = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(cleaned).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            // Fallback for older browsers
            const el = document.createElement("textarea");
            el.value = cleaned;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (isMobile) {
        // ✅ On mobile: direct tel: link → opens native phone dialer
        return (
            <a
                href={`tel:${cleaned}`}
                className={className || "phone-link"}
                style={{ textDecoration: "none", color: "inherit" }}
            >
                {showIcon && "📞 "}{phone}
            </a>
        );
    }

    // 🖥️ On desktop: show number with copy-to-clipboard (avoids Chrome external handler dialog)
    return (
        <span
            onClick={handleDesktopClick}
            className={className || "phone-link"}
            title="Click to copy phone number"
            style={{ cursor: "pointer", userSelect: "all" }}
        >
            {showIcon && "📞 "}{phone}
            <span style={{
                marginLeft: "6px",
                fontSize: "11px",
                color: copied ? "#10b981" : "#94a3b8",
                fontWeight: copied ? "bold" : "normal",
                transition: "color 0.2s"
            }}>
                {copied ? "✓ Copied!" : "📋"}
            </span>
        </span>
    );
}

export default PhoneLink;
