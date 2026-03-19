import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

export const getBranches = async () => {
  const response = await axios.get(`${BASE_URL}/branches`);
  return response.data;
};

export const getUsers = async () => {
  const response = await axios.get(`${BASE_URL}/users`);
  return response.data;
};

export const getRoles = async () => {
  const response = await axios.get(`${BASE_URL}/roles`);
  return response.data;
};

export const getBranchById = async (branchId) => {
  const response = await axios.get(`${BASE_URL}/branches/${branchId}`);
  return response.data;
};

export const deleteBranchById = async (branchId) => {
  await axios.delete(`${BASE_URL}/branches/${branchId}`);
};

export const getUserById = async (userId) => {
  const response = await axios.get(`${BASE_URL}/users/${userId}`);
  return response.data;
};

// 1. Create User
export const createUser = async (userData) => {
  const res = await axios.post(`${BASE_URL}/users`, userData);
  return res.data; // This returns { u_id, ... }
};

export const deleteUserById = async (userId) => {
  await axios.delete(`${BASE_URL}/users/${userId}`);
};

// 2. Create Branch
export const createBranch = async (branchData) => {
  const res = await axios.post(`${BASE_URL}/branches`, branchData);
  return res.data;
};

/**
 * LOGIC: ORCHESTRATOR
 * This function handles the two-step logic required by your backend
 */
export const setupBranchWithManager = async (combinedData) => {
  try {
    // Step A: Create the User first
    const newUser = await createUser(combinedData.manager);
    
    // Step B: Use the returned u_id to create the Branch
    const branchPayload = {
      ...combinedData.branch,
      U_id: newUser.u_id, // Linking the ID from step A
      com_id: 1 // Assuming a default com_id or pass it from your Auth context
    };

    const newBranch = await createBranch(branchPayload);
    
    return { user: newUser, branch: newBranch };
  } catch (error) {
    // If step A succeeds but step B fails, you might want to handle user deletion 
    // or notify the admin. For now, we throw the error to the UI.
    throw error;
  }
};























// // services/api.js
// import axios from "axios";

// const BASE_URL = "http://localhost:5000/api";


// export const getBranches = async () => {
//   const response = await axios.get(`${BASE_URL}/branches`);
//   return response.data;
// };

// // ADD branch
// export const createBranch = async (branchData) => {
//   const res = await axios.post(`${BASE_URL}/branches`, branchData);
//   return res.data;
// };