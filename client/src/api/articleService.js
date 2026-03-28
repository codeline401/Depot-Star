import api from "./api";

export async function getAllArticles() {
  const response = await api.get("articles");
  return response.data;
}

export async function createArticle(data) {
  const response = await api.post("articles", data);
  return response.data;
}

export async function updateArticle(id, data) {
  const response = await api.put(`articles/${id}`, data);
  return response.data;
}

export async function deleteArticle(id) {
  const response = await api.delete(`articles/${id}`);
  return response.data;
}

export async function getAllFournisseurs() {
  const response = await api.get("fournisseurs");
  return response.data;
}

export async function createFournisseur(data) {
  const response = await api.post("fournisseurs", data);
  return response.data;
}

export async function updateFournisseur(id, data) {
  const response = await api.put(`fournisseurs/${id}`, data);
  return response.data;
}

export async function deleteFournisseur(id) {
  const response = await api.delete(`fournisseurs/${id}`);
  return response.data;
}
