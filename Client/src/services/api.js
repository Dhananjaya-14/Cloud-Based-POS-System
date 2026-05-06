import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

// restore token from localStorage (if present)
const existingToken = localStorage.getItem("token");
if (existingToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }
};

export const login = async ({ u_email, u_pw }) => {
  const res = await api.post("/auth/login", { u_email, u_pw });
  return res.data; // { token, user }
};

export const logout = () => {
  setAuthToken(null);
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

/* API helpers (use `api` so Authorization header is applied automatically) */

export const getBranches = async () => {
  const response = await api.get("/branches");
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get("/roles");
  return response.data;
};

export const getCompanies = async () => {
  const response = await api.get("/companies");
  return response.data;
};

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const getBranchProducts = async () => {
  const response = await api.get("/branch_products");
  return response.data;
};

export const createBranchProduct = async (branchProductData) => {
  const response = await api.post("/branch_products", branchProductData);
  return response.data;
};

export const updateBranchProduct = async (branchProductId, payload) => {
  const response = await api.put(`/branch_products/${branchProductId}`, payload);
  return response.data;
};

export const deleteBranchProduct = async (branchProductId) => {
  await api.delete(`/branch_products/${branchProductId}`);
};

export const getOrders = async (params = {}) => {
  const response = await api.get("/orders", { params });
  // order API wraps rows in { success, count, data }
  return response.data?.data || [];
};

export const getOrderItems = async () => {
  const response = await api.get("/order-items");
  return response.data?.data || [];
};

export const getOrderItemsByOrderId = async (orderId) => {
  const response = await api.get(`/order-items/order/${orderId}`);
  return response.data?.data || [];
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.patch(`/orders/${orderId}/status`, { status });
  return response.data?.data;
};

export const getProductById = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get("/categories");
  return response.data;
};

export const getRawMaterials = async () => {
  const response = await api.get("/raw-materials");
  return response.data;
};

export const getLowStockMaterials = async () => {
  const response = await api.get("/raw-materials/low-stock");
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data;
};

export const createOrder = async (orderData) => {
  const response = await api.post("/orders", orderData);
  return response.data;
};

export const createOrderItem = async (orderItemData) => {
  const response = await api.post("/order-items", orderItemData);
  return response.data;
};

export const updateProduct = async (productId, payload) => {
  const response = await api.put(`/products/${productId}`, payload);
  return response.data;
};

export const deleteProduct = async (productId) => {
  await api.delete(`/products/${productId}`);
};

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (id, payload) => {
  const response = await api.put(`/users/${id}`, payload);
  return response.data;
};

export const getBranchById = async (branchId) => {
  const response = await api.get(`/branches/${branchId}`);
  return response.data;
};

export const deleteBranchById = async (branchId) => {
  await api.delete(`/branches/${branchId}`);
};

export const createUser = async (userData) => {
  const res = await api.post(`/users`, userData);
  return res.data;
};

export const deleteUserById = async (userId) => {
  await api.delete(`/users/${userId}`);
};

export const createBranch = async (branchData) => {
  const res = await api.post(`/branches`, branchData);
  return res.data;
};

export const setupBranchWithManager = async (combinedData) => {
  try {
    const newUser = await createUser(combinedData.manager);

    const branchPayload = {
      ...combinedData.branch,
      U_id: newUser.u_id,
      com_id: combinedData.com_id ?? 1,
    };

    const newBranch = await createBranch(branchPayload);

    return { user: newUser, branch: newBranch };
  } catch (error) {
    throw error;
  }
};































// import axios from "axios";

// const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// const api = axios.create({
//   baseURL: BASE_URL,
// });

// export const getBranches = async () => {
//   const response = await api.get("/branches");
//   return response.data;
// };

// export const getUsers = async () => {
//   const response = await axios.get(`${BASE_URL}/users`);
//   return response.data;
// };

// export const getRoles = async () => {
//   const response = await axios.get(`${BASE_URL}/roles`);
//   return response.data;
// };

// export const getUserById = async (userId) => {
//   const response = await axios.get(`${BASE_URL}/users/${userId}`);
//   return response.data;
// };

// export const updateUser = async (id, payload) => {
//   const response = await axios.put(`${BASE_URL}/users/${id}`, payload);
//   return response.data;
// };

// export const getBranchById = async (branchId) => {
//   const response = await axios.get(`${BASE_URL}/branches/${branchId}`);
//   return response.data;
// };

// export const deleteBranchById = async (branchId) => {
//   await axios.delete(`${BASE_URL}/branches/${branchId}`);
// };

// // 1. Create User
// export const createUser = async (userData) => {
//   const res = await axios.post(`${BASE_URL}/users`, userData);
//   return res.data; // This returns { u_id, ... }
// };

// export const deleteUserById = async (userId) => {
//   await axios.delete(`${BASE_URL}/users/${userId}`);
// };

// // 2. Create Branch
// export const createBranch = async (branchData) => {
//   const res = await axios.post(`${BASE_URL}/branches`, branchData);
//   return res.data;
// };

// /**
//  * LOGIC: ORCHESTRATOR
//  * This function handles the two-step logic required by your backend
//  */
// export const setupBranchWithManager = async (combinedData) => {
//   try {
//     // Step A: Create the User first
//     const newUser = await createUser(combinedData.manager);
    
//     // Step B: Use the returned u_id to create the Branch
//     const branchPayload = {
//       ...combinedData.branch,
//       U_id: newUser.u_id, // Linking the ID from step A
//       com_id: 1 // Assuming a default com_id or pass it from your Auth context
//     };

//     const newBranch = await createBranch(branchPayload);
    
//     return { user: newUser, branch: newBranch };
//   } catch (error) {
//     // If step A succeeds but step B fails, you might want to handle user deletion 
//     // or notify the admin. For now, we throw the error to the UI.
//     throw error;
//   }
// };























