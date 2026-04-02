import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Package,
  PackagePlus,
  Pencil,
  RotateCcw,
  Search,
  Warehouse,
  XCircle,
} from "lucide-react";
import { getAllArticles } from "../api/articleService";
import { getAllEmballages } from "../api/emballageService";
import {
  getMouvements,
  createCorrection,
  validerInventairePhysique,
} from "../api/mouvementService";

// ── Constantes / helpers ──────────────────────────────────────────────────────

const SEUIL_DEFAULT = 20;

function getSeuil() {
  const stored = parseInt(localStorage.getItem("appro_seuil"), 10);
  return Number.isFinite(stored) && stored > 0 ? stored : SEUIL_DEFAULT;
}

function getStatut(stock, seuil) {
  if (stock === 0) return "rupture";
  if (stock < seuil) return "bas";
  return "ok";
}

function labelEmballage(e) {
  const consigne = e.prixConsigne ?? 0;
  if (e.type === "CAGEOT")
    return `Cageot ${e.capacite ?? 0} bouteilles (consigne ${consigne.toLocaleString("fr-FR")}) Ar`;
  return `Bouteille vide - Consigne ${consigne.toLocaleString("fr-FR")} Ar`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatutBadge({ stock, seuil }) {
  const s = getStatut(stock, seuil);
  if (s === "rupture")
    return (
      <span className="badge badge-error badge-sm gap-1">
        <XCircle className="size-3" /> Rupture
      </span>
    );
  if (s === "bas")
    return (
      <span className="badge badge-warning badge-sm gap-1">
        <AlertTriangle className="size-3" /> Stock bas
      </span>
    );
  return (
    <span className="badge badge-success badge-sm gap-1">
      <CheckCircle2 className="size-3" /> OK
    </span>
  );
}

function MouvTypeBadge({ type }) {
  if (type === "VENTE")
    return <span className="badge badge-error badge-xs">Vente</span>;
  if (type === "APPRO")
    return <span className="badge badge-success badge-xs">Appro</span>;
  return <span className="badge badge-info badge-xs">Correction</span>;
}

function EcartCell({ ecart }) {
  if (ecart === 0) return <span className="text-base-content/40">—</span>;
  return (
    <span
      className={`tabular-nums font-bold ${ecart > 0 ? "text-success" : "text-error"}`}
    >
      {ecart > 0 ? "+" : ""}
      {ecart}
    </span>
  );
}

// ── ArticleRow (expandable avec historique mouvements) ────────────────────────

function ArticleRow({ article, seuil, onCorrection }) {
  const [open, setOpen] = useState(false);
  const [mouvements, setMouvements] = useState(null);
  const [loadingMouv, setLoadingMouv] = useState(false);
  const [mouvError, setMouvError] = useState(null);

  async function handleExpand() {
    const next = !open;
    setOpen(next);
    if (next && mouvements === null) {
      setLoadingMouv(true);
      setMouvError(null);
      try {
        const data = await getMouvements(article.id);
        setMouvements(data);
      } catch {
        setMouvError("Impossible de charger l'historique.");
      } finally {
        setLoadingMouv(false);
      }
    }
  }

  const statut = getStatut(article["quantitéStock"], seuil);

  return (
    <>
      <tr
        className="hover cursor-pointer select-none"
        onClick={handleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleExpand();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={open}
      >
        <td className="w-6">
          {open ? (
            <ChevronDown className="size-4 text-base-content/50" />
          ) : (
            <ChevronRight className="size-4 text-base-content/50" />
          )}
        </td>
        <td className="font-medium">{article.nom}</td>
        <td className="text-base-content/60 text-sm">
          {article.fournisseur?.nom ?? "—"}
        </td>
        <td>
          <span
            className={`badge badge-xs ${article.bottleType === "VERRE" ? "badge-info" : "badge-ghost"}`}
          >
            {article.bottleType}
          </span>
        </td>
        <td className="text-right tabular-nums">
          {article.prix.toLocaleString("fr-FR")} Ar
        </td>
        <td className="text-right tabular-nums font-semibold">
          <span
            className={
              statut === "rupture"
                ? "text-error"
                : statut === "bas"
                  ? "text-warning"
                  : "text-success"
            }
          >
            {article["quantitéStock"]}
          </span>
        </td>
        <td>
          <StatutBadge stock={article["quantitéStock"]} seuil={seuil} />
        </td>
        <td>
          <button
            className="btn btn-ghost btn-xs"
            title="Correction manuelle"
            onClick={(e) => {
              e.stopPropagation();
              onCorrection(article);
            }}
          >
            <Pencil className="size-3.5" />
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} className="bg-base-200/50 p-0">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2 flex items-center gap-1">
                <RotateCcw className="size-3" /> Historique des mouvements
              </p>
              {loadingMouv && (
                <div className="flex items-center gap-2 text-sm text-base-content/50">
                  <span className="loading loading-spinner loading-xs" />{" "}
                  Chargement…
                </div>
              )}
              {mouvError && <p className="text-error text-sm">{mouvError}</p>}
              {mouvements !== null &&
                !loadingMouv &&
                (mouvements.length === 0 ? (
                  <p className="text-base-content/40 text-sm italic">
                    Aucun mouvement enregistré.
                  </p>
                ) : (
                  <table className="table table-xs w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th className="text-right">Quantité</th>
                        <th>Motif / Réf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mouvements.map((m) => (
                        <tr key={m.id}>
                          <td className="tabular-nums text-xs text-base-content/60">
                            {fmtDate(m.date)}
                          </td>
                          <td>
                            <MouvTypeBadge type={m.type} />
                          </td>
                          <td
                            className={`text-right tabular-nums font-semibold ${m.quantite > 0 ? "text-success" : "text-error"}`}
                          >
                            {m.quantite > 0 ? "+" : ""}
                            {m.quantite}
                          </td>
                          <td className="text-xs text-base-content/60">
                            {m.motif
                              ? m.motif
                              : m.refId
                                ? `Réf. #${m.refId}`
                                : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── EmballageRow ──────────────────────────────────────────────────────────────

function EmballageRow({ emballage }) {
  return (
    <tr>
      <td>
        <span
          className={`badge badge-sm ${emballage.type === "CAGEOT" ? "badge-warning" : "badge-info"}`}
        >
          {emballage.type === "CAGEOT" ? "Cageot" : "Bouteille"}
        </span>
      </td>
      <td className="font-medium">{labelEmballage(emballage)}</td>
      <td className="text-right tabular-nums">
        {emballage.capacite > 0 ? `${emballage.capacite} btles` : "—"}
      </td>
      <td className="text-right tabular-nums">
        {emballage.prixConsigne.toLocaleString("fr-FR")} Ar
      </td>
      <td className="text-right tabular-nums font-semibold">
        <span className={emballage.quantiteStock === 0 ? "text-error" : ""}>
          {emballage.quantiteStock}
        </span>
      </td>
      <td>
        {emballage.quantiteStock === 0 ? (
          <span className="badge badge-error badge-sm gap-1">
            <XCircle className="size-3" /> Épuisé
          </span>
        ) : (
          <span className="badge badge-ghost badge-sm">
            {emballage.quantiteStock} unité(s)
          </span>
        )}
      </td>
    </tr>
  );
}

// ── CorrectionModal ───────────────────────────────────────────────────────────

function CorrectionModal({ article, onClose, onSaved }) {
  const [quantite, setQuantite] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const qty = parseInt(quantite, 10);
    if (isNaN(qty) || qty === 0) {
      setError("La quantité doit être un entier non nul.");
      return;
    }
    if (!motif.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCorrection({
        articleId: article.id,
        quantite: qty,
        motif: motif.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || "Erreur lors de la correction.");
      setSaving(false);
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-1">Correction de stock</h3>
        <p className="text-sm text-base-content/60 mb-4">
          Article :{" "}
          <span className="font-semibold text-base-content">{article.nom}</span>{" "}
          — stock actuel :{" "}
          <span className="font-semibold">{article["quantitéStock"]}</span>
        </p>
        {error && (
          <div className="alert alert-error mb-3 py-2 text-sm">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="form-control">
            <div className="label">
              <span className="label-text">
                Quantité{" "}
                <span className="text-base-content/50">
                  (+ entrée, − sortie)
                </span>
              </span>
            </div>
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder="ex. 5 ou -2"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              autoFocus
            />
          </label>
          <label className="form-control">
            <div className="label">
              <span className="label-text">Motif</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="ex. Inventaire physique, Casse…"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              maxLength={200}
            />
          </label>
          <div className="modal-action mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const navigate = useNavigate();
  const seuil = getSeuil();

  // ── Données ───────────────────────────────────────────────────────────────
  const [articles, setArticles] = useState([]);
  const [emballages, setEmballages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Vue normale : onglets + filtres ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState("articles");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("TOUS");
  const [filterFournisseur, setFilterFournisseur] = useState("TOUS");
  const [filterStatut, setFilterStatut] = useState("TOUS");
  const [correctionArticle, setCorrectionArticle] = useState(null);

  // ── Inventaire physique : étapes ──────────────────────────────────────────
  // "idle" → "saisie" → "rapport" → "done"
  const [invStep, setInvStep] = useState("idle");
  const [saisieCounts, setSaisieCounts] = useState({}); // { "a-{id}": "15", "e-{id}": "8" }
  const [ecartLines, setEcartLines] = useState([]); // lines avec écart ≠ 0
  const [explications, setExplications] = useState({}); // { key: "texte" }
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState(null);
  const [doneRapport, setDoneRapport] = useState(null);

  // ── Chargement des données ────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [arts, embs] = await Promise.all([
        getAllArticles(),
        getAllEmballages(),
      ]);
      setArticles(arts);
      setEmballages(embs);
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ── Données dérivées ──────────────────────────────────────────────────────
  const fournisseurs = useMemo(() => {
    const map = new Map();
    for (const a of articles) {
      if (a.fournisseur) map.set(a.fournisseur.id, a.fournisseur.nom);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [articles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (q && !a.nom.toLowerCase().includes(q)) return false;
      if (filterType !== "TOUS" && a.bottleType !== filterType) return false;
      if (
        filterFournisseur !== "TOUS" &&
        String(a.fournisseurId) !== filterFournisseur
      )
        return false;
      if (filterStatut !== "TOUS") {
        if (getStatut(a["quantitéStock"], seuil) !== filterStatut) return false;
      }
      return true;
    });
  }, [articles, search, filterType, filterFournisseur, filterStatut, seuil]);

  const counts = useMemo(() => {
    let ok = 0,
      bas = 0,
      rupture = 0;
    for (const a of articles) {
      const s = getStatut(a["quantitéStock"], seuil);
      if (s === "ok") ok++;
      else if (s === "bas") bas++;
      else rupture++;
    }
    return { ok, bas, rupture, total: articles.length };
  }, [articles, seuil]);

  const alertCount = counts.bas + counts.rupture;

  // ── Handlers correction ───────────────────────────────────────────────────
  function handleCorrectionSaved() {
    setCorrectionArticle(null);
    load();
  }

  // ── Handlers inventaire physique ──────────────────────────────────────────
  function enterSaisie() {
    const counts = {};
    for (const a of articles) counts[`a-${a.id}`] = String(a["quantitéStock"]);
    for (const e of emballages) counts[`e-${e.id}`] = String(e.quantiteStock);
    setSaisieCounts(counts);
    setEcartLines([]);
    setExplications({});
    setValidateError(null);
    setDoneRapport(null);
    setInvStep("saisie");
  }

  function computeEcarts() {
    const lines = [];
    for (const a of articles) {
      const reel = parseInt(saisieCounts[`a-${a.id}`], 10);
      const theorique = a["quantitéStock"];
      const reelFinal = isNaN(reel) ? theorique : reel;
      const ecart = reelFinal - theorique;
      if (ecart !== 0) {
        lines.push({
          key: `a-${a.id}`,
          type: "article",
          id: a.id,
          nom: a.nom,
          theorique,
          reel: reelFinal,
          ecart,
        });
      }
    }
    for (const e of emballages) {
      const reel = parseInt(saisieCounts[`e-${e.id}`], 10);
      const theorique = e.quantiteStock;
      const reelFinal = isNaN(reel) ? theorique : reel;
      const ecart = reelFinal - theorique;
      if (ecart !== 0) {
        lines.push({
          key: `e-${e.id}`,
          type: "emballage",
          id: e.id,
          nom: labelEmballage(e),
          theorique,
          reel: reelFinal,
          ecart,
        });
      }
    }
    setEcartLines(lines);
    setExplications({});
    setValidateError(null);
    setInvStep("rapport");
  }

  async function handleValiderInventaire() {
    // Vérifier que chaque écart article a une explication
    for (const l of ecartLines) {
      if (l.type === "article" && !explications[l.key]?.trim()) {
        setValidateError(
          "Veuillez renseigner une explication pour chaque écart article.",
        );
        return;
      }
    }
    setValidating(true);
    setValidateError(null);
    try {
      const articlesPayload = articles.map((a) => {
        const reel = parseInt(saisieCounts[`a-${a.id}`], 10);
        const ecartLine = ecartLines.find(
          (l) => l.type === "article" && l.id === a.id,
        );
        return {
          articleId: a.id,
          stockReel: isNaN(reel) ? a["quantitéStock"] : reel,
          explication: ecartLine ? explications[`a-${a.id}`] || "" : null,
        };
      });
      const emballagesPayload = emballages.map((e) => {
        const reel = parseInt(saisieCounts[`e-${e.id}`], 10);
        return {
          emballageId: e.id,
          stockReel: isNaN(reel) ? e.quantiteStock : reel,
        };
      });
      const rapport = await validerInventairePhysique({
        articles: articlesPayload,
        emballages: emballagesPayload,
      });
      setDoneRapport(rapport);
      setInvStep("done");
      setValidating(false); // juste pour réactiver le bouton au cas où l'utilisateur veut revoir le rapport
      await load();
    } catch (err) {
      setValidateError(
        err?.response?.data?.error ||
          "Erreur lors de la validation de l'inventaire.",
      );
      setValidating(false);
    }
  }

  // ── Loading global ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // ── Étape saisie ──────────────────────────────────────────────────────────
  if (invStep === "saisie") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setInvStep("idle")}
          >
            ← Retour
          </button>
          <ClipboardList className="size-6 text-primary" />
          <h1 className="text-xl font-bold">Saisie de l'inventaire physique</h1>
        </div>

        <div className="alert alert-info text-sm py-2">
          Comptez le stock réel de chaque article et emballage. Les valeurs sont
          pré-remplies avec le stock théorique — modifiez uniquement celles qui
          diffèrent.
        </div>

        {/* Articles */}
        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Package className="size-4" /> Articles ({articles.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Article</th>
                  <th>Fournisseur</th>
                  <th className="text-right">Théorique</th>
                  <th className="text-right w-44">Stock réel</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const theorique = a["quantitéStock"];
                  const val = saisieCounts[`a-${a.id}`] ?? String(theorique);
                  const reel = parseInt(val, 10);
                  const ecart = isNaN(reel) ? 0 : reel - theorique;
                  return (
                    <tr
                      key={a.id}
                      className={ecart !== 0 ? "bg-warning/10" : ""}
                    >
                      <td className="font-medium">{a.nom}</td>
                      <td className="text-base-content/60 text-sm">
                        {a.fournisseur?.nom ?? "—"}
                      </td>
                      <td className="text-right tabular-nums text-base-content/60">
                        {theorique}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ecart !== 0 && (
                            <span
                              className={`text-xs font-bold ${ecart > 0 ? "text-success" : "text-error"}`}
                            >
                              {ecart > 0 ? "+" : ""}
                              {ecart}
                            </span>
                          )}
                          <input
                            type="number"
                            min={0}
                            className={`input input-bordered input-sm w-24 text-right ${ecart !== 0 ? "input-warning" : ""}`}
                            value={val}
                            onChange={(ev) =>
                              setSaisieCounts((prev) => ({
                                ...prev,
                                [`a-${a.id}`]: ev.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emballages */}
        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Package className="size-4" /> Emballages ({emballages.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Emballage</th>
                  <th className="text-right">Théorique</th>
                  <th className="text-right w-44">Stock réel</th>
                </tr>
              </thead>
              <tbody>
                {emballages.map((e) => {
                  const theorique = e.quantiteStock;
                  const val = saisieCounts[`e-${e.id}`] ?? String(theorique);
                  const reel = parseInt(val, 10);
                  const ecart = isNaN(reel) ? 0 : reel - theorique;
                  return (
                    <tr
                      key={e.id}
                      className={ecart !== 0 ? "bg-warning/10" : ""}
                    >
                      <td className="font-medium">{labelEmballage(e)}</td>
                      <td className="text-right tabular-nums text-base-content/60">
                        {theorique}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ecart !== 0 && (
                            <span
                              className={`text-xs font-bold ${ecart > 0 ? "text-success" : "text-error"}`}
                            >
                              {ecart > 0 ? "+" : ""}
                              {ecart}
                            </span>
                          )}
                          <input
                            type="number"
                            min={0}
                            className={`input input-bordered input-sm w-24 text-right ${ecart !== 0 ? "input-warning" : ""}`}
                            value={val}
                            onChange={(ev) =>
                              setSaisieCounts((prev) => ({
                                ...prev,
                                [`e-${e.id}`]: ev.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn btn-ghost" onClick={() => setInvStep("idle")}>
            Annuler
          </button>
          <button className="btn btn-primary gap-2" onClick={computeEcarts}>
            Calculer les écarts <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Étape rapport ─────────────────────────────────────────────────────────
  if (invStep === "rapport") {
    const ecartArticles = ecartLines.filter((l) => l.type === "article");
    const ecartEmballages = ecartLines.filter((l) => l.type === "emballage");

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setInvStep("saisie")}
          >
            ← Modifier la saisie
          </button>
          <ClipboardList className="size-6 text-warning" />
          <h1 className="text-xl font-bold">Rapport des écarts</h1>
        </div>

        {ecartLines.length === 0 ? (
          <>
            <div className="alert alert-success">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>
                Aucun écart détecté — le stock théorique correspond au stock
                physique.
              </span>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setInvStep("idle")}
              >
                Fermer
              </button>
              <button
                className="btn btn-success gap-2"
                disabled={validating}
                onClick={async () => {
                  setValidating(true);
                  try {
                    const rapport = await validerInventairePhysique({
                      articles: articles.map((a) => ({
                        articleId: a.id,
                        stockReel: a["quantitéStock"],
                        explication: null,
                      })),
                      emballages: emballages.map((e) => ({
                        emballageId: e.id,
                        stockReel: e.quantiteStock,
                      })),
                    });
                    setDoneRapport(rapport);
                    setInvStep("done");
                    await load(); // pour rafraîchir les stocks affichés dans le rapport
                  } catch {
                    setValidateError("Erreur lors de la confirmation.");
                  } finally {
                    setValidating(false);
                  }
                }}
              >
                {validating && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Confirmer l'inventaire
              </button>
            </div>
            {validateError && (
              <div className="alert alert-error text-sm">
                <AlertCircle className="size-4 shrink-0" /> {validateError}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="alert alert-warning text-sm py-2">
              <AlertTriangle className="size-4 shrink-0" />
              {ecartLines.length} écart(s) détecté(s). Renseignez une
              explication pour chaque écart article avant de valider.
            </div>

            {validateError && (
              <div className="alert alert-error text-sm">
                <AlertCircle className="size-4 shrink-0" /> {validateError}
              </div>
            )}

            {/* Écarts articles */}
            {ecartArticles.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="size-4" /> Articles (
                  {ecartArticles.length} écart(s))
                </h2>
                <div className="overflow-x-auto rounded-lg border border-base-300">
                  <table className="table table-sm w-full">
                    <thead className="bg-base-200">
                      <tr>
                        <th>Article</th>
                        <th className="text-right">Théorique</th>
                        <th className="text-right">Réel</th>
                        <th className="text-right">Écart</th>
                        <th>
                          Explication{" "}
                          <span className="text-error text-xs">
                            * obligatoire
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ecartArticles.map((l) => (
                        <tr
                          key={l.key}
                          className={
                            l.ecart < 0 ? "bg-error/10" : "bg-success/10"
                          }
                        >
                          <td className="font-medium">{l.nom}</td>
                          <td className="text-right tabular-nums text-base-content/60">
                            {l.theorique}
                          </td>
                          <td className="text-right tabular-nums font-semibold">
                            {l.reel}
                          </td>
                          <td className="text-right">
                            <EcartCell ecart={l.ecart} />
                          </td>
                          <td>
                            <input
                              type="text"
                              className={`input input-bordered input-sm w-full ${!explications[l.key]?.trim() ? "input-error" : "input-success"}`}
                              placeholder="Ex. Casse, vol, erreur de comptage…"
                              value={explications[l.key] || ""}
                              onChange={(e) =>
                                setExplications((prev) => ({
                                  ...prev,
                                  [l.key]: e.target.value,
                                }))
                              }
                              maxLength={200}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Écarts emballages */}
            {ecartEmballages.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="size-4" /> Emballages (
                  {ecartEmballages.length} écart(s))
                </h2>
                <div className="overflow-x-auto rounded-lg border border-base-300">
                  <table className="table table-sm w-full">
                    <thead className="bg-base-200">
                      <tr>
                        <th>Emballage</th>
                        <th className="text-right">Théorique</th>
                        <th className="text-right">Réel</th>
                        <th className="text-right">Écart</th>
                        <th className="text-xs text-base-content/40">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ecartEmballages.map((l) => (
                        <tr
                          key={l.key}
                          className={
                            l.ecart < 0 ? "bg-error/10" : "bg-success/10"
                          }
                        >
                          <td className="font-medium">{l.nom}</td>
                          <td className="text-right tabular-nums text-base-content/60">
                            {l.theorique}
                          </td>
                          <td className="text-right tabular-nums font-semibold">
                            {l.reel}
                          </td>
                          <td className="text-right">
                            <EcartCell ecart={l.ecart} />
                          </td>
                          <td className="text-xs text-base-content/40 italic">
                            Stock mis à jour (correction enregistrée)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                className="btn btn-ghost"
                onClick={() => setInvStep("idle")}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary gap-2"
                onClick={handleValiderInventaire}
                disabled={validating}
              >
                {validating && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Valider l'inventaire
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Étape done ────────────────────────────────────────────────────────────
  if (invStep === "done") {
    const ecartArticles = (doneRapport?.articles ?? []).filter(
      (r) => r.ecart !== 0,
    );
    const ecartEmballages = (doneRapport?.emballages ?? []).filter(
      (r) => r.ecart !== 0,
    );
    const totalCorrections = ecartArticles.length + ecartEmballages.length;

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Warehouse className="size-6 text-primary" />
          <h1 className="text-xl font-bold">Inventaire physique</h1>
        </div>

        <div className="alert alert-success">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Inventaire validé avec succès !</p>
            <p className="text-sm opacity-80">
              {totalCorrections === 0
                ? "Aucune correction appliquée — stock conforme."
                : `${totalCorrections} correction(s) appliquée(s) — stocks mis à jour.`}
            </p>
          </div>
        </div>

        {ecartArticles.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Corrections articles</h2>
            <div className="overflow-x-auto rounded-lg border border-base-300">
              <table className="table table-sm w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th>Article</th>
                    <th className="text-right">Théorique</th>
                    <th className="text-right">Réel</th>
                    <th className="text-right">Écart</th>
                    <th>Explication</th>
                  </tr>
                </thead>
                <tbody>
                  {ecartArticles.map((r) => (
                    <tr key={r.articleId}>
                      <td className="font-medium">{r.nom}</td>
                      <td className="text-right tabular-nums text-base-content/60">
                        {r.theorique}
                      </td>
                      <td className="text-right tabular-nums">{r.reel}</td>
                      <td className="text-right">
                        <EcartCell ecart={r.ecart} />
                      </td>
                      <td className="text-sm text-base-content/60">
                        {r.explication ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ecartEmballages.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Corrections emballages</h2>
            <div className="overflow-x-auto rounded-lg border border-base-300">
              <table className="table table-sm w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th>Emballage</th>
                    <th className="text-right">Théorique</th>
                    <th className="text-right">Réel</th>
                    <th className="text-right">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {ecartEmballages.map((r) => (
                    <tr key={r.emballageId}>
                      <td className="font-medium">
                        {r.type === "CAGEOT"
                          ? `Cageot ${r.capacite} btles`
                          : `Bouteille vide (${r.prixConsigne.toLocaleString("fr-FR")} Ar)`}
                      </td>
                      <td className="text-right tabular-nums text-base-content/60">
                        {r.theorique}
                      </td>
                      <td className="text-right tabular-nums">{r.reel}</td>
                      <td className="text-right">
                        <EcartCell ecart={r.ecart} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            onClick={() => setInvStep("idle")}
          >
            Retour à l'inventaire
          </button>
        </div>
      </div>
    );
  }

  // ── Vue normale ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Warehouse className="size-7 text-primary" />
        <h1 className="text-2xl font-bold">Inventaire</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="btn btn-outline btn-sm gap-2"
            onClick={enterSaisie}
          >
            <ClipboardList className="size-4" /> Inventaire physique
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs ml-auto" onClick={load}>
            Réessayer
          </button>
        </div>
      )}

      {/* KPI articles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <p className="text-xs text-base-content/50 uppercase tracking-wide">
              Total articles
            </p>
            <p className="text-3xl font-bold text-primary">{counts.total}</p>
          </div>
        </div>
        <div
          className="card bg-success/10 shadow-sm cursor-pointer"
          onClick={() => {
            setActiveTab("articles");
            setFilterStatut(filterStatut === "ok" ? "TOUS" : "ok");
          }}
        >
          <div className="card-body p-4">
            <p className="text-xs text-success/70 uppercase tracking-wide">
              Stock OK
            </p>
            <p className="text-3xl font-bold text-success">{counts.ok}</p>
          </div>
        </div>
        <div
          className="card bg-warning/10 shadow-sm cursor-pointer"
          onClick={() => {
            setActiveTab("articles");
            setFilterStatut(filterStatut === "bas" ? "TOUS" : "bas");
          }}
        >
          <div className="card-body p-4">
            <p className="text-xs text-warning/70 uppercase tracking-wide">
              Stock bas
            </p>
            <p className="text-3xl font-bold text-warning">{counts.bas}</p>
          </div>
        </div>
        <div
          className="card bg-error/10 shadow-sm cursor-pointer"
          onClick={() => {
            setActiveTab("articles");
            setFilterStatut(filterStatut === "rupture" ? "TOUS" : "rupture");
          }}
        >
          <div className="card-body p-4">
            <p className="text-xs text-error/70 uppercase tracking-wide">
              Rupture
            </p>
            <p className="text-3xl font-bold text-error">{counts.rupture}</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={`tab gap-2 ${activeTab === "articles" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("articles")}
        >
          <Package className="size-4" /> Articles
          <span className="badge badge-sm">{articles.length}</span>
        </button>
        <button
          className={`tab gap-2 ${activeTab === "emballages" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("emballages")}
        >
          <Package className="size-4" /> Emballages
          <span className="badge badge-sm">{emballages.length}</span>
        </button>
      </div>

      {/* ── Onglet Articles ───────────────────────────────────────────────── */}
      {activeTab === "articles" && (
        <>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="input input-bordered flex items-center gap-2 flex-1 min-w-52">
              <Search className="size-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher un article…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="grow"
              />
            </label>
            <select
              className="select select-bordered"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="TOUS">Tous types</option>
              <option value="VERRE">Verre</option>
              <option value="PLASTIQUE">Plastique</option>
            </select>
            <select
              className="select select-bordered"
              value={filterFournisseur}
              onChange={(e) => setFilterFournisseur(e.target.value)}
            >
              <option value="TOUS">Tous fournisseurs</option>
              {fournisseurs.map(([id, nom]) => (
                <option key={id} value={String(id)}>
                  {nom}
                </option>
              ))}
            </select>
            <select
              className="select select-bordered"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
            >
              <option value="TOUS">Tous statuts</option>
              <option value="ok">OK</option>
              <option value="bas">Stock bas</option>
              <option value="rupture">Rupture</option>
            </select>
            {alertCount > 0 && (
              <button
                className="btn btn-warning gap-2"
                onClick={() => navigate("/appro")}
              >
                <PackagePlus className="size-4" /> Créer appro
                <span className="badge badge-error badge-sm">{alertCount}</span>
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <ClipboardList className="size-10 mx-auto mb-2 opacity-30" />
              <p>Aucun article ne correspond aux filtres.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-base-300">
              <table className="table table-sm w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th className="w-6" />
                    <th>Article</th>
                    <th>Fournisseur</th>
                    <th>Type</th>
                    <th className="text-right">Prix</th>
                    <th className="text-right">Stock</th>
                    <th>Statut</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <ArticleRow
                      key={`${a.id}-${a["quantitéStock"]}`}
                      article={a}
                      seuil={seuil}
                      onCorrection={setCorrectionArticle}
                    />
                  ))}
                </tbody>
                <tfoot className="bg-base-200">
                  <tr>
                    <td
                      colSpan={5}
                      className="text-right text-xs text-base-content/50"
                    >
                      Total unités en stock (filtrés)
                    </td>
                    <td className="text-right tabular-nums font-bold">
                      {filtered
                        .reduce((s, a) => s + a["quantitéStock"], 0)
                        .toLocaleString("fr-FR")}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Onglet Emballages ─────────────────────────────────────────────── */}
      {activeTab === "emballages" && (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm w-full">
            <thead className="bg-base-200">
              <tr>
                <th>Type</th>
                <th>Désignation</th>
                <th className="text-right">Capacité</th>
                <th className="text-right">Consigne</th>
                <th className="text-right">Stock</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {emballages.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-base-content/40 italic"
                  >
                    Aucun emballage enregistré.
                  </td>
                </tr>
              ) : (
                emballages.map((e) => <EmballageRow key={e.id} emballage={e} />)
              )}
            </tbody>
            <tfoot className="bg-base-200">
              <tr>
                <td
                  colSpan={4}
                  className="text-right text-xs text-base-content/50"
                >
                  Total unités emballages
                </td>
                <td className="text-right tabular-nums font-bold">
                  {emballages
                    .reduce((s, e) => s + e.quantiteStock, 0)
                    .toLocaleString("fr-FR")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal correction ponctuelle */}
      {correctionArticle && (
        <CorrectionModal
          article={correctionArticle}
          onClose={() => setCorrectionArticle(null)}
          onSaved={handleCorrectionSaved}
        />
      )}
    </div>
  );
}
