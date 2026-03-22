import { Navigate } from "react-router-dom";

function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function ProtecteRoute({ children }) {
  // Composant de route protégée qui vérifie si l'utilisateur est authentifié
  const token = localStorage.getItem("token"); // Récupère le token JWT depuis le localStorage pour vérifier l'authentification
  const user = JSON.parse(localStorage.getItem("user") || "{}"); // Récupère les informations de l'utilisateur depuis le localStorage

  if (!token || !isTokenValid(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />; // Redirige vers la page de login si l'utilisateur n'est pas authentifié ou si le token est expiré
  }

  // Forcer le changment de mot de passe à la première connexion
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />; // Redirige vers la page de changement de mot de passe si l'utilisateur doit changer son mot de passe
  }

  return children; // Rend les enfants si l'utilisateur est authentifié
}

export default ProtecteRoute;
