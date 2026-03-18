// services/api.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

export const getBranches = async () => {
  const response = await axios.get(`${BASE_URL}/branches`);
  return response.data;
};