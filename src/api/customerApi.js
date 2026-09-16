import axiosClient from "./axiosClient";

export const getCustomers = () => {
  const retailerId = sessionStorage.getItem("retailerId");
  if (!retailerId) throw new Error("Retailer not logged in");

  return axiosClient.get("/customers", {
    headers: {
      "X-Retailer-Id": retailerId,
    },
  });
};

export const getCustomerDetails = (id) => {
  return axiosClient.get(`/customers/${id}`);
};

export const createCustomer = (data) => {
  const retailerId = sessionStorage.getItem("retailerId");

  return axiosClient.post(
    "/customers",
    {
      name: data.name,
      phone: data.phone,
      email: data.email,
    },
    {
      headers: {
        "X-Retailer-Id": retailerId,
      },
    }
  );
};

export const updateCustomerEmail = (id, email) =>
  axiosClient.put(`/customers/${id}/email`, null, {
    params: { email },
  });

export const updateCustomerPhone = (id, phone) =>
  axiosClient.put(`/customers/${id}/phone`, null, {
    params: { phone },
  });

export const deleteCustomer = async (id) => {
  const retailerId = sessionStorage.getItem("retailerId");

  return axiosClient.delete(`/customers/${id}`, {
    headers: {
      "X-Retailer-Id": retailerId,
    },
  });
};

export const updateCustomerScheme = (id, data) => {
  return axiosClient.put(`/customers/${id}/scheme`, data);
};
