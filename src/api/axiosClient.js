import axios from "axios";

const rawUrl = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE_URL = (!rawUrl || rawUrl.includes("railway.app") || rawUrl.includes("your-backend-url"))
  ? "https://khatha-backend.onrender.com/api"
  : rawUrl;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

axiosClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
