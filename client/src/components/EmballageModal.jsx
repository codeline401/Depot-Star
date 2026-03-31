import { useEffect, useState } from "react";
import Modal from "./Modal";

// Règles de correspondance bouteille ↔ cageot
const BOUTEILLE_PRIX = [300, 500, 700];
const CAGEOT_CAPACITES = [
  { capacite: 24, bouteillePrix: 300 },
  { capacite: 20, bouteillePrix: 500 },
  { capacite: 12, bouteillePrix: 700 },
];

function getCapacite(bouteillePrix) {
  const found = CAGEOT_CAPACITES.find((c) => c.bouteillePrix === Number(bouteillePrix));
  return found ? found.capacite : 0;
}

const EMPTY_FORM = {
  type: "BOUTEILLE",
  bouteillePrix: "300",   // for BOUTEILLE
  cageotCapacite: "24",   // for CAGEOT
  quantiteStock: "0",
};

export default function EmballageModal({ open, emballage, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(emballage);

  useEffect(() => {
    if (open) {
      setError("");
      if (emballage) {
        setForm({
          type: emballage.type,
          bouteillePrix: emballage.type === "BOUTEILLE" ? String(emballage.prixConsigne) : "300",
          cageotCapacite: emballage.type === "CAGEOT" ? String(emballage.capacite) : "24",
          quantiteStock: String(emballage.quantiteStock),
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, emballage]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Sync cageotCapacite when bouteillePrix changes (and vice versa)
      if (name === "bouteillePrix") {
        next.cageotCapacite = String(getCapacite(Number(value)));
      }
      if (name === "cageotCapacite") {
        const found = CAGEOT_CAPACITES.find((c) => c.capacite === Number(value));
        if (found) next.bouteillePrix = String(found.bouteillePrix);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const qty = parseInt(form.quantiteStock);
    if (isNaN(qty) || qty < 0) {
      setError("La quantité doit être un nombre positif ou nul.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // En modification : seule la quantité est modifiable
        await onSave({ quantiteStock: qty });
      } else {
        const payload = {
          type: form.type,
          quantiteStock: qty,
        };
        if (form.type === "BOUTEILLE") {
          payload.prixConsigne = Number(form.bouteillePrix);
          payload.capacite = 0;
        } else {
          payload.prixConsigne = 8000;
          payload.capacite = Number(form.cageotCapacite);
        }
        await onSave(payload);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Nisy olana kely niseho.");
    } finally {
      setSaving(false);
    }
  }

  // Label affiché pour un emballage existant
  function getEditLabel() {
    if (!emballage) return "";
    if (emballage.type === "BOUTEILLE") {
      return `Bouteille ${emballage.prixConsigne} Ar`;
    }
    const found = CAGEOT_CAPACITES.find((c) => c.capacite === emballage.capacite);
    return `Cageot ${emballage.capacite} bouteilles (${found ? found.bouteillePrix : "?"} Ar)`;
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Modifier : ${getEditLabel()}` : "Nouvel emballage"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* TYPE (lecture seule en édition) */}
        {!isEdit && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Type d'emballage *</span>
            </label>
            <div className="flex gap-4">
              {["BOUTEILLE", "CAGEOT"].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={handleChange}
                    className="radio radio-primary"
                  />
                  <span className="label-text capitalize">{t === "BOUTEILLE" ? "Bouteille" : "Cageot"}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* BOUTEILLE : prix de consigne */}
        {!isEdit && form.type === "BOUTEILLE" && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Consignation bouteille *</span>
            </label>
            <select
              name="bouteillePrix"
              value={form.bouteillePrix}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              {BOUTEILLE_PRIX.map((p) => (
                <option key={p} value={p}>
                  {p} Ar — cageot de {getCapacite(p)} bouteilles
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CAGEOT : capacité */}
        {!isEdit && form.type === "CAGEOT" && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Capacité du cageot *</span>
            </label>
            <select
              name="cageotCapacite"
              value={form.cageotCapacite}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              {CAGEOT_CAPACITES.map(({ capacite, bouteillePrix }) => (
                <option key={capacite} value={capacite}>
                  {capacite} bouteilles (consignation {bouteillePrix} Ar) — cageot 8 000 Ar
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Résumé prix pour la création */}
        {!isEdit && (
          <div className="rounded-box bg-base-200 px-4 py-2 text-sm text-base-content/70 space-y-1">
            {form.type === "BOUTEILLE" ? (
              <>
                <p>Consignation bouteille : <strong>{form.bouteillePrix} Ar</strong></p>
                <p>1 cageot de bouteilles {form.bouteillePrix} Ar = <strong>{getCapacite(Number(form.bouteillePrix))} bouteilles</strong></p>
              </>
            ) : (
              <>
                <p>Consignation cageot : <strong>8 000 Ar</strong></p>
                <p>1 cageot = <strong>{form.cageotCapacite} bouteilles</strong> à{" "}
                  <strong>{CAGEOT_CAPACITES.find((c) => c.capacite === Number(form.cageotCapacite))?.bouteillePrix ?? "?"} Ar</strong>
                </p>
              </>
            )}
          </div>
        )}

        {/* QUANTITE */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Quantité en stock *</span>
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
            ) : isEdit ? (
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
