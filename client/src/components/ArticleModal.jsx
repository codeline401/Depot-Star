import { useEffect, useState } from "react";
import Modal from "./Modal";

const ARTICLE_EMPTY = {
  // structure de l'article pour le formulaire
  nom: "",
  prix: "",
  quantiteStock: "",
  bottleType: "PLASTIQUE",
  aConsigner: false,
  prixConsigne: "",
  fournisseurId: "",
};

export default function ArticleModal({
  open,
  article,
  fournisseurs,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(ARTICLE_EMPTY); // état du formulaire
  const [error, setError] = useState(""); // message d'erreur
  const [saving, setSaving] = useState(false); // état de sauvegarde pour désactiver le bouton

  useEffect(() => {
    if (open) {
      // lorsque le modal s'ouvre, on initialise le formulaire
      setError("");
      setForm(
        article
          ? {
              nom: article.nom,
              prix: article.prix,
              quantiteStock: article["quantitéStock"],
              bottleType: article.bottleType,
              aConsigner: article.aConsigner,
              prixConsigne: article.prixConsigne ?? "",
              fournisseurId: article.fournisseurId,
            }
          : ARTICLE_EMPTY,
      );
    }
  }, [open, article]); // on réinitialise le formulaire à chaque ouverture du modal, avec les données de l'article si on en a une

  function handleChange(e) {
    // gestion des changements dans le formulaire, gère aussi bien les inputs text/number que les checkbox
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (
      !form.nom ||
      form.prix === "" ||
      form.prix == null ||
      form.quantiteStock === "" ||
      form.quantiteStock == null ||
      !form.fournisseurId
    ) {
      setError("Tsy maintsy fenoina daholo ireo rehetra ireo.");
      return;
    }
    if (
      form.aConsigner &&
      (form.prixConsigne === "" || form.prixConsigne == null)
    ) {
      setError("Tsy maintsy asiana vidin'ny consignation ity entana ity.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nom: form.nom,
        prix: parseFloat(form.prix),
        quantiteStock: parseInt(form.quantiteStock),
        bottleType: form.bottleType,
        aConsigner: form.aConsigner,
        prixConsigne: form.aConsigner ? parseFloat(form.prixConsigne) || 0 : 0,
        fournisseurId: parseInt(form.fournisseurId),
      });
    } catch (err) {
      setError(err?.response?.data?.error || "Nisy olana kely niseho.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={article ? "Hanova ny entana" : "Entana vaovao"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Anarana *</span>
          </label>
          <input
            name="nom"
            value={form.nom}
            onChange={handleChange}
            className="input input-bordered w-full"
            placeholder="Anarana ny entana"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Vidiny (Ar) *</span>
            </label>
            <input
              name="prix"
              type="number"
              step="0.01"
              min="0"
              value={form.prix}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="0.00"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Isany *</span>
            </label>
            <input
              name="quantiteStock"
              type="number"
              min="0"
              value={form.quantiteStock}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Type de bouteille</span>
          </label>
          <select
            name="bottleType"
            value={form.bottleType}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="PLASTIQUE">Plastique</option>
            <option value="VERRE">Verre</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Fournisseur *</span>
          </label>
          <select
            name="fournisseurId"
            value={form.fournisseurId}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="">-- Sélectionner --</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              name="aConsigner"
              type="checkbox"
              checked={form.aConsigner}
              onChange={handleChange}
              className="checkbox checkbox-primary"
            />
            <span className="label-text">Article à consigner</span>
          </label>
        </div>

        {form.aConsigner && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Prix de consigne (Ar) *</span>
            </label>
            <input
              name="prixConsigne"
              type="number"
              step="0.01"
              min="0"
              value={form.prixConsigne}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="0.00"
            />
          </div>
        )}

        {error && (
          <div role="alert" className="alert alert-error py-2">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : article ? (
              "Enregistrer"
            ) : (
              "Créer"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
