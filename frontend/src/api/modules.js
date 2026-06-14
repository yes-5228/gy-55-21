import { api } from "./client";

export const lockersApi = {
  list: (params) => api.get("/lockers/cells/", { params }),
  summary: () => api.get("/lockers/cells/summary/"),
  reset: (id) => api.post(`/lockers/cells/${id}/reset/`, {}),
  markMaintenance: (id) => api.post(`/lockers/cells/${id}/mark_maintenance/`, {}),
  toggleMaintenance: (id, isMaintenance) =>
    api.post(`/lockers/cells/${id}/toggle_maintenance/`, { is_maintenance: isMaintenance }),
  updateSize: (id, size) => api.patch(`/lockers/cells/${id}/update_size/`, { size }),
  createCell: (payload) => api.post("/lockers/cells/", payload),
  updateCell: (id, payload) => api.patch(`/lockers/cells/${id}/`, payload),
  deleteCell: (id) => api.delete(`/lockers/cells/${id}/`),
};

export const zonesApi = {
  list: () => api.get("/lockers/zones/"),
  get: (id) => api.get(`/lockers/zones/${id}/`),
  create: (payload) => api.post("/lockers/zones/", payload),
  update: (id, payload) => api.patch(`/lockers/zones/${id}/`, payload),
  delete: (id) => api.delete(`/lockers/zones/${id}/`),
  toggleActive: (id) => api.post(`/lockers/zones/${id}/toggle_active/`, {}),
  listCells: (id) => api.get(`/lockers/zones/${id}/cells/`),
  batchCreateCells: (id, payload) => api.post(`/lockers/zones/${id}/batch_create_cells/`, payload),
};

export const parcelsApi = {
  list: () => api.get("/parcels/"),
  inbound: (payload) => api.post("/parcels/inbound/", payload),
  open: (pickupCode) => api.post("/parcels/open/", { pickup_code: pickupCode }),
};

export const notificationsApi = {
  list: () => api.get("/notifications/"),
};

export const returnsApi = {
  list: () => api.get("/returns/"),
  create: (payload) => api.post("/returns/", payload),
  complete: (id) => api.post(`/returns/${id}/complete/`, {}),
};
