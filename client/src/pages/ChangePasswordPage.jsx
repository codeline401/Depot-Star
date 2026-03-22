import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/userService";

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ newMdp: "", confirmMdp: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target; // Récupère le nom et la valeur du champ de formulaire modifié
    setForm((prev) => ({ ...prev, [name]: value })); // Met à jour l'état du formulaire avec les nouvelles données
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Empêche le comportement par défaut du formulaire (rechargement de la page)
    setError(""); // Réinitialise les messages d'erreur

    if (form.newMdp !== form.confirmMdp) {
      return setError("Tsy mitovy ireo mot de passe ireo"); // Affiche un message d'erreur si les mots de passe ne correspondent pas
    }

    if (form.newMdp.length < 6) {
      return setError("Tokony 6 caractères farafahakeliny ny mot de passe"); // Affiche un message d'erreur si le mot de passe est trop court
    }

    setLoading(true); // Indique que la requête de changement de mot de passe est en cours

    try {
      await changePassword(form.newMdp); // Appelle la fonction de changement de mot de passe avec le nouveau mot de passe

      // Mettre à jour le user en local pour ne plus voir cette page
      const user = JSON.parse(localStorage.getItem("user") || "{}"); // Récupère les informations de l'utilisateur depuis le localStorage
      localStorage.getItem(
        "user",
        JSON.stringify({ ...user, mustChangePassword: false }),
      ); // Met à jour le champ mustChangePassword de l'utilisateur dans le localStorage

      navigate("/"); // Redirige vers la page de dashboard après un changement de mot de passe réussi
    } catch (error) {
      setError(
        error.response?.data?.error || "Impossible de changer le mot de passe",
      ); // Affiche le message d'erreur retourné par le serveur ou un message générique
    } finally {
      setLoading(false); // Indique que la requête de changement de mot de passe est terminée
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl justify-center mb-1">
            Soloy ny mot de passe
          </h1>
          <p className="text-center text-base-content/60 mb-4">
            Sambany vao hiditra, soloy ny mot de passe-nao
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe vaovao</span>
              </label>
              <input
                type="password"
                name="newMdp"
                value={form.newMdp}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="Entrez votre nouveau mot de passe"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirmez le mot de passe</span>
              </label>
              <input
                type="password"
                name="confirmMdp"
                value={form.confirmMdp}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="Confirmez votre mot de passe"
              />
            </div>
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            <div className="form-control mt-4">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-dots loading-sm" />
                ) : (
                  "Soloina"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
