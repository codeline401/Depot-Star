import api from "./api";

/**
 * Crée un ordre d'appro avec status VERIFIE.
 * Appelé au clic sur "Checker l'appro".
 *
 * @param {{ articleId: number, articleNom: string, prixUnitaire: number, qteCommandee: number }[]} lignes
 */
export async function createAppro(lignes) {
  const response = await api.post("appros", { lignes });
  return response.data;
}

/**
 * Valide un ordre d'appro (VERIFIE → VALIDE) et entre les marchandises en stock.
 * @param {number} approId
 */
export async function validerAppro(approId) {
  const response = await api.put(`appros/${approId}/valider`);
  return response.data;
}

/**
 * Retourne l'historique de tous les ordres d'appro.
 */
export async function getAllAppros() {
  const response = await api.get("appros");
  return response.data;
}
