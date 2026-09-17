import { useState } from "react";

function SyncContactsModal({ onClose, onImport }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rawApiUrl = import.meta.env.VITE_API_BASE_URL || "";
  const API_BASE_URL = (!rawApiUrl || rawApiUrl.includes("railway.app") || rawApiUrl.includes("your-backend-url"))
    ? "https://khatha-backend.onrender.com/api"
    : rawApiUrl;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  /* ================= GOOGLE CONTACT SYNC ================= */
  const handleGoogleSync = () => {
    setError("");

    if (!window.google) {
      setError("Google services not loaded. Please refresh the page.");
      return;
    }

    setLoading(true);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly",

      callback: async (tokenResponse) => {
        try {
          if (!tokenResponse?.access_token) {
            throw new Error("No access token received");
          }

          const res = await fetch(
            `${API_BASE_URL}/contacts/google`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                accessToken: tokenResponse.access_token,
              }),
            }
          );

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error("Backend failed: " + errorText);
          }

          const contacts = await res.json();

          if (onImport) {
            onImport(contacts);
          }

          onClose();
        } catch (err) {
          console.error(err);
          setError("Unable to sync Google contacts");
        } finally {
          setLoading(false);
        }
      },
    });

    client.requestAccessToken();
  };

  return (
    <div className="modal">
      <div className="modal-box animate-scale">
        <h3>Sync Google Contacts</h3>

        <p className="muted">
          Import customer emails directly from your Google account.
        </p>

        {error && <p className="error">{error}</p>}

        {/* 
        <button
          className="btn google"
          onClick={handleGoogleSync}
          disabled={loading}
        >
          {loading ? "Syncing..." : "🔄 Continue with Google"}
        </button>
        */}

        <div className="modal-actions">
          <button
            className="btn ghost"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncContactsModal;
