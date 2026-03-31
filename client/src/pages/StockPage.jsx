import { useEffect, useState } from "react";
import { Archive, Package, Pencil, Plus, Trash2, Truck } from "lucide-react";

import {
  createArticle,
  createFournisseur,
  deleteArticle,
  deleteFournisseur,
  getAllArticles,
  getAllFournisseurs,
  updateArticle,
  updateFournisseur,
} from "../api/articleService";
import {
  createEmballage,
  deleteEmballage,
  getAllEmballages,
  updateEmballage,
} from "../api/emballageService";

import ArticleModal from "../components/ArticleModal";
import ConfirmModal from "../components/ConfirmModal";
import EmballageModal from "../components/EmballageModal";
import FournisseurModal from "../components/FournisseurModal";
import StatsCards from "../components/StatsCards";
import StockBadge from "../components/StockBadge";

// ─── Helpers emballage ────────────────────────────────────────────────────────

const CAGEOT_CAPACITES = [
  { capacite: 24, bouteillePrix: 300 },
  { capacite: 20, bouteillePrix: 500 },
  { capacite: 12, bouteillePrix: 700 },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockPage() {
  const user = getCurrentUser();
  const isAdmin = user.role === "ADMIN";

  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [emballages, setEmballages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [tab, setTab] = useState("articles");

  const [articleModal, setArticleModal] = useState({
    open: false,
    article: null,
  });
  const [deleteArticleModal, setDeleteArticleModal] = useState({
    open: false,
    article: null,
    deleting: false,
    error: null,
  });
  const [fournisseurModal, setFournisseurModal] = useState({
    open: false,
    fournisseur: null,
  });
  const [deleteFournisseurModal, setDeleteFournisseurModal] = useState({
    open: false,
    fournisseur: null,
    deleting: false,
    error: null,
  });
  const [emballageModal, setEmballageModal] = useState({
    open: false,
    emballage: null,
  });
  const [deleteEmballageModal, setDeleteEmballageModal] = useState({
    open: false,
    emballage: null,
    deleting: false,
    error: null,
  });

  async function loadData() {
    const [artsResult, foursResult, emballResult] = await Promise.allSettled([
      getAllArticles(),
      getAllFournisseurs(),
      getAllEmballages(),
    ]);
    if (artsResult.status === "fulfilled") {
      setArticles(artsResult.value);
    } else {
      console.error("Erreur chargement articles:", artsResult.reason);
      setLoadError("Impossible de charger les articles.");
    }
    if (foursResult.status === "fulfilled") {
      setFournisseurs(foursResult.value);
    } else {
      console.error("Erreur chargement fournisseurs:", foursResult.reason);
      setLoadError((prev) => prev ?? "Impossible de charger les fournisseurs.");
    }
    if (emballResult.status === "fulfilled") {
      setEmballages(emballResult.value);
    } else {
      console.error("Erreur chargement emballages:", emballResult.reason);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const [artsResult, foursResult, emballResult] = await Promise.allSettled([
        getAllArticles(),
        getAllFournisseurs(),
        getAllEmballages(),
      ]);
      if (!active) return;
      if (artsResult.status === "fulfilled") {
        setArticles(artsResult.value);
      } else {
        console.error("Erreur chargement articles:", artsResult.reason);
        setLoadError("Impossible de charger les articles.");
      }
      if (emballResult.status === "fulfilled") {
        setEmballages(emballResult.value);
      } else {
        console.error("Erreur chargement emballages:", emballResult.reason);
      }
      if (foursResult.status === "fulfilled") {
        setFournisseurs(foursResult.value);
      } else {
        console.error("Erreur chargement fournisseurs:", foursResult.reason);
        setLoadError(
          (prev) => prev ?? "Impossible de charger les fournisseurs.",
        );
      }
      setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  // ── Article CRUD ──
  async function handleSaveArticle(data) {
    if (articleModal.article) {
      await updateArticle(articleModal.article.id, data);
    } else {
      await createArticle(data);
    }
    setArticleModal({ open: false, article: null });
    loadData();
  }

  async function handleDeleteArticle() {
    setDeleteArticleModal((prev) => ({ ...prev, deleting: true, error: null }));
    try {
      await deleteArticle(deleteArticleModal.article.id);
      setDeleteArticleModal({
        open: false,
        article: null,
        deleting: false,
        error: null,
      });
      loadData();
    } catch (err) {
      setDeleteArticleModal((prev) => ({
        ...prev,
        deleting: false,
        error: err?.response?.data?.error || "Erreur lors de la suppression.",
      }));
    }
  }

  // ── Emballage CRUD ──
  async function handleSaveEmballage(data) {
    if (emballageModal.emballage) {
      await updateEmballage(emballageModal.emballage.id, data);
    } else {
      await createEmballage(data);
    }
    setEmballageModal({ open: false, emballage: null });
    loadData();
  }

  async function handleDeleteEmballage() {
    setDeleteEmballageModal((prev) => ({
      ...prev,
      deleting: true,
      error: null,
    }));
    try {
      await deleteEmballage(deleteEmballageModal.emballage.id);
      setDeleteEmballageModal({
        open: false,
        emballage: null,
        deleting: false,
        error: null,
      });
      loadData();
    } catch (err) {
      setDeleteEmballageModal((prev) => ({
        ...prev,
        deleting: false,
        error: err?.response?.data?.error || "Erreur lors de la suppression.",
      }));
    }
  }

  // ── Fournisseur CRUD ──
  async function handleSaveFournisseur(data) {
    if (fournisseurModal.fournisseur) {
      await updateFournisseur(fournisseurModal.fournisseur.id, data);
    } else {
      await createFournisseur(data);
    }
    setFournisseurModal({ open: false, fournisseur: null });
    loadData();
  }

  async function handleDeleteFournisseur() {
    setDeleteFournisseurModal((prev) => ({
      ...prev,
      deleting: true,
      error: null,
    }));
    try {
      await deleteFournisseur(deleteFournisseurModal.fournisseur.id);
      setDeleteFournisseurModal({
        open: false,
        fournisseur: null,
        deleting: false,
        error: null,
      });
      loadData();
    } catch (err) {
      setDeleteFournisseurModal((prev) => ({
        ...prev,
        deleting: false,
        error: err?.response?.data?.error || "Erreur lors de la suppression.",
      }));
    }
  }

  const filtered = articles.filter((a) => {
    const matchSearch = a.nom.toLowerCase().includes(search.toLowerCase());
    const matchType =
      filterType === "ALL" ||
      (filterType === "CONSIGNE" && a.aConsigner) ||
      (filterType === "RUPTURE" && a["quantitéStock"] === 0) ||
      (filterType === "BAS" &&
        a["quantitéStock"] > 0 &&
        a["quantitéStock"] <= 5);
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion du stock</h1>
          <p className="text-base-content/60 text-sm">
            {articles.length} référence{articles.length !== 1 ? "s" : ""} —{" "}
            {fournisseurs.length} fournisseur
            {fournisseurs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary gap-2"
            onClick={() => setArticleModal({ open: true, article: null })}
          >
            <Plus className="size-4" />
            Nouvel article
          </button>
        )}
      </div>

      {/* Erreur chargement */}
      {loadError && (
        <div className="alert alert-error">
          <span>{loadError}</span>
        </div>
      )}

      {/* Stats */}
      <StatsCards articles={articles} />

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-lifted">
        <button
          role="tab"
          aria-selected={tab === "articles"}
          className={`tab ${tab === "articles" ? "tab-active" : ""}`}
          onClick={() => setTab("articles")}
        >
          <Package className="size-4 mr-2" />
          Articles
        </button>
        <button
          role="tab"
          aria-selected={tab === "fournisseurs"}
          className={`tab ${tab === "fournisseurs" ? "tab-active" : ""}`}
          onClick={() => setTab("fournisseurs")}
        >
          <Truck className="size-4 mr-2" />
          Fournisseurs
        </button>
        <button
          role="tab"
          aria-selected={tab === "emballages"}
          className={`tab ${tab === "emballages" ? "tab-active" : ""}`}
          onClick={() => setTab("emballages")}
        >
          <Archive className="size-4 mr-2" />
          Emballages
        </button>
      </div>

      {/* Articles tab */}
      {tab === "articles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rechercher un article..."
              className="input input-bordered w-full sm:max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select select-bordered"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Tous</option>
              <option value="CONSIGNE">Consignés</option>
              <option value="RUPTURE">Ruptures</option>
              <option value="BAS">Stock bas (≤ 5)</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Type</th>
                  <th>Fournisseur</th>
                  <th>Consigné</th>
                  <th>État</th>
                  {isAdmin && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="text-center text-base-content/50 py-10"
                    >
                      Aucun article trouvé
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.nom}</td>
                      <td>{a.prix.toFixed(2)} Ar</td>
                      <td>{a["quantitéStock"]}</td>
                      <td>
                        <span className="badge badge-outline badge-sm">
                          {a.bottleType}
                        </span>
                      </td>
                      <td>{a.fournisseur?.nom ?? "—"}</td>
                      <td>
                        {a.aConsigner ? (
                          <span className="badge badge-accent badge-sm">
                            Oui
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">
                            Non
                          </span>
                        )}
                      </td>
                      <td>
                        <StockBadge qty={a["quantitéStock"]} />
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              aria-label={`Modifier l'article ${a.nom}`}
                              onClick={() =>
                                setArticleModal({ open: true, article: a })
                              }
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              aria-label={`Supprimer l'article ${a.nom}`}
                              onClick={() =>
                                setDeleteArticleModal({
                                  open: true,
                                  article: a,
                                  deleting: false,
                                  error: null,
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fournisseurs tab */}
      {tab === "fournisseurs" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button
                className="btn btn-primary gap-2"
                onClick={() =>
                  setFournisseurModal({ open: true, fournisseur: null })
                }
              >
                <Plus className="size-4" />
                Nouveau fournisseur
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Téléphone</th>
                  <th>Articles</th>
                  {isAdmin && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {fournisseurs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="text-center text-base-content/50 py-10"
                    >
                      Aucun fournisseur enregistré
                    </td>
                  </tr>
                ) : (
                  fournisseurs.map((f) => (
                    <tr key={f.id}>
                      <td className="font-medium">{f.nom}</td>
                      <td>{f.adresse || "—"}</td>
                      <td>{f.telephone}</td>
                      <td>
                        <span className="badge badge-neutral badge-sm">
                          {f.listeArticles?.length ?? 0}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              aria-label={`Modifier le fournisseur ${f.nom}`}
                              onClick={() =>
                                setFournisseurModal({
                                  open: true,
                                  fournisseur: f,
                                })
                              }
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              aria-label={`Supprimer le fournisseur ${f.nom}`}
                              onClick={() =>
                                setDeleteFournisseurModal({
                                  open: true,
                                  fournisseur: f,
                                  deleting: false,
                                  error: null,
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emballages tab */}
      {tab === "emballages" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button
                className="btn btn-primary gap-2"
                onClick={() =>
                  setEmballageModal({ open: true, emballage: null })
                }
              >
                <Plus className="size-4" />
                Nouvel emballage
              </button>
            </div>
          )}

          {CAGEOT_CAPACITES.map(({ capacite, bouteillePrix }) => {
            // ── Emballage bouteille vide ──
            const bouteilleEmb = emballages.find(
              (e) => e.type === "BOUTEILLE" && e.prixConsigne === bouteillePrix,
            );
            const qtyVides = bouteilleEmb?.quantiteStock ?? 0;
            const montantVides = qtyVides * bouteillePrix;

            // ── Articles VERRE pleins (bouteilles non vides) ──
            const articlesPleins = articles.filter(
              (a) =>
                a.bottleType === "VERRE" && a.prixConsigne === bouteillePrix,
            );
            const qtyPleines = articlesPleins.reduce(
              (sum, a) => sum + (a["quantitéStock"] ?? 0),
              0,
            );
            const montantPleines = qtyPleines * bouteillePrix;

            // ── Cageot ──
            const cageot = emballages.find(
              (e) => e.type === "CAGEOT" && e.capacite === capacite,
            );
            const qtyCageots = cageot?.quantiteStock ?? 0;
            const montantCageots = qtyCageots * 8000;

            // ── Totaux bouteilles (vides + pleines) ──
            const totalBouteillesUnite = qtyVides + qtyPleines;
            const montantTotalBouteilles = montantVides + montantPleines;

            // ── Calcul cageots nécessaires (chaque bouteille doit être dans un cageot) ──
            // Les bouteilles vides et pleines sont dans des cageots séparés
            const cageotsPourVides =
              qtyVides > 0 ? Math.ceil(qtyVides / capacite) : 0;
            const cageotsPourPleines =
              qtyPleines > 0 ? Math.ceil(qtyPleines / capacite) : 0;
            const cageotNecessaires = cageotsPourVides + cageotsPourPleines;
            const cageotLibres = Math.max(0, qtyCageots - cageotNecessaires);
            const cageotManquants = Math.max(0, cageotNecessaires - qtyCageots);

            const hasData = bouteilleEmb || cageot || qtyPleines > 0;

            return (
              <div
                key={bouteillePrix}
                className="card card-bordered border-base-300 bg-base-100 shadow-sm"
              >
                <div className="card-body p-4">
                  <h3 className="card-title text-base">
                    Consignation {bouteillePrix} Ar
                    <span className="badge badge-neutral badge-sm ml-2">
                      1 cageot = {capacite} bouteilles
                    </span>
                  </h3>

                  <div className="overflow-x-auto rounded-box border border-base-300 mt-2">
                    <table className="table table-sm w-full">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Consignation</th>
                          <th>Stock</th>
                          <th>Équivalence</th>
                          <th>Montant consigne</th>
                          {isAdmin && <th className="text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Bouteilles vides (emballages) */}
                        <tr>
                          <td>
                            <span className="badge badge-info badge-sm">
                              Bouteille vide
                            </span>
                          </td>
                          <td>{bouteillePrix} Ar</td>
                          <td className="font-semibold">
                            {bouteilleEmb ? (
                              qtyVides
                            ) : (
                              <span className="text-base-content/40">—</span>
                            )}
                          </td>
                          <td className="text-base-content/60 text-sm">
                            {bouteilleEmb
                              ? `→ ${cageotsPourVides} cageot${cageotsPourVides > 1 ? "s" : ""} occupé${cageotsPourVides > 1 ? "s" : ""}`
                              : "—"}
                          </td>
                          <td className="font-semibold text-success">
                            {bouteilleEmb
                              ? `${montantVides.toLocaleString()} Ar`
                              : "—"}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex justify-end gap-1">
                                {bouteilleEmb ? (
                                  <>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() =>
                                        setEmballageModal({
                                          open: true,
                                          emballage: bouteilleEmb,
                                        })
                                      }
                                    >
                                      <Pencil className="size-4" />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm text-error"
                                      onClick={() =>
                                        setDeleteEmballageModal({
                                          open: true,
                                          emballage: bouteilleEmb,
                                          deleting: false,
                                          error: null,
                                        })
                                      }
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-base-content/40">
                                    Non créé
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Bouteilles pleines (articles VERRE en stock) */}
                        <tr className="bg-base-200/40">
                          <td>
                            <span className="badge badge-accent badge-sm">
                              Bouteille pleine
                            </span>
                          </td>
                          <td>{bouteillePrix} Ar</td>
                          <td className="font-semibold">
                            {qtyPleines > 0 ? (
                              qtyPleines
                            ) : (
                              <span className="text-base-content/40">0</span>
                            )}
                          </td>
                          <td className="text-base-content/60 text-sm">
                            {qtyPleines > 0
                              ? `→ ${cageotsPourPleines} cageot${cageotsPourPleines > 1 ? "s" : ""} occupé${cageotsPourPleines > 1 ? "s" : ""}`
                              : "—"}
                          </td>
                          <td className="font-semibold text-success">
                            {qtyPleines > 0
                              ? `${montantPleines.toLocaleString()} Ar`
                              : "—"}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex justify-end gap-1">
                                {articlesPleins.length > 0 ? (
                                  <span className="text-xs text-base-content/60">
                                    {articlesPleins.length} article
                                    {articlesPleins.length > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-xs text-base-content/40">
                                    Aucun article VERRE
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Sous-total bouteilles */}
                        <tr className="font-medium border-t border-base-300">
                          <td
                            colSpan={2}
                            className="text-base-content/70 italic text-xs"
                          >
                            Sous-total bouteilles
                          </td>
                          <td className="font-bold">{totalBouteillesUnite}</td>
                          <td className="text-base-content/60 text-sm">
                            → {cageotNecessaires} cageot
                            {cageotNecessaires > 1 ? "s" : ""} requis
                          </td>
                          <td className="font-bold text-success">
                            {montantTotalBouteilles.toLocaleString()} Ar
                          </td>
                          {isAdmin && <td />}
                        </tr>

                        {/* Cageot */}
                        <tr>
                          <td>
                            <span className="badge badge-warning badge-sm">
                              Cageot
                            </span>
                          </td>
                          <td>8 000 Ar</td>
                          <td className="font-semibold">
                            {cageot ? (
                              qtyCageots
                            ) : (
                              <span className="text-base-content/40">—</span>
                            )}
                          </td>
                          <td className="text-sm">
                            {cageot ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-warning">
                                  {cageotNecessaires} requis
                                </span>
                                <span className="text-success">
                                  {cageotLibres} libre
                                  {cageotLibres > 1 ? "s" : ""}
                                </span>
                                {cageotManquants > 0 && (
                                  <span className="text-error font-semibold">
                                    {cageotManquants} manquant
                                    {cageotManquants > 1 ? "s" : ""} !
                                  </span>
                                )}
                              </div>
                            ) : cageotNecessaires > 0 ? (
                              <span className="text-error font-semibold">
                                {cageotNecessaires} requis — aucun en stock !
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="font-semibold text-success">
                            {cageot
                              ? `${montantCageots.toLocaleString()} Ar`
                              : "—"}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex justify-end gap-1">
                                {cageot ? (
                                  <>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() =>
                                        setEmballageModal({
                                          open: true,
                                          emballage: cageot,
                                        })
                                      }
                                    >
                                      <Pencil className="size-4" />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm text-error"
                                      onClick={() =>
                                        setDeleteEmballageModal({
                                          open: true,
                                          emballage: cageot,
                                          deleting: false,
                                          error: null,
                                        })
                                      }
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-base-content/40">
                                    Non créé
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Alerte cageots insuffisants */}
                  {cageotManquants > 0 && (
                    <div role="alert" className="alert alert-warning mt-3 py-2">
                      <span className="text-sm font-semibold">
                        ⚠ Attention : il manque {cageotManquants} cageot
                        {cageotManquants > 1 ? "s" : ""} pour contenir toutes
                        les bouteilles !
                      </span>
                    </div>
                  )}
                  {cageotNecessaires > 0 && qtyCageots === 0 && (
                    <div role="alert" className="alert alert-error mt-3 py-2">
                      <span className="text-sm font-semibold">
                        ✗ Aucun cageot en stock — {cageotNecessaires} cageot
                        {cageotNecessaires > 1 ? "s" : ""} requis pour{" "}
                        {totalBouteillesUnite} bouteilles.
                      </span>
                    </div>
                  )}

                  {/* Récapitulatif global du groupe */}
                  {hasData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      <div className="stat bg-base-200 rounded-box p-3">
                        <div className="stat-title text-xs">
                          Bouteilles vides
                        </div>
                        <div className="stat-value text-sm">{qtyVides}</div>
                        <div className="stat-desc">
                          {montantVides.toLocaleString()} Ar
                        </div>
                      </div>
                      <div className="stat bg-base-200 rounded-box p-3">
                        <div className="stat-title text-xs">
                          Bouteilles pleines
                        </div>
                        <div className="stat-value text-sm">{qtyPleines}</div>
                        <div className="stat-desc">
                          {montantPleines.toLocaleString()} Ar
                        </div>
                      </div>
                      <div className="stat bg-base-200 rounded-box p-3">
                        <div className="stat-title text-xs">
                          Cageots occupés / stock
                        </div>
                        <div className="stat-value text-sm">
                          {cageotNecessaires}
                          <span className="text-base font-normal text-base-content/50">
                            {" "}
                            / {qtyCageots}
                          </span>
                        </div>
                        <div
                          className={`stat-desc ${cageotManquants > 0 ? "text-error font-semibold" : "text-success"}`}
                        >
                          {cageotManquants > 0
                            ? `${cageotManquants} manquant${cageotManquants > 1 ? "s" : ""}`
                            : `${cageotLibres} libre${cageotLibres > 1 ? "s" : ""}`}
                        </div>
                      </div>
                      <div className="stat bg-base-200 rounded-box p-3">
                        <div className="stat-title text-xs">
                          Consigne totale
                        </div>
                        <div className="stat-value text-sm text-success">
                          {(
                            montantTotalBouteilles + montantCageots
                          ).toLocaleString()}
                        </div>
                        <div className="stat-desc">
                          Ar (bouteilles + cageots)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Récapitulatif global tous groupes */}
          {emballages.length > 0 ||
          articles.some((a) => a.bottleType === "VERRE") ? (
            (() => {
              const grandTotalVides = CAGEOT_CAPACITES.reduce(
                (sum, { bouteillePrix }) => {
                  const e = emballages.find(
                    (em) =>
                      em.type === "BOUTEILLE" &&
                      em.prixConsigne === bouteillePrix,
                  );
                  return sum + (e?.quantiteStock ?? 0) * bouteillePrix;
                },
                0,
              );
              const grandTotalPleines = CAGEOT_CAPACITES.reduce(
                (sum, { bouteillePrix }) => {
                  const qty = articles
                    .filter(
                      (a) =>
                        a.bottleType === "VERRE" &&
                        a.prixConsigne === bouteillePrix,
                    )
                    .reduce((s, a) => s + (a["quantitéStock"] ?? 0), 0);
                  return sum + qty * bouteillePrix;
                },
                0,
              );
              const grandTotalCageots = CAGEOT_CAPACITES.reduce(
                (sum, { capacite }) => {
                  const e = emballages.find(
                    (em) => em.type === "CAGEOT" && em.capacite === capacite,
                  );
                  return sum + (e?.quantiteStock ?? 0) * 8000;
                },
                0,
              );
              return (
                <div className="card card-bordered border-primary bg-primary/5 shadow-sm mt-2">
                  <div className="card-body p-4">
                    <h3 className="card-title text-sm text-primary">
                      Récapitulatif global emballages
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mt-1">
                      <div className="text-center">
                        <p className="text-xs text-base-content/60">
                          Bouteilles vides
                        </p>
                        <p className="text-lg font-bold">
                          {grandTotalVides.toLocaleString()} Ar
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-base-content/60">
                          Bouteilles pleines
                        </p>
                        <p className="text-lg font-bold">
                          {grandTotalPleines.toLocaleString()} Ar
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-base-content/60">Cageots</p>
                        <p className="text-lg font-bold">
                          {grandTotalCageots.toLocaleString()} Ar
                        </p>
                      </div>
                    </div>
                    <div className="divider my-1" />
                    <div className="text-center">
                      <p className="text-xs text-base-content/60">
                        Total consignes emballages
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {(
                          grandTotalVides +
                          grandTotalPleines +
                          grandTotalCageots
                        ).toLocaleString()}{" "}
                        Ar
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center text-base-content/50 py-10">
              Aucun emballage enregistré — cliquez sur &quot;Nouvel
              emballage&quot; pour commencer.
            </div>
          )}
        </div>
      )}

      {/* Modals articles */}
      <ArticleModal
        open={articleModal.open}
        article={articleModal.article}
        fournisseurs={fournisseurs}
        onClose={() => setArticleModal({ open: false, article: null })}
        onSave={handleSaveArticle}
      />
      <ConfirmModal
        isOpen={deleteArticleModal.open}
        onClose={() =>
          setDeleteArticleModal({
            open: false,
            article: null,
            deleting: false,
            error: null,
          })
        }
        onConfirm={handleDeleteArticle}
        label={deleteArticleModal.article?.nom}
        deleting={deleteArticleModal.deleting}
        deleteError={deleteArticleModal.error}
      />

      {/* Modals fournisseurs */}
      <FournisseurModal
        open={fournisseurModal.open}
        fournisseur={fournisseurModal.fournisseur}
        onClose={() => setFournisseurModal({ open: false, fournisseur: null })}
        onSave={handleSaveFournisseur}
      />
      <ConfirmModal
        isOpen={deleteFournisseurModal.open}
        onClose={() =>
          setDeleteFournisseurModal({
            open: false,
            fournisseur: null,
            deleting: false,
            error: null,
          })
        }
        onConfirm={handleDeleteFournisseur}
        label={deleteFournisseurModal.fournisseur?.nom}
        deleting={deleteFournisseurModal.deleting}
        deleteError={deleteFournisseurModal.error}
      />

      {/* Modals emballages */}
      <EmballageModal
        open={emballageModal.open}
        emballage={emballageModal.emballage}
        onClose={() => setEmballageModal({ open: false, emballage: null })}
        onSave={handleSaveEmballage}
      />
      <ConfirmModal
        isOpen={deleteEmballageModal.open}
        onClose={() =>
          setDeleteEmballageModal({
            open: false,
            emballage: null,
            deleting: false,
            error: null,
          })
        }
        onConfirm={handleDeleteEmballage}
        label={
          deleteEmballageModal.emballage?.type === "BOUTEILLE"
            ? `Bouteille ${deleteEmballageModal.emballage.prixConsigne} Ar`
            : deleteEmballageModal.emballage
              ? `Cageot ${deleteEmballageModal.emballage.capacite} bouteilles`
              : ""
        }
        deleting={deleteEmballageModal.deleting}
        deleteError={deleteEmballageModal.error}
      />
    </div>
  );
}
