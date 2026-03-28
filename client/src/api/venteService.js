import api from "./api";

export async function createVente(data) {
  const response = await api.post("ventes", data);
  return response.data;
}
