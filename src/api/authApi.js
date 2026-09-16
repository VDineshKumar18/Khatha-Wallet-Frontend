const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://khatha-backend.onrender.com/api";
const BASE_URL = `${API_BASE}/auth`;
const CUSTOMER_AUTH_URL = `${API_BASE}/customer-auth`;

// ================= SEND OTP =================
export const sendOtp = async (email) => {
  const response = await fetch(`${BASE_URL}/send-otp?email=${email}`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to send OTP");
    error.status = response.status;
    throw error;
  }

  return data;
};

// ================= VERIFY OTP =================
// ✅ NOW SEND AS JSON BODY (NOT query params)
export const verifyOtp = async (email, otp) => {
  const response = await fetch(`${BASE_URL}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      otp,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "OTP verification failed");
  }

  return data;
  // expected:
  // {
  //   success: true,
  //   retailerId: 3,
  //   email: "khathabook.noreply@gmail.com"
  // }
};

// ================= SIGNUP =================
// ================= CUSTOMER AUTH (NEW) =================
export const sendCustomerOtp = async (email) => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/send-otp?email=${email}`, {
    method: "POST",
  });
  const data = await response.json(); // "OTP sent successfully" or text
  if (!response.ok) {
    const error = new Error(data.message || "Failed to send OTP");
    error.status = response.status;
    throw error;
  }
  return data;
};

export const verifyCustomerOtp = async (email, otp) => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Invalid OTP");
  return data; // Returns list of customer accounts
};

export const signupRetailer = async (payload) => {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Signup failed");
  }

  return data;
};

// ================= NEW: PUBLIC RETAILERS =================
export const getPublicRetailers = async () => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/public/retailers`);
  if (!response.ok) throw new Error("Failed to load shops");
  return response.json();
};

export const registerCustomer = async (payload) => {
  const response = await fetch(`${CUSTOMER_AUTH_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Registration failed");
  return data;
};
