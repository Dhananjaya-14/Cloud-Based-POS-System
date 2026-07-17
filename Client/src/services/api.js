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

// Global response interceptor — only clears token and redirects on 401 (expired/invalid token)
// A 403 (permission denied) means the user IS authenticated — do NOT log them out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[AUTH] 401 — token expired or invalid. Clearing session and redirecting to login.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

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

export const deleteBranch = async (id) => {
  const response = await api.delete(`/branches/${id}`);
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

export const createCompany = async (companyData) => {
  const response = await api.post("/companies", companyData);
  return response.data;
};

export const updateCompany = async (id, companyData) => {
  const response = await api.put(`/companies/${id}`, companyData);
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const getBranchProducts = async (branchId) => {
  const response = await api.get("/branch_products", {
    params: {
      ...(branchId ? { B_id: branchId } : {}),
      _ts: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const data = response.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

export const getRecipes = async () => {
  const response = await api.get("/recipes");
  return response.data;
};

export const getRecipeById = async (recipeId) => {
  const response = await api.get(`/recipes/${recipeId}`);
  return response.data;
};

export const getRecipesByProduct = async (productId, b_id) => {
  const params = b_id ? { b_id } : {};
  const response = await api.get(`/recipes/product/${productId}`, { params });
  return response.data;
};

export const createRecipe = async (payload) => {
  const response = await api.post("/recipes", payload);
  return response.data;
};

export const createRecipeBulk = async (payload) => {
  const response = await api.post("/recipes/bulk", payload);
  return response.data;
};

export const updateRecipe = async (recipeId, payload) => {
  const response = await api.put(`/recipes/${recipeId}`, payload);
  return response.data;
};

export const deleteRecipe = async (recipeId) => {
  await api.delete(`/recipes/${recipeId}`);
};

export const deleteRecipeByProduct = async (productId, b_id) => {
  const params = b_id ? { b_id } : {};
  const response = await api.delete(`/recipes/product/${productId}`, { params });
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

export const updateOrder = async (orderId, orderData) => {
  const response = await api.put(`/orders/${orderId}`, orderData);
  return response.data;
};

export const deleteOrderItem = async (orderItemId) => {
  const response = await api.delete(`/order-items/${orderItemId}`);
  return response.data;
};

export const getWaiterProfile = async () => {
  const response = await api.get("/waiter/profile");
  return response.data;
};

export const getWaiterTables = async (params = {}) => {
  const response = await api.get("/waiter/my-tables", { params });
  return response.data;
};

export const getWaiterOrders = async (params = {}) => {
  const response = await api.get("/waiter/my-orders", { params });
  return response.data;
};

export const createWaiterOrder = async (orderData) => {
  const response = await api.post("/waiter/orders", orderData);
  return response.data;
};

export const deleteWaiterOrder = async (orderId) => {
  const response = await api.delete(`/waiter/orders/${orderId}`);
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

export const deleteProduct = async (productId, branchId = null) => {
  const params = branchId ? { branch_id: branchId } : {};
  await api.delete(`/products/${productId}`, { params });
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

export const updateBranch = async (branchId, payload) => {
  const response = await api.put(`/branches/${branchId}`, payload);
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
    // 1. Create the Branch first (no longer requires U_id)
    const newBranch = await createBranch({
      ...combinedData.branch,
      com_id: combinedData.com_id ?? 1,
    });

    const branchId = newBranch.B_id ?? newBranch.b_id ?? null;

    // 2. Create the User (Manager), linking them to the Branch using the newly created branchId
    const newUser = await createUser({
      ...combinedData.manager,
      B_id: branchId,
    });

    return { user: newUser, branch: newBranch };
  } catch (error) {
    throw error;
  }
};

export const getStatsOverview = async () => {
  const res = await api.get("/stats/overview");
  return res.data;
};

export const getBranchStats = async () => {
  const res = await api.get("/stats/branches");
  return res.data;
};

// Stats API helpers
export const getStatsSalesOverTime = async (params = {}) => {
  const res = await api.get("/stats/sales-over-time", { params });
  return res.data;
};

export const getStatsTypeBreakdown = async (params = {}) => {
  const res = await api.get("/stats/type-breakdown", { params });
  return res.data;
};

export const getStatsPeakHours = async (params = {}) => {
  const res = await api.get("/stats/peak-hours", { params });
  return res.data;
};

export const getStatsBusyDays = async (params = {}) => {
  const res = await api.get("/stats/busy-days", { params });
  return res.data;
};

export const getBranchComparison = async () => {
  const res = await api.get("/stats/branches/compare");
  return res.data;
};


// --- Transactions / purchases helpers (append these) ---
export const getOrderById = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data?.data || null;
};

export const getPurchaseOrders = async (params = {}) => {
  const res = await api.get("/purchase-orders", { params });
  return res.data?.data ?? res.data ?? [];
};

export const getPurchaseOrderById = async (id) => {
  const res = await api.get(`/purchase-orders/${id}`);
  return res.data || null;
};

export const getPurchaseItemsByOrder = async (orderId) => {
  const res = await api.get(`/purchase-items/order/${orderId}`);
  return res.data || [];
};

export const getSupplierPayments = async (params = {}) => {
  const res = await api.get("/supplier-payments", { params });
  return res.data || [];
};

export const getPaymentsByOrder = async (poId) => {
  const res = await api.get(`/supplier-payments/order/${poId}`);
  return res.data || [];
};

// Payments helper
export const getPayments = async (params = {}) => {
  const res = await api.get("/payments", { params });
  // payment API returns { success, data, meta } where data is an array
  return res.data?.data ?? [];
};


//Cashier Dashboard stats
export const getDashboardStats = async (b_id) => {
  const response = await api.get("/dashboard/stats", {
    params: { b_id },
  });

  return response.data;
};


//Sales summery Reports
export const getSalesSummaryReport =async (payload) => { 
  const response =await api.post("/reports/sales", payload);
  return response.data;
};


//product sales report
export const getProductSalesReport=async (payload)=>{
  const response=await api.post("/reports/productsales",payload);
  return response.data;
}

//Raw material stock report
export const getRawMaterialStockReport=async (payload)=>{
  const response=await api.post("/reports/rawmaterialstock",payload);
  return response.data;
}

//Raw material consumption report
export const getRawMaterialConsumptionReport=async (payload)=>{
  const response=await api.post("/reports/rawmaterialconsumption",payload);
  return response.data;
}

//Cashier sales details report
export const getSalesDetailsReport=async (payload)=>{
  const response=await api.post("/reports/salesdetails",payload);
  return response.data;
}

export const getBranchWiseSalesReport=async (payload)=>{
  const response=await api.post("/reports/branchsales",payload);
  return response.data;
}

// ── Supplier API -----------------
export const getSuppliers = async (params = {}) => {
  const response = await api.get("/suppliers", { params });
  return response.data;
};

export const getSupplierById = async (id) => {
  const response = await api.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (payload) => {
  const response = await api.post("/suppliers", payload);
  return response.data;
};

export const updateSupplier = async (id, payload) => {
  const response = await api.put(`/suppliers/${id}`, payload);
  return response.data;
};

export const deleteSupplier = async (id) => {
  await api.delete(`/suppliers/${id}`);
};

export const restoreSupplier = async (id) => {
  const response = await api.patch(`/suppliers/${id}/restore`);
  return response.data;
};

export const assignSupplierToBranch = async (sup_id, b_id) => {
  const response = await api.post(`/suppliers/${sup_id}/branches`, { b_id });
  return response.data;
};

export const removeSupplierFromBranch = async (sup_id, b_id) => {
  await api.delete(`/suppliers/${sup_id}/branches/${b_id}`);
};

export const getSupplierBranches = async (sup_id) => {
  const response = await api.get(`/suppliers/${sup_id}/branches`);
  return response.data;
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























// ─── PayHere ─────────────────────────────────────────────────────────────────
/**
 * Initiate a PayHere payment.
 * Returns { success, payment_url, order_id }
 */
export const initiatePayHerePayment = async ({
  order_id,
  amount,
  order_description,
  cashier_uid,
}) => {
  const res = await api.post("/payhere/initiate", {
    order_id,
    amount,
    order_description,
    cashier_uid,
  });
  return res.data;
};
