import { useEffect, useState } from "react";
import {
  AlertCircle,
  Package,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { getAllArticles } from "../api/articleService";
import { createVente } from "../api/venteService";

const CONSIGNE = 700;

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildInvoiceHTML(invoice) {
  const lignesRows = invoice.lignes
    .map(
      (l) =>
        `<tr>
          <td>${escapeHtml(l.article.nom)}</td>
          <td style="text-align:center">${escapeHtml(l.article.bottleType)}</td>
          <td style="text-align:center">${l.article.aConsigner ? "Oui (+" + CONSIGNE + " Ar)" : "Non"}</td>
          <td style="text-align:right">${l.quantite}</td>
          <td style="text-align:right">${l.prixUnitaire.toLocaleString("fr-FR")} Ar</td>
          <td style="text-align:right">${l.consigne > 0 ? l.consigne.toLocaleString("fr-FR") + " Ar" : "—"}</td>
          <td style="text-align:right"><strong>${l.prixTotal.toLocaleString("fr-FR")} Ar</strong></td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture — ${escapeHtml(invoice.clientNom)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 48px; color: #111; }
    h1 { font-size: 26px; margin: 0 0 4px; }
    .subtitle { color: #666; margin-bottom: 28px; font-size: 13px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .meta-box { background: #f8f8f8; border: 1px solid #e0e0e0; padding: 14px 18px; border-radius: 6px; }
    .meta-box p { margin: 4px 0; font-size: 14px; }
    .meta-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f0f0f0; border: 1px solid #ddd; padding: 9px 12px; text-align: left; font-size: 13px; }
    td { border: 1px solid #ddd; padding: 9px 12px; font-size: 13px; }
    .total-row td { font-size: 15px; background: #f5f5f5; }
    .footer { margin-top: 48px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>Depot-Star</h1>
  <div class="subtitle">Facture de vente</div>
  <div class="meta-grid">
    <div class="meta-box">
      <div class="label">Client</div>
      <p><strong>${escapeHtml(invoice.clientNom)}</strong></p>
    </div>
    <div class="meta-box">
      <div class="label">Vendeur · Date</div>
      <p>${escapeHtml(invoice.vendeur)}</p>
      <p>${new Date(invoice.date).toLocaleString("fr-FR")}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th style="text-align:center">Type</th>
        <th style="text-align:center">Consigné</th>
        <th style="text-align:right">Qté</th>
        <th style="text-align:right">Prix unit.</th>
        <th style="text-align:right">Consigne</th>
        <th style="text-align:right">Total ligne</th>
      </tr>
    </thead>
    <tbody>${lignesRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6" style="text-align:right"><strong>TOTAL</strong></td>
        <td style="text-align:right"><strong>${invoice.total.toLocaleString("fr-FR")} Ar</strong></td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">Merci de votre confiance — Depot-Star</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

function openPrintWindow(invoice) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildInvoiceHTML(invoice));
  win.document.close();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentePage() {
  const user = getCurrentUser();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientNom, setClientNom] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [lignes, setLignes] = useState([]);

  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    getAllArticles()
      .then(setArticles)
      .catch(() => setError("Erreur lors du chargement des articles."))
      .finally(() => setLoading(false));
  }, []);

  function qtyInOrder(articleId) {
    return lignes
      .filter((l) => l.article.id === articleId)
      .reduce((sum, l) => sum + l.quantite, 0);
  }

  function handleAddLigne() {
    if (!selectedArticleId) return;
    const article = articles.find((a) => a.id === parseInt(selectedArticleId));
    if (!article) return;

    const alreadyUsed = qtyInOrder(article.id);
    const available = article["quantitéStock"] - alreadyUsed;

    if (selectedQty > available) {
      setError(
        `Stock insuffisant pour "${article.nom}". Disponible : ${available}`,
      );
      return;
    }

    setLignes((prev) => {
      const existing = prev.find((l) => l.article.id === article.id);
      if (existing) {
        return prev.map((l) =>
          l.article.id === article.id
            ? { ...l, quantite: l.quantite + selectedQty }
            : l,
        );
      }
      return [...prev, { article, quantite: selectedQty }];
    });

    setError(null);
    setSelectedArticleId("");
    setSelectedQty(1);
  }

  function handleRemoveLigne(articleId) {
    setLignes((prev) => prev.filter((l) => l.article.id !== articleId));
    setError(null);
  }

  function ligneTotal(l) {
    return (
      (l.article.prix + (l.article.aConsigner ? CONSIGNE : 0)) * l.quantite
    );
  }

  const total = lignes.reduce((sum, l) => sum + ligneTotal(l), 0);

  async function handleValider() {
    if (!clientNom.trim()) {
      setError("Veuillez saisir le nom du client.");
      return;
    }
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await createVente({
        clientNom: clientNom.trim(),
        lignes: lignes.map((l) => ({
          articleId: l.article.id,
          quantite: l.quantite,
        })),
      });

      setInvoice(result);

      // Réinitialiser la commande immédiatement pour éviter les re-soumissions
      setLignes([]);
      setClientNom("");
      setSelectedArticleId("");
      setSelectedQty(1);

      // Rafraîchir le stock (non-bloquant, échec non-fatal)
      try {
        const updated = await getAllArticles();
        setArticles(updated);
      } catch {
        setError("Vente validée, mais le stock n'a pas pu être rafraîchi.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Erreur lors de la validation de la vente.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const selectedArticleObj = selectedArticleId
    ? articles.find((a) => a.id === parseInt(selectedArticleId))
    : null;
  const maxQty = selectedArticleObj
    ? selectedArticleObj["quantitéStock"] - qtyInOrder(selectedArticleObj.id)
    : 99;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="size-7 text-primary" />
        <h1 className="text-2xl font-bold">Nouvelle Vente</h1>
        <span className="badge badge-ghost ml-auto">
          Vendeur : {user.alias}
        </span>
      </div>

      {/* Erreur */}
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

      {/* Bannière facture */}
      {invoice && (
        <div className="alert alert-success shadow">
          <Printer className="size-5 shrink-0" />
          <span>
            Vente validée pour <strong>{invoice.clientNom}</strong> — Total :{" "}
            <strong>{invoice.total.toLocaleString("fr-FR")} Ar</strong>
          </span>
          <button
            className="btn btn-sm btn-success ml-auto"
            onClick={() => openPrintWindow(invoice)}
          >
            <Printer className="size-4 mr-1" />
            Imprimer la facture
          </button>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ── GAUCHE : Commande ── */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body space-y-5">
            <h2 className="card-title">
              <ShoppingCart className="size-5" /> Commande Client
            </h2>

            {/* Nom client */}
            <label className="form-control">
              <div className="label">
                <span className="label-text font-medium">Nom du client</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Ex. Marie Dupont"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
              />
            </label>

            {/* Ligne d'ajout */}
            <div className="flex gap-2 items-end">
              <label className="form-control flex-1 min-w-0">
                <div className="label">
                  <span className="label-text font-medium">Article</span>
                </div>
                <select
                  className="select select-bordered w-full"
                  value={selectedArticleId}
                  onChange={(e) => {
                    setSelectedArticleId(e.target.value);
                    setSelectedQty(1);
                    setError(null);
                  }}
                >
                  <option value="">— Choisir un article —</option>
                  {articles
                    .filter((a) => a["quantitéStock"] - qtyInOrder(a.id) > 0)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                        {a.aConsigner ? " ★" : ""} —{" "}
                        {a["quantitéStock"] - qtyInOrder(a.id)} dispo
                      </option>
                    ))}
                </select>
              </label>

              <label className="form-control w-24 shrink-0">
                <div className="label">
                  <span className="label-text font-medium">Qté</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  className="input input-bordered w-full"
                  value={selectedQty}
                  onChange={(e) =>
                    setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </label>

              <button
                className="btn btn-primary shrink-0"
                onClick={handleAddLigne}
                disabled={!selectedArticleId || maxQty <= 0}
              >
                <Plus className="size-4" />
              </button>
            </div>

            {/* Lignes de commande */}
            <div className="overflow-x-auto rounded-box border border-base-200">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="text-center">Qté</th>
                    <th className="text-right">P.U.</th>
                    <th className="text-right">Consigne</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-base-content/40 py-8"
                      >
                        Aucun article ajouté
                      </td>
                    </tr>
                  ) : (
                    lignes.map((l) => (
                      <tr key={l.article.id}>
                        <td>
                          <div className="font-medium">{l.article.nom}</div>
                          <div className="text-xs text-base-content/50">
                            {l.article.bottleType}
                            {l.article.aConsigner && (
                              <span className="text-warning ml-1">
                                ★ consigné
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center tabular-nums">
                          {l.quantite}
                        </td>
                        <td className="text-right tabular-nums">
                          {l.article.prix.toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="text-right tabular-nums">
                          {l.article.aConsigner ? (
                            <span className="text-warning">
                              +{(CONSIGNE * l.quantite).toLocaleString("fr-FR")}{" "}
                              Ar
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-right tabular-nums font-semibold">
                          {ligneTotal(l).toLocaleString("fr-FR")} Ar
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleRemoveLigne(l.article.id)}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {lignes.length > 0 && (
                  <tfoot>
                    <tr className="font-bold text-base">
                      <td colSpan={4} className="text-right">
                        TOTAL
                      </td>
                      <td className="text-right text-primary tabular-nums">
                        {total.toLocaleString("fr-FR")} Ar
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Légende consigne */}
            {lignes.some((l) => l.article.aConsigner) && (
              <p className="text-xs text-warning">
                ★ Articles consignés : +{CONSIGNE} Ar par unité inclus dans le
                total.
              </p>
            )}

            {/* Valider */}
            <div className="card-actions justify-end">
              <button
                className="btn btn-success btn-wide"
                onClick={handleValider}
                disabled={
                  processing || lignes.length === 0 || !clientNom.trim()
                }
              >
                {processing && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Valider la vente &amp; générer la facture
              </button>
            </div>
          </div>
        </div>

        {/* ── DROITE : Vue stock en temps réel ── */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">
              <Package className="size-5" /> Stock en temps réel
            </h2>
            <p className="text-sm text-base-content/60 -mt-2">
              Mise à jour à chaque article ajouté à la commande.
            </p>

            <div className="overflow-x-auto rounded-box border border-base-200">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="text-center">Actuel</th>
                    <th className="text-center">Réservé</th>
                    <th className="text-center">Restant</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => {
                    const reserved = qtyInOrder(a.id);
                    const remaining = a["quantitéStock"] - reserved;
                    return (
                      <tr
                        key={a.id}
                        className={a["quantitéStock"] === 0 ? "opacity-30" : ""}
                      >
                        <td>
                          <div className="font-medium">{a.nom}</div>
                          {a.aConsigner && (
                            <div className="text-xs text-warning">
                              ★ +{CONSIGNE} Ar consigne
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge badge-neutral badge-sm tabular-nums">
                            {a["quantitéStock"]}
                          </span>
                        </td>
                        <td className="text-center">
                          {reserved > 0 ? (
                            <span className="badge badge-warning badge-sm tabular-nums">
                              −{reserved}
                            </span>
                          ) : (
                            <span className="text-base-content/30">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge badge-sm tabular-nums ${
                              remaining === 0
                                ? "badge-error"
                                : remaining <= 3
                                  ? "badge-warning"
                                  : "badge-success"
                            }`}
                          >
                            {remaining}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
