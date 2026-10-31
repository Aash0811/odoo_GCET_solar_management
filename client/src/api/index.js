import apiClient from './client';

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  register: (data) => apiClient.post('/auth/register', data),
  getMe: () => apiClient.get('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
};

export const leadsApi = {
  list: (params) => apiClient.get('/leads', { params }),
  getKanban: (params) => apiClient.get('/leads/kanban', { params }),
  get: (id) => apiClient.get(`/leads/${id}`),
  create: (data) => apiClient.post('/leads', data),
  submitPublicInquiry: (data) => apiClient.post('/leads/public', data),
  createCustomerAccount: (id, data) => apiClient.post(`/leads/${id}/create-customer`, data),
  createCustomerDirect: (data) => apiClient.post('/leads/customer-direct', data),
  updateChecklist: (id, data) => apiClient.patch(`/leads/${id}/checklist`, data),
  updateStage: (id, data, lossReason = null) => {
    const payload = typeof data === 'string' ? { stage: data, lossReason } : data;
    return apiClient.patch(`/leads/${id}/stage`, payload);
  },
  reassign: (id, assignedToId) => apiClient.patch(`/leads/${id}/assign`, { assignedToId }),
  logActivity: (id, data) => apiClient.post(`/leads/${id}/activity`, data),
  getSalesReps: () => apiClient.get('/leads/sales-reps'),
  archive: (id) => apiClient.delete(`/leads/${id}`),
};

export const surveysApi = {
  list: (params) => apiClient.get('/surveys', { params }),
  get: (id) => apiClient.get(`/surveys/${id}`),
  getTechnicians: () => apiClient.get('/surveys/technicians'),
  schedule: (data) => apiClient.post('/surveys/schedule', data),
  submit: (id, formData) =>
    apiClient.post(`/surveys/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  review: (id, data) => apiClient.patch(`/surveys/${id}/review`, data),
};

export const inventoryApi = {
  getProducts: (params) => apiClient.get('/inventory/products', { params }),
  createProduct: (data) => apiClient.post('/inventory/products', data),
  updateProduct: (id, data) => apiClient.patch(`/inventory/products/${id}`, data),
  getTemplates: () => apiClient.get('/inventory/templates'),
  getTemplate: (id) => apiClient.get(`/inventory/templates/${id}`),
  createTemplate: (data) => apiClient.post('/inventory/templates', data),
  updateTemplate: (id, data) => apiClient.patch(`/inventory/templates/${id}`, data),
};

export const quotesApi = {
  list: (params) => apiClient.get('/quotes', { params }),
  get: (id) => apiClient.get(`/quotes/${id}`),
  create: (data) => apiClient.post('/quotes', data),
  updateLines: (id, data) => apiClient.patch(`/quotes/${id}/lines`, data),
  approveDiscount: (id, data) => apiClient.patch(`/quotes/${id}/approve-discount`, data),
  accept: (id, data) => apiClient.post(`/quotes/${id}/accept`, data),
  reject: (id, data) => apiClient.post(`/quotes/${id}/reject`, data),
  getShared: (token) => apiClient.get(`/quotes/shared/${token}`),
  acceptShared: (token, data) => apiClient.post(`/quotes/shared/${token}/accept`, data),
  rejectShared: (token, data) => apiClient.post(`/quotes/shared/${token}/reject`, data),
  updateStatus: (id, data) => apiClient.patch(`/quotes/${id}/status`, data),
  downloadPdf: (id) => apiClient.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
  downloadPdfUrl: (id) => {
    const token = localStorage.getItem('sunpower_token');
    return `${apiClient.defaults.baseURL}/quotes/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const ordersApi = {
  list: (params) => apiClient.get('/orders', { params }),
  get: (id) => apiClient.get(`/orders/${id}`),
  createFromQuote: (data) => apiClient.post('/orders', data),
  recordPayment: (id, data) => apiClient.post(`/orders/${id}/payments`, data),
  verifyPayment: (orderId, paymentId, data) => apiClient.patch(`/orders/${orderId}/payments/${paymentId}/verify`, data),
  sendReminder: (id, data) => apiClient.post(`/orders/${id}/reminders`, data),
  downloadReceipt: (orderId, paymentId) => apiClient.get(`/orders/${orderId}/payments/${paymentId}/receipt`, { responseType: 'blob' }),
  downloadReceiptUrl: (orderId, paymentId) => {
    const token = localStorage.getItem('sunpower_token');
    return `${apiClient.defaults.baseURL}/orders/${orderId}/payments/${paymentId}/receipt${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
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
  downloadCertificateUrl: (id) => {
    const token = localStorage.getItem('sunpower_token');
    return `${apiClient.defaults.baseURL}/jobs/${id}/certificate${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const warrantyApi = {
  search: (params) => apiClient.get('/warranty/search', { params: typeof params === 'string' ? { q: params } : params }),
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
  downloadInvoiceUrl: (id) => {
    const token = localStorage.getItem('sunpower_token');
    return `${apiClient.defaults.baseURL}/finance/invoices/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const dashboardApi = {
  getStats: (timeframe = 'month') => apiClient.get('/dashboard/stats', { params: { timeframe } }),
  exportCsv: () => apiClient.get('/dashboard/export-csv', { responseType: 'blob' }),
  exportCsvUrl: () => {
    const token = localStorage.getItem('sunpower_token');
    return `${apiClient.defaults.baseURL}/dashboard/export-csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  createShareLink: (data) => apiClient.post('/dashboard/share-link', data),
  getShared: (token) => apiClient.get(`/dashboard/shared/${token}`),
};

export const customerPortalApi = {
  getMe: (customerId) => apiClient.get('/customer-portal/me', { params: { customerId } }),
  raiseTicket: (data) => apiClient.post('/customer-portal/tickets', data),
  signJob: (jobId, data) => apiClient.post(`/customer-portal/jobs/${jobId}/sign`, data),
  requestQuote: (data) => apiClient.post('/leads/public', data),
};

export const companyApi = {
  get: () => apiClient.get('/company'),
  update: (data) => apiClient.patch('/company', data),
};
