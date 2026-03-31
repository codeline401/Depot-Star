import { Navigate } from "react-router-dom";

function isTokenValid(token) {
  try {
    const part = token.split(".")[1]; // Récupère la partie payload du token JWT
    if (!part) return false;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/"); // Convertit le format base64url en base64 standard
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4); // Ajoute le padding nécessaire pour le décodage base64
    const payload = JSON.parse(atob(padded)); // Décode le payload du token
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now(); // Vérifie si le token est encore valide
  } catch {
    return false;
  }
}

function ProtecteRoute({ children, adminOnly = false }) {
  // Composant de route protégée qui vérifie si l'utilisateur est authentifié
  const token = localStorage.getItem("token"); // Récupère le token JWT depuis le localStorage pour vérifier l'authentification
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    localStorage.removeItem("user");
  }

  if (!token || !isTokenValid(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />; // Redirige vers la page de login si l'utilisateur n'est pas authentifié ou si le token est expiré
  }

  // Forcer le changment de mot de passe à la première connexion
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Redirige les SELLER vers /vente si la route est réservée aux admins
  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/vente" replace />;
  }

  return children;
}

export default ProtecteRoute;
