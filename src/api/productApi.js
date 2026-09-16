import axiosClient from "./axiosClient";

/* GET PRODUCTS */
export const getProducts = (retailerId) =>
  axiosClient.get(`/products?retailerId=${retailerId}&includeAllStatuses=true`);

// ✅ GET ALL PRODUCTS (GLOBAL / NEARBY)
export const getAllProducts = (location = null) => {
  let url = `/products/public/all`;
  if (location && location.lat && location.lng) {
    url += `?lat=${location.lat}&lng=${location.lng}`;
  }
  return axiosClient.get(url);
};

/* CREATE PRODUCT */
export const createProduct = (data, retailerId) =>
  axiosClient.post(`/products?retailerId=${retailerId}`, data);

/* UPDATE PRODUCT */
export const updateProduct = (id, data) =>
  axiosClient.put(`/products/${id}`, data);

/* DELETE PRODUCT */
export const deleteProduct = (id) =>
  axiosClient.delete(`/products/${id}`);

/* 📷 AI SCAN PRODUCT */
export const scanProduct = (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  return axiosClient.post("/products/ai-detect", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/* 🔍 UPC LOOKUP API (Internal Proxy) */
export const lookupUPC = (barcode) => {
  return axiosClient.get(`/products/upc/lookup?barcode=${barcode}`)
    .then(res => res.data);
};

export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post("/products/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
}
