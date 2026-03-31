import { useEffect, useState } from "react";
import {
  AlertCircle,
  HelpCircle,
  Package,
  Plus,
  Printer,
  RotateCcw,
  ShoppingCart,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { getAllArticles } from "../api/articleService";
import { getAllClients, createClient } from "../api/clientService";
import { getAllEmballages } from "../api/emballageService";
import { createVente } from "../api/venteService";
import { CAGEOT_CONSIGNE, openPrintWindow } from "../utils/invoiceBuilder";

const NEW_CLIENT_EMPTY = { nom: "", adresse: "", telephone: "" };

// Mapping prixConsigne bouteille → capacité cageot
const BOTTLE_TO_CAGEOT = { 300: 24, 500: 20, 700: 12 };

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// (escapeHtml, buildInvoiceHTML, openPrintWindow → voir utils/invoiceBuilder.js)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentePage() {
  const user = getCurrentUser();

  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [emballages, setEmballages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState(NEW_CLIENT_EMPTY);
  const [newClientSaving, setNewClientSaving] = useState(false);
  const [newClientError, setNewClientError] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [lignes, setLignes] = useState([]);

  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState(null);

  // Retours bouteilles consignées : { [articleId]: quantite rendue }
  const [consignesRendues, setConsignesRendues] = useState({});

  // --- Gestion des cageots (question vendeur) ---
  // cageotsActifs : null = question pas encore posée / true = oui / false = non
  const [cageotsActifs, setCageotsActifs] = useState(null);
  // cageotsCommandes : { [capacite]: quantite prise par le client (à consigner) }
  const [cageotsCommandes, setCageotsCommandes] = useState({});
  // cageotsRendus : { [capacite]: quantite rendue par le client (déduction) }
  const [cageotsRendus, setCageotsRendus] = useState({});

  useEffect(() => {
    Promise.all([getAllArticles(), getAllClients(), getAllEmballages()])
      .then(([arts, cls, embs]) => {
        setArticles(arts);
        setClients(cls);
        setEmballages(embs);
      })
      .catch(() => setError("Erreur lors du chargement des données."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateClient(e) {
    e.preventDefault();
    const nom = newClientForm.nom.trim();
    const adresse = newClientForm.adresse.trim();
    const telephone = newClientForm.telephone.trim();
    if (!nom || !adresse || !telephone) {
      setNewClientError("Nom, adresse et téléphone sont requis.");
      return;
    }
    setNewClientSaving(true);
    setNewClientError("");
    try {
      const created = await createClient({ nom, adresse, telephone });
      setClients((prev) =>
        [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)),
      );
      setClientId(String(created.id));
      setShowNewClient(false);
      setNewClientForm(NEW_CLIENT_EMPTY);
    } catch (err) {
      setNewClientError(
        err?.response?.data?.error || "Erreur lors de la création.",
      );
    } finally {
      setNewClientSaving(false);
    }
  }

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

  // Supprime une ligne de commande et nettoie les états liés
  function handleRemoveLigne(articleId) {
    setLignes((prev) => {
      const newLignes = prev.filter((l) => l.article.id !== articleId);
      // Si plus aucune ligne VERRE consignée → réinitialiser la question cageots
      const hasVerreConsigne = newLignes.some(
        (l) => l.article.bottleType === "VERRE" && l.article.aConsigner,
      );
      if (!hasVerreConsigne) {
        setCageotsActifs(null);
        setCageotsCommandes({});
        setCageotsRendus({});
      }
      return newLignes;
    });
    setConsignesRendues((prev) => {
      const next = { ...prev };
      delete next[articleId];
      return next;
    });
    setError(null);
  }

  // Calcule le minimum de cageots nécessaires par groupe de capacité.
  // Utilisé comme suggestion pré-remplie quand le vendeur dit "oui" à la question.
  // Règle : on remplit un cageot entièrement avant d'en ouvrir un autre.
  function calcCageotsMinimum() {
    const totals = {};
    for (const l of lignes) {
      const a = l.article;
      if (
        a.bottleType === "VERRE" &&
        a.aConsigner &&
        BOTTLE_TO_CAGEOT[a.prixConsigne]
      ) {
        const cap = BOTTLE_TO_CAGEOT[a.prixConsigne];
        if (!totals[cap])
          totals[cap] = { totalBottles: 0, bouteillePrix: a.prixConsigne };
        totals[cap].totalBottles += l.quantite;
      }
    }
    const map = {};
    for (const [cap, { totalBottles, bouteillePrix }] of Object.entries(
      totals,
    )) {
      map[parseInt(cap)] = {
        nbRequis: Math.ceil(totalBottles / parseInt(cap)),
        bouteillePrix,
      };
    }
    return map;
  }

  // Distribution marginale des cageots commandés par ligne (même logique que le backend).
  // Chaque article reçoit les cageots qu'il "ouvre" dans son groupe de capacité.
  // Ne retourne d'allocation QUE si des cageots ont été confirmés (cageotsActifs===true).
  function calcCageotsParLigne() {
    if (cageotsActifs !== true) return {}; // pas de cageots si non confirmés
    const alloc = {}; // { articleId: { qteCageots, consigneCageot } }
    const cum = {}; // { cap: cumul bouteilles du groupe }
    for (const l of lignes) {
      const a = l.article;
      const cap = BOTTLE_TO_CAGEOT[a.prixConsigne];
      // Uniquement les bouteilles VERRE consignées dont des cageots ont été commandés
      if (
        a.bottleType === "VERRE" &&
        a.aConsigner &&
        cap &&
        (cageotsCommandes[cap] || 0) > 0
      ) {
        const cumBefore = cum[cap] || 0;
        const cumAfter = cumBefore + l.quantite;
        const qteCageots =
          Math.ceil(cumAfter / cap) - Math.ceil(cumBefore / cap);
        alloc[a.id] = {
          qteCageots,
          consigneCageot: qteCageots * CAGEOT_CONSIGNE,
        };
        cum[cap] = cumAfter;
      }
    }
    return alloc;
  }

  function handleChangeLigneQty(articleId, newQty) {
    if (newQty <= 0) {
      handleRemoveLigne(articleId);
      return;
    }
    const article = articles.find((a) => a.id === articleId);
    if (!article) return;
    if (newQty > article["quantitéStock"]) {
      setError(
        `Stock insuffisant pour "${article.nom}". Disponible : ${article["quantitéStock"]}`,
      );
      return;
    }
    setLignes((prev) =>
      prev.map((l) =>
        l.article.id === articleId ? { ...l, quantite: newQty } : l,
      ),
    );
    setError(null);
  }

  // Calcule le total d'une ligne : (prix + consigne bouteille) × qté + consigne cageot attribuée
  function ligneTotal(l) {
    const { consigneCageot: cageotCons = 0 } =
      calcCageotsParLigne()[l.article.id] || {};
    return (
      (l.article.prix + (l.article.aConsigner ? l.article.prixConsigne : 0)) *
        l.quantite +
      cageotCons
    );
  }

  const selectedClient = clients.find((c) => c.id === parseInt(clientId));
  // Suggestion de cageots minimums (pré-remplie dans les champs si le vendeur dit "oui")
  const cageotsMinimum = calcCageotsMinimum();

  // Totaux calculés en temps réel
  const total = lignes.reduce((sum, l) => sum + ligneTotal(l), 0);
  const totalConsigneRendue = lignes
    .filter((l) => l.article.aConsigner)
    .reduce(
      (sum, l) =>
        sum + l.article.prixConsigne * (consignesRendues[l.article.id] || 0),
      0,
    );

  // Déduction cageots rendus (seulement si cageots actifs)
  const totalCageotsRendue =
    cageotsActifs === true
      ? Object.entries(cageotsRendus).reduce(
          (sum, [, qty]) => sum + (qty || 0) * CAGEOT_CONSIGNE,
          0,
        )
      : 0;

  // Consigne totale pour les cageots commandés cette vente
  const totalCageotsCommandes =
    cageotsActifs === true
      ? Object.entries(cageotsCommandes).reduce(
          (sum, [, qty]) => sum + (qty || 0) * CAGEOT_CONSIGNE,
          0,
        )
      : 0;

  const totalFinal = total - totalConsigneRendue - totalCageotsRendue;

  // Valide la vente et envoie au backend
  async function handleValider() {
    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article.");
      return;
    }
    // Si des bouteilles VERRE consignées sont présentes et que la question cageots
    // n'a pas été répondue, bloquer la validation.
    const hasVerreConsigne = lignes.some(
      (l) => l.article.bottleType === "VERRE" && l.article.aConsigner,
    );
    if (hasVerreConsigne && cageotsActifs === null) {
      setError("Indiquez si le client a besoin de cageots avant de valider.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await createVente({
        clientId: parseInt(clientId),
        lignes: lignes.map((l) => ({
          articleId: l.article.id,
          quantite: l.quantite,
        })),
        // Bouteilles rendues par le client
        consignesRendues: Object.entries(consignesRendues)
          .filter(([, qty]) => qty > 0)
          .map(([id, quantite]) => ({ articleId: parseInt(id), quantite })),
        // Cageots commandés (vides si le client n'en veut pas)
        cageotsCommandes:
          cageotsActifs === true
            ? Object.entries(cageotsCommandes)
                .filter(([, qty]) => qty > 0)
                .map(([capacite, quantite]) => ({
                  capacite: parseInt(capacite),
                  quantite,
                }))
            : [],
        // Cageots rendus (seulement si des cageots ont été commandés)
        cageotsRendus:
          cageotsActifs === true
            ? Object.entries(cageotsRendus)
                .filter(([, qty]) => qty > 0)
                .map(([capacite, quantite]) => ({
                  capacite: parseInt(capacite),
                  quantite,
                }))
            : [],
      });

      setInvoice(result);

      // Réinitialiser tous les états du formulaire de vente
      setLignes([]);
      setClientId("");
      setSelectedArticleId("");
      setSelectedQty(1);
      setConsignesRendues({});
      setCageotsActifs(null);
      setCageotsCommandes({});
      setCageotsRendus({});

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
            Facture <strong>N° {invoice.id}</strong> — {invoice.client.nom} —{" "}
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

            {/* Sélection client */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="label-text font-medium">Client *</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={() => {
                    setShowNewClient((v) => !v);
                    setNewClientError("");
                    setNewClientForm(NEW_CLIENT_EMPTY);
                  }}
                >
                  {showNewClient ? (
                    <Users className="size-3" />
                  ) : (
                    <UserPlus className="size-3" />
                  )}
                  {showNewClient ? "Choisir existant" : "Nouveau client"}
                </button>
              </div>

              {showNewClient ? (
                <form
                  onSubmit={handleCreateClient}
                  className="space-y-2 p-3 bg-base-200 rounded-box"
                >
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    placeholder="Nom *"
                    value={newClientForm.nom}
                    onChange={(e) =>
                      setNewClientForm((p) => ({ ...p, nom: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      placeholder="Adresse *"
                      value={newClientForm.adresse}
                      onChange={(e) =>
                        setNewClientForm((p) => ({
                          ...p,
                          adresse: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      placeholder="Téléphone *"
                      value={newClientForm.telephone}
                      onChange={(e) =>
                        setNewClientForm((p) => ({
                          ...p,
                          telephone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {newClientError && (
                    <p className="text-error text-xs">{newClientError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowNewClient(false)}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-xs"
                      disabled={newClientSaving}
                    >
                      {newClientSaving && (
                        <span className="loading loading-spinner loading-xs" />
                      )}
                      Créer &amp; sélectionner
                    </button>
                  </div>
                </form>
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">— Sélectionner un client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              )}

              {selectedClient && !showNewClient && (
                <p className="text-xs text-base-content/60">
                  {selectedClient.adresse} · {selectedClient.telephone}
                </p>
              )}
            </div>

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
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className="btn btn-ghost btn-xs px-1"
                              onClick={() =>
                                handleChangeLigneQty(
                                  l.article.id,
                                  l.quantite - 1,
                                )
                              }
                            >
                              −
                            </button>
                            <span className="tabular-nums w-6 text-center font-medium">
                              {l.quantite}
                            </span>
                            <button
                              className="btn btn-ghost btn-xs px-1"
                              onClick={() =>
                                handleChangeLigneQty(
                                  l.article.id,
                                  l.quantite + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="text-right tabular-nums">
                          {l.article.prix.toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="text-right tabular-nums">
                          {l.article.aConsigner ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-warning">
                                +
                                {(
                                  l.article.prixConsigne * l.quantite
                                ).toLocaleString("fr-FR")}{" "}
                                Ar
                              </span>
                              {(() => {
                                const { qteCageots = 0, consigneCageot = 0 } =
                                  calcCageotsParLigne()[l.article.id] || {};
                                return qteCageots > 0 ? (
                                  <span className="text-amber-500 text-xs">
                                    cageot +
                                    {consigneCageot.toLocaleString("fr-FR")} Ar
                                    ({qteCageots} cageot
                                    {qteCageots > 1 ? "s" : ""})
                                  </span>
                                ) : null;
                              })()}
                            </div>
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
                    {(totalConsigneRendue > 0 || totalCageotsRendue > 0) && (
                      <>
                        <tr className="text-sm text-base-content/60">
                          <td colSpan={4} className="text-right">
                            Sous-total
                          </td>
                          <td className="text-right tabular-nums">
                            {total.toLocaleString("fr-FR")} Ar
                          </td>
                          <td></td>
                        </tr>
                        {totalConsigneRendue > 0 && (
                          <tr className="text-sm text-success">
                            <td colSpan={4} className="text-right">
                              ↩ Consignes bouteilles rendues
                            </td>
                            <td className="text-right tabular-nums">
                              −{totalConsigneRendue.toLocaleString("fr-FR")} Ar
                            </td>
                            <td></td>
                          </tr>
                        )}
                        {totalCageotsRendue > 0 && (
                          <tr className="text-sm text-amber-600">
                            <td colSpan={4} className="text-right">
                              ↩ Consignes cageots rendus
                            </td>
                            <td className="text-right tabular-nums">
                              −{totalCageotsRendue.toLocaleString("fr-FR")} Ar
                            </td>
                            <td></td>
                          </tr>
                        )}
                      </>
                    )}
                    <tr className="font-bold text-base">
                      <td colSpan={4} className="text-right">
                        TOTAL NET
                      </td>
                      <td className="text-right text-primary tabular-nums">
                        {totalFinal.toLocaleString("fr-FR")} Ar
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
                ★ Consigne incluse au prix de vente selon le tarif de chaque
                article.
              </p>
            )}

            {/* Bouteilles rendues */}
            {lignes.some((l) => l.article.aConsigner) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-4 text-success" />
                  <span className="font-medium text-sm">
                    Bouteilles rendues par le client
                  </span>
                </div>
                <div className="rounded-box border border-base-200 p-3 space-y-2 bg-base-50">
                  {lignes
                    .filter((l) => l.article.aConsigner)
                    .map(({ article, quantite }) => (
                      <div key={article.id} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">
                          {article.nom}
                          <span className="text-base-content/40 ml-1 text-xs">
                            (achetés : {quantite})
                          </span>
                        </span>
                        <span className="text-xs text-success whitespace-nowrap">
                          −{article.prixConsigne.toLocaleString("fr-FR")} Ar/u
                        </span>
                        <input
                          type="number"
                          min={0}
                          className="input input-bordered input-sm w-20"
                          value={consignesRendues[article.id] || ""}
                          placeholder="0"
                          onChange={(e) => {
                            const qty = Math.max(
                              0,
                              parseInt(e.target.value) || 0,
                            );
                            setConsignesRendues((prev) => ({
                              ...prev,
                              [article.id]: qty,
                            }));
                          }}
                        />
                      </div>
                    ))}
                  {totalConsigneRendue > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-base-200 font-semibold text-success">
                      <span className="text-sm">
                        Déduction consignes bouteilles
                      </span>
                      <span className="tabular-nums">
                        −{totalConsigneRendue.toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Question cageots ──────────────────────────────────────── */}
            {/* Affichée uniquement s'il y a des bouteilles VERRE consignées */}
            {lignes.some(
              (l) => l.article.bottleType === "VERRE" && l.article.aConsigner,
            ) && (
              <div className="space-y-3">
                {/* Question oui/non */}
                <div className="rounded-box border border-base-300 p-3 bg-base-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="size-4 text-amber-500" />
                    <span className="font-medium text-sm">
                      Des cageots sont-ils nécessaires pour cette vente ?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 ${cageotsActifs === true ? "btn-warning" : "btn-outline"}`}
                      onClick={() => {
                        // Pré-remplir avec le minimum calculé
                        const newCmd = {};
                        for (const [cap, { nbRequis }] of Object.entries(
                          cageotsMinimum,
                        )) {
                          newCmd[parseInt(cap)] = nbRequis;
                        }
                        setCageotsActifs(true);
                        setCageotsCommandes(newCmd);
                        setCageotsRendus({});
                      }}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 ${cageotsActifs === false ? "btn-neutral" : "btn-outline"}`}
                      onClick={() => {
                        setCageotsActifs(false);
                        setCageotsCommandes({});
                        setCageotsRendus({});
                      }}
                    >
                      Non
                    </button>
                  </div>

                  {/* Si oui : saisie du nombre de cageots commandés */}
                  {cageotsActifs === true && (
                    <div className="space-y-2 pt-1 border-t border-base-200">
                      <p className="text-xs text-base-content/60">
                        Combien de cageots le client prend-il ? (consignés à{" "}
                        {CAGEOT_CONSIGNE.toLocaleString("fr-FR")} Ar/u)
                      </p>
                      {Object.entries(cageotsMinimum).map(
                        ([cap, { nbRequis }]) => {
                          const capacite = parseInt(cap);
                          const stockCageot =
                            emballages.find(
                              (e) =>
                                e.type === "CAGEOT" && e.capacite === capacite,
                            )?.quantiteStock ?? 0;
                          return (
                            <div
                              key={capacite}
                              className="flex items-center gap-2"
                            >
                              <span className="text-sm flex-1">
                                Cageot {capacite} bouteilles
                                <span className="text-base-content/40 ml-1 text-xs">
                                  (min : {nbRequis}, stock : {stockCageot})
                                </span>
                              </span>
                              <span className="text-xs text-amber-600 whitespace-nowrap">
                                +{CAGEOT_CONSIGNE.toLocaleString("fr-FR")} Ar/u
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={stockCageot}
                                className="input input-bordered input-sm w-20 border-amber-300"
                                value={cageotsCommandes[capacite] ?? ""}
                                placeholder={String(nbRequis)}
                                onChange={(e) => {
                                  const qty = Math.min(
                                    stockCageot,
                                    Math.max(0, parseInt(e.target.value) || 0),
                                  );
                                  setCageotsCommandes((prev) => ({
                                    ...prev,
                                    [capacite]: qty,
                                  }));
                                  // Réinitialiser retour si on réduit en dessous du retour en cours
                                  setCageotsRendus((prev) => {
                                    const retour = prev[capacite] || 0;
                                    return retour > qty
                                      ? { ...prev, [capacite]: qty }
                                      : prev;
                                  });
                                }}
                              />
                            </div>
                          );
                        },
                      )}
                      {totalCageotsCommandes > 0 && (
                        <div className="flex justify-between items-center pt-2 border-t border-amber-200 font-semibold text-amber-600">
                          <span className="text-sm">
                            Total consigne cageots
                          </span>
                          <span className="tabular-nums">
                            +{totalCageotsCommandes.toLocaleString("fr-FR")} Ar
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Retour cageots : seulement si des cageots ont été commandés */}
                {cageotsActifs === true &&
                  Object.values(cageotsCommandes).some((q) => q > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="size-4 text-amber-500" />
                        <span className="font-medium text-sm">
                          Cageots rendus par le client
                        </span>
                      </div>
                      <div className="rounded-box border border-amber-200 p-3 space-y-2 bg-amber-50">
                        {Object.entries(cageotsCommandes)
                          .filter(([, qty]) => qty > 0)
                          .map(([cap]) => {
                            const capacite = parseInt(cap);
                            const maxRetour = cageotsCommandes[capacite] || 0;
                            return (
                              <div
                                key={capacite}
                                className="flex items-center gap-2"
                              >
                                <span className="text-sm flex-1">
                                  Cageot {capacite} bouteilles
                                  <span className="text-base-content/40 ml-1 text-xs">
                                    (commandés : {maxRetour})
                                  </span>
                                </span>
                                <span className="text-xs text-amber-600 whitespace-nowrap">
                                  −{CAGEOT_CONSIGNE.toLocaleString("fr-FR")}{" "}
                                  Ar/u
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={maxRetour}
                                  className="input input-bordered input-sm w-20 border-amber-300"
                                  value={cageotsRendus[capacite] || ""}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const qty = Math.min(
                                      maxRetour,
                                      Math.max(
                                        0,
                                        parseInt(e.target.value) || 0,
                                      ),
                                    );
                                    setCageotsRendus((prev) => ({
                                      ...prev,
                                      [capacite]: qty,
                                    }));
                                  }}
                                />
                              </div>
                            );
                          })}
                        {totalCageotsRendue > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t border-amber-200 font-semibold text-amber-600">
                            <span className="text-sm">
                              Déduction consignes cageots
                            </span>
                            <span className="tabular-nums">
                              −{totalCageotsRendue.toLocaleString("fr-FR")} Ar
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Valider */}
            <div className="card-actions justify-end">
              <button
                className="btn btn-success btn-wide"
                onClick={handleValider}
                disabled={processing || lignes.length === 0 || !clientId}
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
                              ★ +{a.prixConsigne.toLocaleString("fr-FR")} Ar
                              consigne
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
