import client from './client';

export function getPublicQuickQuestions(botId) {
  return client.get(`/public/quick-questions/${botId}`).then(res => res.data.questions);
}

export function getAdminQuickQuestions(botId) {
  return client.get(`/admin/quick-questions/${botId}`).then(res => res.data.questions);
}

export function createQuickQuestion(data) {
  return client.post('/admin/quick-questions', data).then(res => res.data);
}

export function updateQuickQuestion({ id, ...data }) {
  return client.put(`/admin/quick-questions/${id}`, data).then(res => res.data);
}

export function deleteQuickQuestion(id) {
  return client.delete(`/admin/quick-questions/${id}`).then(res => res.data);
}
