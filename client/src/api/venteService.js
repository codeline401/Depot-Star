import api from "./api";

export async function createVente(data) {
  const response = await api.post("ventes", data);
  return response.data;
}

export async function getVentes() {
  const response = await api.get("ventes");
  return response.data;
}

export async function getVente(id) {
  const response = await api.get(`ventes/${id}`);
  return response.data;
}

