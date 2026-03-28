import { useEffect, useState } from "react";
import { Package, Pencil, Plus, Trash2, Truck } from "lucide-react";

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

import ArticleModal from "../components/ArticleModal";
import ConfirmModal from "../components/ConfirmModal";
import FournisseurModal from "../components/FournisseurModal";
import StatsCards from "../components/StatsCards";
import StockBadge from "../components/StockBadge";

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [tab, setTab] = useState("articles");

  const [articleModal, setArticleModal] = useState({ open: false, article: null });
  const [deleteArticleModal, setDeleteArticleModal] = useState({ open: false, article: null });
  const [fournisseurModal, setFournisseurModal] = useState({ open: false, fournisseur: null });
  const [deleteFournisseurModal, setDeleteFournisseurModal] = useState({ open: false, fournisseur: null });

  async function loadData() {
    setLoading(true);
    try {
      const [arts, fours] = await Promise.all([getAllArticles(), getAllFournisseurs()]);
      setArticles(arts);
      setFournisseurs(fours);
    } catch (err) {
      console.error("Erreur chargement données:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

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
    await deleteArticle(deleteArticleModal.article.id);
    setDeleteArticleModal({ open: false, article: null });
    loadData();
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
    await deleteFournisseur(deleteFournisseurModal.fournisseur.id);
    setDeleteFournisseurModal({ open: false, fournisseur: null });
    loadData();
  }

  const filtered = articles.filter((a) => {
    const matchSearch = a.nom.toLowerCase().includes(search.toLowerCase());
    const matchType =
      filterType === "ALL" ||
      (filterType === "CONSIGNE" && a.aConsigner) ||
      (filterType === "RUPTURE" && a["quantitéStock"] === 0) ||
      (filterType === "BAS" && a["quantitéStock"] > 0 && a["quantitéStock"] <= 5);
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
            {fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? "s" : ""}
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

      {/* Stats */}
      <StatsCards articles={articles} />

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-lifted">
        <a
          role="tab"
          className={`tab ${tab === "articles" ? "tab-active" : ""}`}
          onClick={() => setTab("articles")}
        >
          <Package className="size-4 mr-2" />
          Articles
        </a>
        <a
          role="tab"
          className={`tab ${tab === "fournisseurs" ? "tab-active" : ""}`}
          onClick={() => setTab("fournisseurs")}
        >
          <Truck className="size-4 mr-2" />
          Fournisseurs
        </a>
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
                    <td colSpan={isAdmin ? 8 : 7} className="text-center text-base-content/50 py-10">
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
                        <span className="badge badge-outline badge-sm">{a.bottleType}</span>
                      </td>
                      <td>{a.fournisseur?.nom ?? "—"}</td>
                      <td>
                        {a.aConsigner ? (
                          <span className="badge badge-accent badge-sm">Oui</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">Non</span>
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
                              onClick={() => setArticleModal({ open: true, article: a })}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              onClick={() => setDeleteArticleModal({ open: true, article: a })}
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
                onClick={() => setFournisseurModal({ open: true, fournisseur: null })}
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
                    <td colSpan={isAdmin ? 5 : 4} className="text-center text-base-content/50 py-10">
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
                              onClick={() => setFournisseurModal({ open: true, fournisseur: f })}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              onClick={() => setDeleteFournisseurModal({ open: true, fournisseur: f })}
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
        onClose={() => setDeleteArticleModal({ open: false, article: null })}
        onConfirm={handleDeleteArticle}
        label={deleteArticleModal.article?.nom}
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
        onClose={() => setDeleteFournisseurModal({ open: false, fournisseur: null })}
        onConfirm={handleDeleteFournisseur}
        label={deleteFournisseurModal.fournisseur?.nom}
      />
    </div>
  );
}
