import { useEffect, useState } from "react";
import Modal from "./Modal";

const FOURNISSEUR_EMPTY = {
  nom: "",
  adresse: "",
  telephone: "",
};

export default function FournisseurModal({
  open,
  fournisseur,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(FOURNISSEUR_EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setForm(fournisseur ?? FOURNISSEUR_EMPTY);
    }
  }, [open, fournisseur]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.nom || !form.telephone) {
      setError("Nom et téléphone sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nom *</span>
          </label>
          <input
            name="nom"
            value={form.nom}
            onChange={handleChange}
            className="input input-bordered w-full"
            placeholder="Nom du fournisseur"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Adiresy</span>
          </label>
          <input
            name="adresse"
            value={form.adresse}
            onChange={handleChange}
            className="input input-bordered w-full"
            placeholder="Adresse"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Téléphone *</span>
          </label>
          <input
            name="telephone"
            value={form.telephone}
            onChange={handleChange}
            className="input input-bordered w-full"
            placeholder="0X XX XX XX XX"
          />
        </div>

        {error && (
          <div role="alert" className="alert alert-error py-2">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hiverina
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : fournisseur ? (
              "Ampidirina"
            ) : (
              "Hamorona"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
