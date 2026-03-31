import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  RotateCcw,
  Search,
  TrendingUp,
} from "lucide-react";
import { getVentes } from "../api/venteService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString("fr-FR") + " Ar" : "—";
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

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Print invoice ─────────────────────────────────────────────────────────────

function buildInvoiceHTML(v) {
  const lignesRows = (v.lignes ?? [])
    .map(
      (l) => `<tr>
      <td>${escapeHtml(l.articleNom)}</td>
      <td style="text-align:right">${l.quantite}</td>
      <td style="text-align:right">${l.prixUnitaire.toLocaleString("fr-FR")} Ar</td>
      <td style="text-align:right">${l.prixConsigne > 0 ? "+" + (l.prixConsigne * l.quantite).toLocaleString("fr-FR") + " Ar" : "—"}</td>
      <td style="text-align:right"><strong>${l.prixTotal.toLocaleString("fr-FR")} Ar</strong></td>
    </tr>`,
    )
    .join("");

  const hasRetour =
    Array.isArray(v.consignesRetour) && v.consignesRetour.length > 0;

  const retourRows = hasRetour
    ? v.consignesRetour
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.articleNom)}</td>
        <td style="text-align:right">${r.quantite}</td>
        <td style="text-align:right">${r.prixConsigne.toLocaleString("fr-FR")} Ar</td>
        <td style="text-align:right; color:#16a34a; font-weight:600">−${r.montant.toLocaleString("fr-FR")} Ar</td>
      </tr>`,
        )
        .join("")
    : "";

  const retourSection = hasRetour
    ? `<h3 style="font-size:15px;margin:28px 0 10px;color:#15803d">&#x21A9; Bouteilles rendues par le client</h3>
  <table>
    <thead><tr style="background:#f0fdf4">
      <th style="color:#15803d">Article</th>
      <th style="text-align:right;color:#15803d">Qté rendue</th>
      <th style="text-align:right;color:#15803d">Consigne/u</th>
      <th style="text-align:right;color:#15803d">Déduction</th>
    </tr></thead>
    <tbody>${retourRows}</tbody>
    <tfoot><tr style="background:#f0fdf4">
      <td colspan="3" style="text-align:right;font-weight:600;color:#15803d">Total déduction</td>
      <td style="text-align:right;font-weight:700;font-size:15px;color:#15803d">−${(v.consigneRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
    </tr></tfoot>
  </table>`
    : "";

  const hasCageotRetour =
    Array.isArray(v.cageotsRetour) && v.cageotsRetour.length > 0;

  const cageotRetourRows = hasCageotRetour
    ? v.cageotsRetour
        .map(
          (r) => `<tr>
        <td>Cageot ${r.capacite} bouteilles</td>
        <td style="text-align:right">${r.quantite}</td>
        <td style="text-align:right">8 000 Ar</td>
        <td style="text-align:right; color:#d97706; font-weight:600">−${r.montant.toLocaleString("fr-FR")} Ar</td>
      </tr>`,
        )
        .join("")
    : "";

  const cageotRetourSection = hasCageotRetour
    ? `<h3 style="font-size:15px;margin:28px 0 10px;color:#d97706">&#x21A9; Cageots rendus par le client</h3>
  <table>
    <thead><tr style="background:#fffbeb">
      <th style="color:#d97706">Cageot</th>
      <th style="text-align:right;color:#d97706">Qté rendue</th>
      <th style="text-align:right;color:#d97706">Consigne/u</th>
      <th style="text-align:right;color:#d97706">Déduction</th>
    </tr></thead>
    <tbody>${cageotRetourRows}</tbody>
    <tfoot><tr style="background:#fffbeb">
      <td colspan="3" style="text-align:right;font-weight:600;color:#d97706">Total déduction</td>
      <td style="text-align:right;font-weight:700;font-size:15px;color:#d97706">−${(v.consigneCageotRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
    </tr></tfoot>
  </table>`
    : "";

  const sousTotalHT =
    (v.total ?? 0) + (v.consigneRendue ?? 0) + (v.consigneCageotRendue ?? 0);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Facture N° ${v.id} — ${escapeHtml(v.client?.nom)}</title>
<style>
  body{font-family:Arial,sans-serif;margin:48px;color:#111}
  h1{font-size:26px;margin:0 0 4px}h2{font-size:16px;color:#555;font-weight:normal;margin:0 0 28px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
  .meta-box{background:#f8f8f8;border:1px solid #e0e0e0;padding:14px 18px;border-radius:6px}
  .meta-box p{margin:4px 0;font-size:14px}.meta-box .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#f0f0f0;border:1px solid #ddd;padding:9px 12px;text-align:left;font-size:13px}
  td{border:1px solid #ddd;padding:9px 12px;font-size:13px}
  .total-row td{font-size:15px;background:#f5f5f5}
  .net-total td{font-size:16px;background:#e8f5e9}
  .footer{margin-top:48px;font-size:12px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px}
  @media print{body{margin:24px}}
</style></head><body>
<h1>Depot-Star</h1><h2>Facture N° ${v.id}</h2>
<div class="meta-grid">
  <div class="meta-box"><div class="label">Client</div>
    <p><strong>${escapeHtml(v.client?.nom)}</strong></p>
    ${v.client?.adresse ? `<p>${escapeHtml(v.client.adresse)}</p>` : ""}
    ${v.client?.telephone ? `<p>Tél. ${escapeHtml(v.client.telephone)}</p>` : ""}
  </div>
  <div class="meta-box"><div class="label">Vendeur · Date</div>
    <p>${escapeHtml(v.vendeur)}</p>
    <p>${new Date(v.date).toLocaleString("fr-FR")}</p>
  </div>
</div>
<table>
  <thead><tr>
    <th>Article</th><th style="text-align:right">Qté</th>
    <th style="text-align:right">Prix unit.</th><th style="text-align:right">Consigne</th>
    <th style="text-align:right">Total ligne</th>
  </tr></thead>
  <tbody>${lignesRows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Sous-total articles</td>
      <td style="text-align:right">${sousTotalHT.toLocaleString("fr-FR")} Ar</td>
    </tr>
  </tfoot>
</table>
${retourSection}
${cageotRetourSection}
<table style="margin-top:${hasRetour || hasCageotRetour ? "8px" : "0"}">
  <tfoot>
    ${
      hasRetour
        ? `<tr class="total-row">
      <td colspan="4" style="text-align:right;color:#16a34a">↩ Déduction consignes rendues</td>
      <td style="text-align:right;color:#16a34a">−${(v.consigneRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
    </tr>`
        : ""
    }
    ${
      hasCageotRetour
        ? `<tr class="total-row">
      <td colspan="4" style="text-align:right;color:#d97706">↩ Déduction cageots rendus</td>
      <td style="text-align:right;color:#d97706">−${(v.consigneCageotRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
    </tr>`
        : ""
    }
    <tr class="net-total">
      <td colspan="4" style="text-align:right"><strong>TOTAL NET À PAYER</strong></td>
      <td style="text-align:right"><strong>${(v.total ?? 0).toLocaleString("fr-FR")} Ar</strong></td>
    </tr>
  </tfoot>
</table>
<div class="footer">Merci de votre confiance — Depot-Star</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

function openPrint(v) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildInvoiceHTML(v));
  win.document.close();
}

// ── Row détail expandé ────────────────────────────────────────────────────────

function VenteRow({ vente }) {
  const [open, setOpen] = useState(false);
  const hasRetour =
    Array.isArray(vente.consignesRetour) && vente.consignesRetour.length > 0;

  return (
    <>
      {/* Ligne principale */}
      <tr
        className="hover cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="w-6">
          {open ? (
            <ChevronDown className="size-4 text-base-content/50" />
          ) : (
            <ChevronRight className="size-4 text-base-content/50" />
          )}
        </td>
        <td className="tabular-nums font-mono text-xs text-base-content/60">
          #{vente.id}
        </td>
        <td>{fmtDate(vente.date)}</td>
        <td className="font-medium">{vente.client?.nom ?? "—"}</td>
        <td>{vente.vendeur}</td>
        <td className="text-center">
          <span className="badge badge-ghost badge-sm">
            {vente.lignes?.length ?? 0}
          </span>
        </td>
        <td className="text-right">
          {hasRetour && (
            <span className="badge badge-success badge-xs mr-1 gap-1">
              <RotateCcw className="size-2.5" />
            </span>
          )}
        </td>
        <td className="text-right tabular-nums font-semibold text-primary">
          {fmt(vente.total)}
        </td>
        <td className="text-right">
          <button
            className="btn btn-ghost btn-xs"
            onClick={(e) => {
              e.stopPropagation();
              openPrint(vente);
            }}
            title="Imprimer la facture"
          >
            <Printer className="size-3.5" />
          </button>
        </td>
      </tr>

      {/* Ligne de détail dépliée */}
      {open && (
        <tr>
          <td colSpan={9} className="bg-base-200/60 p-0">
            <div className="p-4 space-y-4">
              {/* Infos client */}
              <div className="text-xs text-base-content/60 flex flex-wrap gap-4">
                {vente.client?.adresse && (
                  <span>📍 {vente.client.adresse}</span>
                )}
                {vente.client?.telephone && (
                  <span>📞 {vente.client.telephone}</span>
                )}
              </div>

              {/* Lignes articles */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-1">
                  Articles vendus
                </p>
                <table className="table table-xs w-full">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th className="text-right">Qté</th>
                      <th className="text-right">P.U.</th>
                      <th className="text-right">Consigne</th>
                      <th className="text-right">Total ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(vente.lignes ?? []).map((l) => (
                      <tr key={l.id}>
                        <td>{l.articleNom}</td>
                        <td className="text-right tabular-nums">
                          {l.quantite}
                        </td>
                        <td className="text-right tabular-nums">
                          {l.prixUnitaire.toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="text-right tabular-nums">
                          {l.prixConsigne > 0 ? (
                            <span className="text-warning">
                              +
                              {(l.prixConsigne * l.quantite).toLocaleString(
                                "fr-FR",
                              )}{" "}
                              Ar
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {l.prixTotal.toLocaleString("fr-FR")} Ar
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {hasRetour && (
                      <>
                        <tr className="text-base-content/60 text-xs">
                          <td colSpan={4} className="text-right">
                            Sous-total
                          </td>
                          <td className="text-right tabular-nums">
                            {(
                              (vente.total ?? 0) + (vente.consigneRendue ?? 0)
                            ).toLocaleString("fr-FR")}{" "}
                            Ar
                          </td>
                        </tr>
                        <tr className="text-success text-xs">
                          <td colSpan={4} className="text-right">
                            ↩ Déduction consignes
                          </td>
                          <td className="text-right tabular-nums">
                            −
                            {(vente.consigneRendue ?? 0).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            Ar
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="font-bold">
                      <td colSpan={4} className="text-right">
                        TOTAL NET
                      </td>
                      <td className="text-right tabular-nums text-primary">
                        {fmt(vente.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Détail retours consigne */}
              {hasRetour && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-success/70 mb-1 flex items-center gap-1">
                    <RotateCcw className="size-3" />
                    Bouteilles rendues
                  </p>
                  <table className="table table-xs w-full">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th className="text-right">Qté rendue</th>
                        <th className="text-right">Consigne/u</th>
                        <th className="text-right">Déduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vente.consignesRetour.map((r) => (
                        <tr key={r.id}>
                          <td>{r.articleNom}</td>
                          <td className="text-right tabular-nums">
                            {r.quantite}
                          </td>
                          <td className="text-right tabular-nums">
                            {r.prixConsigne.toLocaleString("fr-FR")} Ar
                          </td>
                          <td className="text-right tabular-nums text-success font-medium">
                            −{r.montant.toLocaleString("fr-FR")} Ar
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function VentesListPage() {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getVentes()
      .then(setVentes)
      .catch(() => setError("Impossible de charger les ventes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ventes;
    return ventes.filter(
      (v) =>
        String(v.id).includes(q) ||
        v.client?.nom?.toLowerCase().includes(q) ||
        v.vendeur?.toLowerCase().includes(q) ||
        (v.lignes ?? []).some((l) => l.articleNom?.toLowerCase().includes(q)),
    );
  }, [ventes, search]);

  const totalCA = useMemo(
    () => filtered.reduce((s, v) => s + (v.total ?? 0), 0),
    [filtered],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="size-7 text-primary" />
        <h1 className="text-2xl font-bold">Historique des ventes</h1>
        <span className="badge badge-ghost ml-auto">
          {filtered.length} vente(s)
        </span>
      </div>

      {/* Erreur */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Barre de recherche + KPI CA */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="input input-bordered flex items-center gap-2 flex-1 min-w-60">
          <Search className="size-4 text-base-content/40" />
          <input
            type="text"
            placeholder="Rechercher client, vendeur, article, #id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="grow"
          />
        </label>
        <div className="card bg-primary text-primary-content shadow-sm">
          <div className="card-body p-3 flex-row items-center gap-2">
            <TrendingUp className="size-4" />
            <span className="text-sm font-semibold">
              CA affiché : {totalCA.toLocaleString("fr-FR")} Ar
            </span>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card bg-base-100 border border-base-300 shadow-sm overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="w-6"></th>
              <th>#</th>
              <th>Date</th>
              <th>Client</th>
              <th>Vendeur</th>
              <th className="text-center">Articles</th>
              <th></th>
              <th className="text-right">Total net</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-base-content/40 py-12"
                >
                  Aucune vente trouvée
                </td>
              </tr>
            ) : (
              filtered.map((v) => <VenteRow key={v.id} vente={v} />)
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="font-bold text-base">
                <td colSpan={7} className="text-right">
                  Total CA ({filtered.length} ventes)
                </td>
                <td className="text-right text-primary tabular-nums">
                  {totalCA.toLocaleString("fr-FR")} Ar
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-xs text-base-content/40 text-center">
        Cliquez sur une ligne pour voir le détail · ★ = article consigné ·{" "}
        <RotateCcw className="size-3 inline" /> = bouteilles rendues
      </p>
    </div>
  );
}
