import axios from "axios";

const useProxy = import.meta.env.VITE_USE_PROXY === "1";
const isProd = import.meta.env.MODE === "production";

export const API = axios.create({
  baseURL: isProd
    ? `${import.meta.env.VITE_API_URL}/api`
    : (useProxy ? "/api" : `${import.meta.env.VITE_API_URL}/api`),
  withCredentials: true,
});

// Dev-only header-based auth support per tab (sessionStorage)
API.interceptors.request.use((config) => {
  // Attach prod token if present
  try {
    const accessToken = localStorage.getItem("ACCESS_TOKEN");
    if (accessToken && typeof accessToken === "string" && accessToken.length > 0) {
      config.headers = config.headers ?? {};
      (config.headers as any)["Authorization"] = `Bearer ${accessToken}`;
    }
  } catch {}

  // In development, also allow per-tab dev token from sessionStorage
  if (import.meta.env.MODE === "development") {
    try {
      const token = sessionStorage.getItem("DEV_ACCESS_TOKEN");
      if (token && typeof token === "string" && token.length > 0) {
        config.headers = config.headers ?? {};
        (config.headers as any)["x-dev-access-token"] = token;
        (config.headers as any)["Authorization"] = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});
