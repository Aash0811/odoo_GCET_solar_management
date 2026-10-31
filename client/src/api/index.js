import apiClient from './client';

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
};

export const leadsApi = {
  list: (params) => apiClient.get('/leads', { params }),
  get: (id) => apiClient.get(`/leads/${id}`),
  create: (data) => apiClient.post('/leads', data),
  updateChecklist: (id, data) => apiClient.patch(`/leads/${id}/checklist`, data),
  updateStage: (id, data) => apiClient.patch(`/leads/${id}/stage`, data),
  archive: (id) => apiClient.delete(`/leads/${id}`),
};

export const surveysApi = {
  list: (params) => apiClient.get('/surveys', { params }),
  get: (id) => apiClient.get(`/surveys/${id}`),
  schedule: (data) => apiClient.post('/surveys/schedule', data),
  submit: (id, formData) =>
    apiClient.post(`/surveys/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  review: (id, data) => apiClient.patch(`/surveys/${id}/review`, data),
};

export const inventoryApi = {
  getProducts: (params) => apiClient.get('/inventory/products', { params }),
  getTemplates: () => apiClient.get('/inventory/templates'),
  getTemplate: (id) => apiClient.get(`/inventory/templates/${id}`),
};

export const quotesApi = {
  list: (params) => apiClient.get('/quotes', { params }),
  get: (id) => apiClient.get(`/quotes/${id}`),
  create: (data) => apiClient.post('/quotes', data),
  updateStatus: (id, data) => apiClient.patch(`/quotes/${id}/status`, data),
  downloadPdfUrl: (id) => `${apiClient.defaults.baseURL}/quotes/${id}/pdf`,
};

export const ordersApi = {
  list: (params) => apiClient.get('/orders', { params }),
  get: (id) => apiClient.get(`/orders/${id}`),
  createFromQuote: (data) => apiClient.post('/orders', data),
  recordPayment: (id, data) => apiClient.post(`/orders/${id}/payments`, data),
};

export const dispatchApi = {
  listPickLists: (params) => apiClient.get('/dispatch/pick-lists', { params }),
  getPickList: (id) => apiClient.get(`/dispatch/pick-lists/${id}`),
  scanSerial: (data) => apiClient.post('/dispatch/scan-serial', data),
  validateDelivery: (orderId, data) => apiClient.post(`/dispatch/orders/${orderId}/validate-delivery`, data),
};

export const jobsApi = {
  list: (params) => apiClient.get('/jobs', { params }),
  get: (id) => apiClient.get(`/jobs/${id}`),
  updateProgress: (id, data) => apiClient.patch(`/jobs/${id}/progress`, data),
  uploadPhoto: (id, formData) =>
    apiClient.post(`/jobs/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  complete: (id, data) => apiClient.post(`/jobs/${id}/complete`, data),
  downloadCertificateUrl: (id) => `${apiClient.defaults.baseURL}/jobs/${id}/certificate`,
};

export const warrantyApi = {
  search: (q) => apiClient.get('/warranty/search', { params: { q } }),
  getExpiring: (days = 60) => apiClient.get('/warranty/expiring', { params: { days } }),
  void: (id, data) => apiClient.patch(`/warranty/${id}/void`, data),
};

export const ticketsApi = {
  list: (params) => apiClient.get('/tickets', { params }),
  get: (id) => apiClient.get(`/tickets/${id}`),
  create: (data) => apiClient.post('/tickets', data),
  addLine: (id, data) => apiClient.post(`/tickets/${id}/lines`, data),
  resolve: (id, data) => apiClient.post(`/tickets/${id}/resolve`, data),
  updateStatus: (id, data) => apiClient.patch(`/tickets/${id}/status`, data),
};

export const financeApi = {
  getCosting: (params) => apiClient.get('/finance/costing', { params }),
  getSubsidies: () => apiClient.get('/finance/subsidies'),
  updateSubsidy: (id, data) => apiClient.patch(`/finance/subsidies/${id}`, data),
  getPayouts: () => apiClient.get('/finance/payouts'),
  getInvoices: (params) => apiClient.get('/finance/invoices', { params }),
  addCostEntry: (data) => apiClient.post('/finance/cost-entries', data),
  downloadInvoiceUrl: (id) => `${apiClient.defaults.baseURL}/finance/invoices/${id}/pdf`,
};

export const dashboardApi = {
  getStats: (timeframe = 'month') => apiClient.get('/dashboard/stats', { params: { timeframe } }),
  exportCsvUrl: () => `${apiClient.defaults.baseURL}/dashboard/export-csv`,
  createShareLink: (data) => apiClient.post('/dashboard/share-link', data),
  getShared: (token) => apiClient.get(`/dashboard/shared/${token}`),
};

export const customerPortalApi = {
  getMe: (customerId) => apiClient.get('/customer-portal/me', { params: { customerId } }),
  raiseTicket: (data) => apiClient.post('/customer-portal/tickets', data),
  signJob: (jobId, data) => apiClient.post(`/customer-portal/jobs/${jobId}/sign`, data),
};
