import api from "./api";

export async function getMouvements(articleId) {
  const params = articleId != null ? `?articleId=${articleId}` : "";
  const response = await api.get(`mouvements${params}`);
  return response.data;
}

export async function createCorrection({ articleId, quantite, motif }) {
  const response = await api.post("mouvements", { articleId, quantite, motif });
  return response.data;
}

export async function validerInventairePhysique({ articles, emballages }) {
  const response = await api.post("mouvements/inventaire-physique", {
    articles,
    emballages,
  });
  return response.data;
}
