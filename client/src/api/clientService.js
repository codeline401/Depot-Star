import api from "./api";

export async function getAllClients() {
  const response = await api.get("clients");
  return response.data;
}

export async function getClient(id) {
  const response = await api.get(`clients/${id}`);
  return response.data;
}

export async function createClient(data) {
  const response = await api.post("clients", data);
  return response.data;
}

export async function updateClient(id, data) {
  const response = await api.put(`clients/${id}`, data);
  return response.data;
}

export async function deleteClient(id) {
  const response = await api.delete(`clients/${id}`);
  return response.data;
}
