import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser } from "../api/userService";

function RegisterPage() {
  const navigate = useNavigate(); // Hook pour la navigation programmatique
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    alias: "",
    mdp: "",
    role: "SELLER",
  });
  const [error, setError] = useState(""); // État pour stocker les messages d'erreur
  const [success, setSuccess] = useState(null); //
  const [loading, setLoading] = useState(false); // État pour indiquer si une requête est en cours

  // Seul un admin peut accéder à cette page, on vérifie donc que l'utilisateur connecté est un admin
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  if (user.role !== "ADMIN") {
    navigate("/", { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value })); // Met à jour l'état du formulaire avec les nouvelles données
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Empêche le comportement par défaut du formulaire (rechargement de la page)
    setError(""); // Réinitialise les messages d'erreur
    setSuccess(null); // Réinitialise le message de succès
    setLoading(true); // Indique que la requête de création d'utilisateur est en cours

    try {
      const newUser = await createUser(
        form.nom,
        form.prenom,
        form.alias,
        form.mdp,
        form.role,
      ); // Appelle la fonction de création d'utilisateur avec les données du formulaire
      setSuccess(newUser);
      setForm({ nom: "", prenom: "", alias: "", mdp: "", role: "SELLER" });
    } catch (error) {
      setError(
        error.response?.data?.error || "Impossible de créer l'utilisateur",
      ); // Affiche le message d'erreur retourné par le serveur ou un message générique
    } finally {
      setLoading(false); // Indique que la requête de création d'utilisateur est terminée
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-4">
            Créer un utilisateur
          </h2>

          {success && (
            <div className="alert alert-success mb-4">
              <span>
                Utilisateur <strong>{success.alias}</strong> créé avec succès.
                Il devra changer son mot de passe à la première connexion.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Nom</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Nom"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Prénom</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="text"
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                placeholder="Prénom"
                required
              />
            </div>

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
                placeholder="Alias unique"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe temporaire</span>
              </label>
              <input
                className="input input-bordered w-full"
                type="password"
                name="mdp"
                value={form.mdp}
                onChange={handleChange}
                placeholder="Min. 6 caractères"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Rôle</span>
              </label>
              <select
                className="select select-bordered w-full"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="SELLER">Vendeur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control mt-4 flex-row gap-2">
              <button
                className="btn btn-primary flex-1"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-dots loading-sm"></span>
                ) : (
                  "Créer"
                )}
              </button>
              <button
                className="btn btn-ghost flex-1"
                type="button"
                onClick={() => navigate("/")}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
