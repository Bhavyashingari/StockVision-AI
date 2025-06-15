import axios from "axios";
import Cookies from "js-cookie";
import { HOST } from "./constants";

// Create an Axios instance with a base URL
const apiClient = axios.create({
  baseURL: HOST,
  withCredentials: true, // optional: allows sending cookies with requests
});

// Add a request interceptor to attach the token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access-token");

    if (
      token &&
      !config.url.includes("/login") &&
      !config.url.includes("/signup")
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// You can also add a response interceptor if needed
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // Optionally handle token expiry or redirect to login
//     return Promise.reject(error);
//   }
// );

export default apiClient;
