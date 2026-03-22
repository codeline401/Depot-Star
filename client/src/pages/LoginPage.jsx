import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/userService";
import { SignUpIcon } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate(); // Hook pour la navigation programmatique
  const [form, setForm] = useState({ alias: "", mdp: "" }); // État pour stocker les données du formulaire de login
  const [error, setError] = useState(""); // État pour stocker les messages d'erreur
  const [loading, setLoading] = useState(false); // État pour indiquer si une requête est en cours

  const handleChange = (e) => {
    const { name, value } = e.target; // Récupère le nom et la valeur du champ de formulaire modifié
    setForm((prev) => ({ ...prev, [name]: value })); // Met à jour l'état du formulaire avec les nouvelles données
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Empêche le comportement par défaut du formulaire (rechargement de la page)
    setError(""); // Réinitialise les messages d'erreur
    setLoading(true); // Indique que la requête de login est en cours

    try {
      const data = await login(form.alias, form.mdp); // Appelle la fonction de login avec les données du formulaire
      localStorage.setItem("token", data.token); // Stocke le token JWT dans le localStorage
      localStorage.setItem("user", JSON.stringify(data.user)); // Stocke les informations de l'utilisateur dans le localStorage
      navigate(data.user.mustChangePassword ? "/change-password" : "/"); // Redirige vers la page de changement de mot de passe si nécessaire, sinon vers le dashboard
    } catch (error) {
      // axiow met l'erreur serveur dans error.response.data.error
      setError(error.response?.data?.error || "Connexion impossible"); // Affiche le message d'erreur retourné par le serveur ou un message générique
    } finally {
      setLoading(false); // Indique que la requête de login est terminée
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl justify-center mb-1">
            Dépôt Star
          </h1>
          <p className="text-center text-base-content/60 mb-4">
            Ampidiro ny momba anao raha hiasa
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Alias</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="text"
                name="alias"
                value={form.alias}
                onChange={handleChange}
                placeholder="votre alias"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="password"
                name="mdp"
                value={form.mdp}
                onChange={handleChange}
                placeholder="votre mot de passe"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control mt-4 space-x-2">
              <button
                className={`btn btn-primary ${loading ? "loading" : ""}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-dots loading-sm"></span>
                ) : (
                  "Se connecter"
                )}
              </button>

              <button className="btn btn-ghost btn-sm">
                <Link to="/register">Créer un compte</Link>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
