import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  createArticle,
  getAllArticles,
  getAllFournisseurs,
} from "../api/articleService";
import { createAppro, validerAppro } from "../api/approService";
import ArticleModal from "../components/ArticleModal";

// Valeur par défaut du seuil (utilisée si rien n'est stocké localement)
const SEUIL_DEFAULT = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApproPage() {
  // ── Données de référence ───────────────────────────────────────────────────
  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Seuil dynamique ───────────────────────────────────────────────────────
  // Persisté dans localStorage pour retrouver la valeur après rechargement.
  const [seuil, setSeuil] = useState(() => {
    const stored = parseInt(localStorage.getItem("appro_seuil"));
    return Number.isFinite(stored) && stored > 0 ? stored : SEUIL_DEFAULT;
  });
  // Valeur temporaire dans le champ de saisie (avant confirmation)
  const [seuilInput, setSeuilInput] = useState("");
  const [editingSeuil, setEditingSeuil] = useState(false);

  // ── Liste d'appro : [{ article, qteACommander }] ───────────────────────────
  // Chaque ligne identifie l'article et la quantité à réapprovisionner.
  const [lignes, setLignes] = useState([]);

  // ── UI : ajout manuel d'un article non-listé ───────────────────────────────
  const [addArticleId, setAddArticleId] = useState("");

  // ── Workflow en deux étapes ────────────────────────────────────────────────
  // checked : true après avoir cliqué "Checker" (ordre VERIFIE créé en base)
  // approId : id de l'ordre Appro en base (null si pas encore checké)
  const [checked, setChecked] = useState(false);
  const [approId, setApproId] = useState(null);
  const [checking, setChecking] = useState(false);
  const [validating, setValidating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // ── Modal création d'article ───────────────────────────────────────────────
  const [articleModal, setArticleModal] = useState({ open: false });

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    loadData(seuil);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // loadData accepte le seuil en paramètre pour pouvoir être appelée
  // immédiatement après une mise à jour du seuil (avant que le state soit
  // propagé par React).
  async function loadData(seuilCourant = seuil) {
    setLoading(true);
    setLoadError(null);
    try {
      const [arts, fours] = await Promise.all([
        getAllArticles(),
        getAllFournisseurs(),
      ]);
      setArticles(arts);
      setFournisseurs(fours);
      // Construire la liste automatique : articles sous le seuil
      const autoLignes = arts
        .filter((a) => a["quantitéStock"] < seuilCourant)
        .map((a) => ({
          article: a,
          qteACommander: Math.max(1, seuilCourant - a["quantitéStock"]),
        }));
      setLignes(autoLignes);
      setChecked(false);
      setApproId(null);
      setSuccessMsg(null);
      setError(null);
    } catch {
      setLoadError("Erreur lors du chargement des articles.");
    } finally {
      setLoading(false);
    }
  }

  // ── Modifier le seuil ─────────────────────────────────────────────────────
  // Applique le nouveau seuil, le persiste et recalcule la liste à partir
  // des articles déjà chargés (sans refaire un appel réseau).
  function handleApplySeuil() {
    const val = parseInt(seuilInput);
    if (!Number.isFinite(val) || val <= 0) return;
    const nouveauSeuil = val;
    setSeuil(nouveauSeuil);
    localStorage.setItem("appro_seuil", String(nouveauSeuil));
    // Recalculer la liste depuis les articles en mémoire
    const autoLignes = articles
      .filter((a) => a["quantitéStock"] < nouveauSeuil)
      .map((a) => ({
        article: a,
        qteACommander: Math.max(1, nouveauSeuil - a["quantitéStock"]),
      }));
    // Conserver les lignes ajoutées manuellement (non filtrées par seuil)
    setLignes((prev) => {
      const manuelles = prev.filter(
        (l) => !autoLignes.some((al) => al.article.id === l.article.id),
      );
      return [...autoLignes, ...manuelles];
    });
    setChecked(false);
    setApproId(null);
    setEditingSeuil(false);
    setSeuilInput("");
  }

  // ── Ajouter manuellement un article à la liste ─────────────────────────────
  function handleAddArticle() {
    if (!addArticleId) return;
    const article = articles.find((a) => a.id === parseInt(addArticleId));
    if (!article) return;
    if (lignes.some((l) => l.article.id === article.id)) {
      setError(`"${article.nom}" est déjà dans la liste.`);
      return;
    }
    setLignes((prev) => [...prev, { article, qteACommander: 1 }]);
    setAddArticleId("");
    setChecked(false);
    setApproId(null);
    setError(null);
  }

  // ── Modifier la quantité d'une ligne ──────────────────────────────────────
  function handleQtyChange(articleId, value) {
    const qty = Math.max(1, parseInt(value) || 1);
    setLignes((prev) =>
      prev.map((l) =>
        l.article.id === articleId ? { ...l, qteACommander: qty } : l,
      ),
    );
    // Toute modification invalide le check en cours
    setChecked(false);
    setApproId(null);
  }

  // ── Supprimer une ligne ────────────────────────────────────────────────────
  function handleRemove(articleId) {
    setLignes((prev) => prev.filter((l) => l.article.id !== articleId));
    setChecked(false);
    setApproId(null);
  }

  // ── Étape 1 : Checker l'appro ─────────────────────────────────────────────
  // Crée un ordre Appro(status=VERIFIE) en base → trace comptable immédiate.
  async function handleChecker() {
    setChecking(true);
    setError(null);
    try {
      const appro = await createAppro(
        lignes.map((l) => ({
          articleId: l.article.id,
          articleNom: l.article.nom,
          prixUnitaire: l.article.prix,
          qteCommandee: l.qteACommander,
        })),
      );
      setApproId(appro.id);
      setChecked(true);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Erreur lors du checker de l'appro.",
      );
    } finally {
      setChecking(false);
    }
  }

  // ── Étape 2 : Valider l'appro ─────────────────────────────────────────────
  // Passe l'ordre en VALIDE + incrémente le stock via le backend.
  // Le coutTotal est déduit du CA net dans le dashboard.
  async function handleValider() {
    if (!approId) return;
    setValidating(true);
    setError(null);
    try {
      await validerAppro(approId);
      const totalQte = lignes.reduce((s, l) => s + l.qteACommander, 0);
      const totalCout = lignes.reduce(
        (s, l) => s + l.article.prix * l.qteACommander,
        0,
      );
      setSuccessMsg(
        `Appro #${approId} validée — ${lignes.length} article(s), +${totalQte} unité(s) en stock, coût : ${totalCout.toLocaleString("fr-FR")} Ar déduit du CA.`,
      );
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Erreur lors de la validation de l'appro.",
      );
    } finally {
      setValidating(false);
    }
  }

  // ── Création d'un nouvel article depuis le modal ───────────────────────────
  async function handleCreateArticle(data) {
    const created = await createArticle(data);
    const updated = await getAllArticles();
    setArticles(updated);
    setLignes((prev) => {
      if (prev.some((l) => l.article.id === created.id)) return prev;
      return [...prev, { article: created, qteACommander: 1 }];
    });
    setArticleModal({ open: false });
    setChecked(false);
    setApproId(null);
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="alert alert-error">
          <AlertCircle className="size-5" />
          <span>{loadError}</span>
          <button className="btn btn-ghost btn-xs ml-auto" onClick={loadData}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Articles non encore dans la liste (pour le sélecteur d'ajout manuel)
  const articlesDisponibles = articles.filter(
    (a) => !lignes.some((l) => l.article.id === a.id),
  );
  const totalCout = lignes.reduce(
    (s, l) => s + l.article.prix * l.qteACommander,
    0,
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <ClipboardList className="size-7 text-primary" />
          <h1 className="text-2xl font-bold">Ampiditra entana</h1>

          {/* Seuil : badge cliquable ou champ de saisie inline */}
          {editingSeuil ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Seuil :</span>
              <input
                type="number"
                min={1}
                className="input input-bordered input-xs w-20 text-center"
                value={seuilInput}
                autoFocus
                onChange={(e) => setSeuilInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplySeuil();
                  if (e.key === "Escape") {
                    setEditingSeuil(false);
                    setSeuilInput("");
                  }
                }}
              />
              <span className="text-sm">unités</span>
              <button
                className="btn btn-warning btn-xs"
                onClick={handleApplySeuil}
                disabled={!seuilInput || parseInt(seuilInput) <= 0}
              >
                OK
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setEditingSeuil(false);
                  setSeuilInput("");
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="badge badge-warning cursor-pointer hover:badge-warning/80 transition-colors"
              title="Cliquer pour modifier le seuil"
              onClick={() => {
                setSeuilInput(String(seuil));
                setEditingSeuil(true);
              }}
            >
              Seuil : {seuil} unités ✎
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm gap-1"
            onClick={loadData}
            title="Recalculer depuis le stock actuel"
          >
            <RotateCcw className="size-4" />
            Actualiser
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={() => setArticleModal({ open: true })}
          >
            <PackagePlus className="size-4" />
            Nouvel article
          </button>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="alert alert-success shadow">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{successMsg}</span>
          <button
            className="btn btn-ghost btn-xs ml-auto"
            onClick={() => setSuccessMsg(null)}
          >
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-xs ml-auto"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Ajout manuel d'un article ────────────────────────────────────────── */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body py-4">
          <h2 className="card-title text-base">
            <Plus className="size-4" /> Ampiditra entana ho atao commande
          </h2>
          <div className="flex gap-2 items-end">
            <select
              className="select select-bordered flex-1"
              value={addArticleId}
              onChange={(e) => setAddArticleId(e.target.value)}
              disabled={checked}
            >
              <option value="">— Choisir un article —</option>
              {articlesDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} — stock actuel : {a["quantitéStock"]}
                </option>
              ))}
            </select>
            <button
              className="btn btn-neutral"
              onClick={handleAddArticle}
              disabled={!addArticleId || checked}
            >
              <Plus className="size-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* ── Liste d'appro ─────────────────────────────────────────────────── */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">
            <ClipboardList className="size-5" /> Liste d'appro
            {lignes.length > 0 && (
              <span className="badge badge-neutral ml-2">{lignes.length}</span>
            )}
            {checked && approId && (
              <span className="badge badge-warning ml-1">
                Appro #{approId} — VÉRIFIÉ
              </span>
            )}
          </h2>

          {lignes.length === 0 ? (
            <div className="text-center py-12 text-base-content/40">
              <ClipboardList className="size-12 mx-auto mb-3 opacity-30" />
              <p>Aucun article à réapprovisionner.</p>
              <p className="text-sm">
                Tous les articles sont au-dessus du seuil de {seuil} unités.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-box border border-base-200">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="text-center">Fournisseur</th>
                    <th className="text-center">Stock actuel</th>
                    <th className="text-center">Qté à commander</th>
                    <th className="text-right">Coût ligne</th>
                    <th className="text-center">Stock après</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(({ article, qteACommander }) => (
                    <tr
                      key={article.id}
                      className={checked ? "bg-success/5" : ""}
                    >
                      <td>
                        <div className="font-medium">{article.nom}</div>
                        <div className="text-xs text-base-content/50">
                          {article.bottleType}
                          {article.aConsigner && (
                            <span className="text-warning ml-1">
                              ★ consigné
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center text-sm">
                        {article.fournisseur?.nom ?? (
                          <span className="text-base-content/30">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge badge-sm tabular-nums ${
                            article["quantitéStock"] === 0
                              ? "badge-error"
                              : article["quantitéStock"] < seuil
                                ? "badge-warning"
                                : "badge-success"
                          }`}
                        >
                          {article["quantitéStock"]}
                        </span>
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min={1}
                          className="input input-bordered input-sm w-24 text-center tabular-nums"
                          value={qteACommander}
                          onChange={(e) =>
                            handleQtyChange(article.id, e.target.value)
                          }
                          disabled={checked}
                        />
                      </td>
                      <td className="text-right tabular-nums text-sm">
                        {(article.prix * qteACommander).toLocaleString("fr-FR")}{" "}
                        Ar
                      </td>
                      <td className="text-center">
                        <span className="badge badge-success badge-sm tabular-nums font-semibold">
                          {article["quantitéStock"] + qteACommander}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleRemove(article.id)}
                          disabled={checked}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totaux */}
                <tfoot>
                  <tr className="text-sm font-semibold">
                    <td colSpan={3} className="text-right text-base-content/60">
                      Total
                    </td>
                    <td className="text-center text-primary tabular-nums">
                      +{lignes.reduce((s, l) => s + l.qteACommander, 0)} unités
                    </td>
                    <td className="text-right text-error tabular-nums">
                      −{totalCout.toLocaleString("fr-FR")} Ar
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions principales ───────────────────────────────────────────── */}
      {lignes.length > 0 && (
        <div className="flex justify-end gap-3 flex-wrap">
          {/* Étape 1 : Checker (crée la trace VERIFIE en base, verrouille la liste) */}
          {!checked && (
            <button
              className="btn btn-warning btn-wide gap-2"
              onClick={handleChecker}
              disabled={checking}
            >
              {checking && (
                <span className="loading loading-spinner loading-sm" />
              )}
              <CheckCircle2 className="size-5" />
              Checker l'appro
            </button>
          )}

          {/* Étape 2 : Modifier ou Valider */}
          {checked && (
            <>
              <button
                className="btn btn-ghost gap-2"
                onClick={() => {
                  setChecked(false);
                  setApproId(null);
                }}
              >
                Modifier
              </button>
              <button
                className="btn btn-success btn-wide gap-2"
                onClick={handleValider}
                disabled={validating}
              >
                {validating && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Valider &amp; entrer en stock
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bannière de confirmation (après check) ────────────────────────── */}
      {checked && approId && lignes.length > 0 && (
        <div className="alert alert-warning">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">
              Appro #{approId} vérifiée — prête à valider
            </p>
            <p className="text-sm">
              {lignes.length} article(s) · +
              {lignes.reduce((s, l) => s + l.qteACommander, 0)} unités · coût
              estimé :{" "}
              <strong className="text-error">
                {totalCout.toLocaleString("fr-FR")} Ar
              </strong>{" "}
              (déduit du CA à la validation).
            </p>
          </div>
        </div>
      )}

      {/* ── Modal création article ────────────────────────────────────────── */}
      <ArticleModal
        open={articleModal.open}
        article={null}
        fournisseurs={fournisseurs}
        onClose={() => setArticleModal({ open: false })}
        onSave={handleCreateArticle}
      />
    </div>
  );
}
