import axios from "axios";

const api = axios.create({
  baseURL: "https://document-reader-backend.onrender.com/api",
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("biztel_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("biztel_token");
      localStorage.removeItem("biztel_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const login = (email, password) =>
  api.post("/auth/login", { email, password });
export const register = (name, email, password) =>
  api.post("/auth/register", { name, email, password });
export const getMe = () => api.get("/auth/me");
export const getProviderInfo = () => api.get("/provider");

export const uploadDocument = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) =>
      onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
};
export const getUploads = (params) => api.get("/uploads", { params });
export const getUpload = (id) => api.get(`/uploads/${id}`);
export const getFileUrl = (id) => `/api/uploads/${id}/file`;

export const getRecords = (params) => api.get("/records", { params });
export const getRecord = (id) => api.get(`/records/${id}`);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data);
export const updateRecordStatus = (id, status, reviewedBy) =>
  api.patch(`/records/${id}/status`, { status, reviewed_by: reviewedBy });
export const deleteRecord = (id) => api.delete(`/records/${id}`);

export const getAnalytics = () => api.get("/analytics");

export default api;
