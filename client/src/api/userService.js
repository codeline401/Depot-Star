// les fonctions metiers
import api from "./api";

export async function login(alias, mdp) {
  const response = await api.post("users/login", { alias, mdp }); // Envoie une requête POST à l'endpoint /users/login avec les données d'identification de l'utilisateur
  return response.data; // { user, token }
}

export async function createUser(alias, mdp, role = "SELLER") {
  const response = await api.post("users/register", {
    alias,
    mdp,
    role,
  });
  return response.data; // user
}

export async function changePassword(newMdp) {
  const response = await api.post("users/change-password", { newMdp }); // Envoie une requête POST à l'endpoint /users/change-password avec le nouveau mot de passe
  return response.data; // { message: "Password changed successfully." }
}

export async function getAllUsers() {
  const response = await api.get("users"); // Envoie une requête GET à l'endpoint /users pour récupérer tous les utilisateurs (admin seulement)
  return response.data; // [ { id, nom, prenom, alias, role }, ... ]
}
