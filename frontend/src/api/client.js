import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "";

export const api = axios.create({
  baseURL,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

// ---------- Cases ----------
export const listCases = (status) =>
  api.get("/api/cases", { params: status ? { status } : {} }).then((r) => r.data);

export const getCase = (caseId) =>
  api.get(`/api/cases/${caseId}`).then((r) => r.data);

export const verifyCase = (caseId, payload) =>
  api.post(`/api/cases/${caseId}/verify`, payload).then((r) => r.data);

export const getCasePdfUrl = (caseId) => `/api/cases/${caseId}/pdf`;

// ---------- Upload + extraction ----------
export const uploadPdf = (file, onProgress) => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post("/api/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    })
    .then((r) => r.data);
};

export const runExtraction = (caseId) =>
  api.post(`/api/extract/${caseId}`).then((r) => r.data);

// ---------- Dashboard ----------
export const getDashboard = (department) =>
  api
    .get("/api/dashboard", { params: department ? { department } : {} })
    .then((r) => r.data);

export const getHealth = () => api.get("/health").then((r) => r.data);
