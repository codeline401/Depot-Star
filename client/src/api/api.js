import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "/api", // Utilise la variable d'environnement VITE_BASE_URL ou une URL par défaut
  headers: {
    "Content-Type": "application/json",
  },
});

// Injecte auto le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    // Interceptor pour ajouter le token JWT à chaque requête
    const token = localStorage.getItem("token"); // Récupère le token JWT depuis le localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Ajoute le token JWT à l'en-tête Authorization
    }
    return config; // Retourne la configuration de la requête
  },
  (error) => {
    return Promise.reject(error); // Gestion des erreurs
  },
);

// Redirige vers /login si le token est expiré ou invalide
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuthheader = Boolean(error.config?.header?.Authorization); // Vérifie si la requête avait un en-tête Authorization

    if (error.response?.status === 401 && hadAuthheader) {
      // Si la réponse est 401 Unauthorized et que la requête avait un en-tête Authorization
      localStorage.removeItem("token"); // Supprime le token JWT du localStorage
      localStorage.removeItem("user"); // Supprime les infos utilisateur du localStorage
      window.location.replace = "/login"; // Redirige vers la page de login
    }
    return Promise.reject(error); // Gestion des erreurs
  },
);

export default api;
