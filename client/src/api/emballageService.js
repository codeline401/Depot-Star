import api from "./api";

export async function getAllEmballages() {
  const response = await api.get("emballages");
  return response.data;
}

export async function createEmballage(data) {
  const response = await api.post("emballages", data);
  return response.data;
}

export async function updateEmballage(id, data) {
  const response = await api.put(`emballages/${id}`, data);
  return response.data;
}

export async function deleteEmballage(id) {
  const response = await api.delete(`emballages/${id}`);
  return response.data;
}
