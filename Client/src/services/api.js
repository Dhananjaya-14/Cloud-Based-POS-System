// api.js
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
});

// Restore token from localStorage
const existingToken = localStorage.getItem("token");

if (existingToken) {
  api.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${existingToken}`;
}

// Global response interceptor — only clears token and redirects on 401 (expired/invalid token)
// A 403 (permission denied) means the user IS authenticated — do NOT log them out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if this is an activity logs endpoint - skip 401 handling for these
    const url = String(error.config?.url || "");
    const isActivityLogEndpoint = /\/activity-logs(?:\/|\?|$)|\/activity-log(?:\/|\?|$)/i.test(url);

    // If it's an activity log endpoint and we get a 401/404/500, return a mock response instead of logging out
    if (error.response?.status && isActivityLogEndpoint) {
      const status = error.response.status;
      if (status === 401 || status === 404 || status === 500) {
        console.warn(`[AUTH] ${status} on activity logs endpoint - returning safe fallback instead of logging out`);
        return Promise.resolve({
          status: 200,
          statusText: "OK",
          data: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            logs: [],
            _mock: true,
            message: "Activity logs feature is not yet implemented on the backend"
          }
        });
      }
    }

    // Only handle 401 for non-activity log endpoints
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
  return res.data;
};

export const logout = () => {
  setAuthToken(null);
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

// ---------------- BRANCHES ----------------

export const getBranches = async () => {
  const response = await api.get("/branches");
  return response.data;
};

export const deleteBranch = async (id) => {
  const response = await api.delete(`/branches/${id}`);
  return response.data;
};

// export const deleteBranch = async (branchId) => {
//   await api.delete(`/branches/${branchId}`);
// };

// export const deleteBranchById = async (branchId) => {
//   await api.delete(`/branches/${branchId}`);
// };

// ---------------- USERS ----------------

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

// export const getUserById = async (userId) => {
//   const response = await api.get(`/users/${userId}`);
//   return response.data;
// };

// export const createUser = async (userData) => {
//   const res = await api.post("/users", userData);
//   return res.data;
// };

// export const updateUser = async (id, payload) => {
//   const response = await api.put(`/users/${id}`, payload);
//   return response.data;
// };

// export const deleteUserById = async (userId) => {
//   await api.delete(`/users/${userId}`);
// };

// ---------------- ROLES ----------------

export const getRoles = async () => {
  const response = await api.get("/roles");
  return response.data;
};

// ---------------- COMPANIES ----------------

export const getCompanies = async () => {
  const response = await api.get("/companies");
  return response.data;
};

export const getCompanyById = async (id) => {
  const response = await api.get(`/companies/${id}`);
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

export const updateCompanySettings = async (id, settingsData) => {
  const response = await api.patch(`/companies/${id}/settings`, settingsData);
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};

// ── Package (SaaS) API ────────────────────────────────────────────────────────
export const getPackages = async () => {
  const response = await api.get("/packages");
  return response.data;
};

export const createPackage = async (packageData) => {
  const response = await api.post("/packages", packageData);
  return response.data;
};

export const updatePackage = async (id, packageData) => {
  const response = await api.put(`/packages/${id}`, packageData);
  return response.data;
};

export const deletePackage = async (id) => {
  const response = await api.delete(`/packages/${id}`);
  return response.data;
};

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const getProductById = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data;
};

// export const updateProduct = async (productId, payload) => {
//   const response = await api.put(`/products/${productId}`, payload);
//   return response.data;
// };

// export const deleteProduct = async (productId) => {
//   await api.delete(`/products/${productId}`);
// };

// ---------------- BRANCH PRODUCTS ----------------

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
  const response = await api.post(
    "/branch_products",
    branchProductData
  );
  return response.data;
};

export const getBranchProductIngredientStatus = async (bproId) => {
  const response = await api.get(`/branch_products/${bproId}/ingredient-status`);
  return response.data;
};

export const addBranchProductStock = async (branchProductId, quantity) => {
  const response = await api.post(`/branch_products/${branchProductId}/add-stock`, { quantity });
  return response.data;
};

export const updateBranchProduct = async (branchProductId, payload) => {
  const response = await api.put(`/branch_products/${branchProductId}`, payload);
  return response.data;
};

export const deleteBranchProduct = async (branchProductId) => {
  await api.delete(`/branch_products/${branchProductId}`);
};

// ---------------- ORDERS ----------------

export const getOrders = async (params = {}) => {
  const response = await api.get("/orders", { params });
  return response.data?.data || [];
};

export const getOrderById = async (orderId) => {
  const response = await api.get(`/orders/${orderId}`);
  return res.data?.data ?? res.data ?? [];
};

export const createOrder = async (orderData) => {
  const response = await api.post("/orders", orderData);
  return response.data;
};

export const createPayment = async (paymentData) => {
  const res = await api.post("/payments", paymentData);
  return res.data;
};

// Update a payment (used to change status to 'paid')
export const updatePayment = async (paymentId, payload) => {
  const res = await api.put(`/payments/${paymentId}`, payload);
  return res.data;
};


export const updateOrder = async (orderId, orderData) => {
  const response = await api.put(
    `/orders/${orderId}`,
    orderData
  );
  return response.data;
};



export const updateOrderStatus = async (
  orderId,
  status
) => {
  const response = await api.patch(
    `/orders/${orderId}/status`,
    { status }
  );

  return response.data?.data;
};

// ---------------- ORDER ITEMS ----------------

export const getOrderItems = async () => {
  const response = await api.get("/order-items");
  return response.data?.data || [];
};

export const getOrderItemsByOrderId = async (
  orderId
) => {
  const response = await api.get(
    `/order-items/order/${orderId}`
  );

  return response.data?.data || [];
};

// export const createOrderItem = async (
//   orderItemData
// ) => {
//   const response = await api.post(
//     "/order-items",
//     orderItemData
//   );

//   return response.data;
// };

export const deleteOrderItem = async (
  orderItemId
) => {
  const response = await api.delete(
    `/order-items/${orderItemId}`
  );

  return response.data;
};

export const getCategories = async () => {
  const response = await api.get("/categories");
  return response.data;
};

// ---------------- RAW MATERIALS ----------------

export const getRawMaterials = async () => {
  const response = await api.get("/raw-materials");
  return response.data;
};

export const getLowStockMaterials = async () => {
  const response = await api.get(
    "/raw-materials/low-stock"
  );

  return response.data;
};

// ---------------- RECIPES ----------------

export const getRecipes = async () => {
  const response = await api.get("/recipes");
  return response.data;
};

export const getRecipeById = async (recipeId) => {
  const response = await api.get(
    `/recipes/${recipeId}`
  );

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

export const createRecipeBulk = async (
  payload
) => {
  const response = await api.post(
    "/recipes/bulk",
    payload
  );

  return response.data;
};

export const updateRecipe = async (
  recipeId,
  payload
) => {
  const response = await api.put(
    `/recipes/${recipeId}`,
    payload
  );

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

// export const getLowStockMaterials = async () => {
//   const response = await api.get("/raw-materials/low-stock");
//   return response.data;
// };

// export const createProduct = async (productData) => {
//   const response = await api.post("/products", productData);
//   return response.data;
// };

// export const createOrder = async (orderData) => {
//   const response = await api.post("/orders", orderData);
//   return response.data;
// };

export const checkOrderStock = async (items) => {
  const response = await api.post("/orders/check-stock", { items });
  return response.data;
};

// export const updateOrder = async (orderId, orderData) => {
//   const response = await api.put(`/orders/${orderId}`, orderData);
//   return response.data;
// };

// export const deleteOrderItem = async (orderItemId) => {
//   const response = await api.delete(`/order-items/${orderItemId}`);
//   return response.data;
// };

export const getWaiterProfile = async () => {
  const response = await api.get("/waiter/profile");
  return response.data;
};

export const getWaiterTables = async (
  params = {}
) => {
  const response = await api.get(
    "/waiter/my-tables",
    { params }
  );

  return response.data;
};

export const getWaiterOrders = async (
  params = {}
) => {
  const response = await api.get(
    "/waiter/my-orders",
    { params }
  );

  return response.data;
};

export const createWaiterOrder = async (
  orderData
) => {
  const response = await api.post(
    "/waiter/orders",
    orderData
  );

  return response.data;
};

export const deleteWaiterOrder = async (
  orderId
) => {
  const response = await api.delete(
    `/waiter/orders/${orderId}`
  );

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

export const getStatsSalesOverTime = async (
  params = {}
) => {
  const res = await api.get(
    "/stats/sales-over-time",
    { params }
  );

  return res.data;
};

export const getStatsTypeBreakdown = async (
  params = {}
) => {
  const res = await api.get(
    "/stats/type-breakdown",
    { params }
  );

  return res.data;
};

export const getStatsPeakHours = async (
  params = {}
) => {
  const res = await api.get(
    "/stats/peak-hours",
    { params }
  );

  return res.data;
};

export const getStatsBusyDays = async (
  params = {}
) => {
  const res = await api.get(
    "/stats/busy-days",
    { params }
  );

  return res.data;
};

export const getBranchComparison = async () => {
  const res = await api.get(
    "/stats/branches/compare"
  );

  return res.data;
};

// --- Transactions / purchases helpers ---
// export const getOrderById = async (orderId) => {
//   const response = await api.get(`/orders/${orderId}`);
//   return response.data?.data || null;
// };

//   return res.data?.data ?? res.data ?? [];
// };

export const getPurchaseOrders = async () => {
  const response = await api.get("/purchase-orders");
  return response.data?.data ?? response.data ?? [];
};

export const getPurchaseOrderById = async (
  id
) => {
  const res = await api.get(
    `/purchase-orders/${id}`
  );

  return res.data || null;
};

export const getPurchaseItemsByOrder = async (
  orderId
) => {
  const res = await api.get(
    `/purchase-items/order/${orderId}`
  );

  return res.data || [];
};

// ---------------- PAYMENTS ----------------

export const getSupplierPayments = async (
  params = {}
) => {
  const res = await api.get(
    "/supplier-payments",
    { params }
  );

  return res.data || [];
};

export const getPaymentsByOrder = async (
  poId
) => {
  const res = await api.get(
    `/supplier-payments/order/${poId}`
  );

  return res.data || [];
};

// Payments helper
export const getPayments = async (params = {}) => {
  const res = await api.get("/payments", { params });
  return res.data?.data ?? [];
};

// Cashier Dashboard stats
export const getDashboardStats = async (b_id) => {
  const response = await api.get("/dashboard/stats", {
    params: { b_id },
  });
  return response.data;
};

// Sales summary Reports
export const getSalesSummaryReport = async (payload) => {
  const response = await api.post("/reports/sales", payload);
  return response.data;
};

// Product sales report
export const getProductSalesReport = async (payload) => {
  const response = await api.post("/reports/productsales", payload);
  return response.data;
};

// Raw material stock report
export const getRawMaterialStockReport = async (payload) => {
  const response = await api.post("/reports/rawmaterialstock", payload);
  return response.data;
};

// Raw material consumption report
export const getRawMaterialConsumptionReport = async (payload) => {
  const response = await api.post("/reports/rawmaterialconsumption", payload);
  return response.data;
};

// Cashier sales details report
export const getSalesDetailsReport = async (payload) => {
  const response = await api.post("/reports/salesdetails", payload);
  return response.data;
};

export const getBranchWiseSalesReport = async (payload) => {
  const response = await api.post("/reports/branchsales", payload);
  return response.data;
};

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

// ─── Activity Logs ───────────────────────────────────────────────────────────
export const getActivityLogs = async (params = {}) => {
  try {
    // Try to fetch from the API
    const res = await api.get("/activity-logs", { params });
    return res.data; // { total, page, limit, totalPages, logs }
  } catch (error) {
    // If the endpoint doesn't exist or returns 404/401, return mock data
    if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 500) {
      console.warn("Activity logs endpoint not available, returning mock data");
      return {
        total: 0,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: 0,
        logs: [],
        _mock: true,
        message: "Activity logs feature is not yet implemented on the backend"
      };
    }
    // For other errors, re-throw
    throw error;
  }
};

export const getActivityLogById = async (id) => {
  try {
    const res = await api.get(`/activity-logs/${id}`);
    return res.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 401) {
      return { error: "Log entry not found", _mock: true };
    }
    throw error;
  }
};

export const getActivityLogSummary = async (params = {}) => {
  try {
    const res = await api.get("/activity-logs/summary", { params });
    return res.data; // { byAction, byModule, recent }
  } catch (error) {
    // If the endpoint doesn't exist or returns error, return mock summary
    if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 500) {
      console.warn("Activity log summary endpoint not available, returning mock data");
      return {
        byAction: [
          { action_type: "LOGIN", count: 0 },
          { action_type: "CREATE", count: 0 },
          { action_type: "UPDATE", count: 0 },
          { action_type: "DELETE", count: 0 },
        ],
        byModule: [],
        recent: [],
        _mock: true,
        message: "Activity logs feature is not yet implemented on the backend"
      };
    }
    throw error;
  }
};

export const deleteActivityLog = async (id) => {
  try {
    await api.delete(`/activity-logs/${id}`);
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 401) {
      console.warn("Delete endpoint not available - simulating successful delete");
      return { deleted: true, _mock: true };
    }
    throw error;
  }
};

export const purgeActivityLogs = async ({ before, com_id, b_id } = {}) => {
  try {
    const res = await api.delete("/activity-logs/purge", {
      data: { before, com_id, b_id },
    });
    return res.data; // { deleted: number }
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 500) {
      console.warn("Purge endpoint not available - simulating successful purge");
      return { deleted: 0, _mock: true, message: "Purge feature is not yet implemented" };
    }
    throw error;
  }
};

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

// ─── Tables ──────────────────────────────────────────────────────────────────
export const getTablesByBranch = async (branchId) => {
  const response = await api.get(`/tables/branch/${branchId}`);
  return response.data;
};

export const createTable = async (tableData) => {
  const response = await api.post("/tables", tableData);
  return response.data;
};

export const updateTable = async (id, tableData) => {
  const response = await api.put(`/tables/${id}`, tableData);
  return response.data;
};

export const deleteTable = async (id) => {
  const response = await api.delete(`/tables/${id}`);
  return response.data;
};