// ─── Constante partagée ───────────────────────────────────────────────────────
export const CAGEOT_CONSIGNE = 8000; // Ar — consigne par cageot

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Échappe les caractères HTML pour éviter les injections dans la facture. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Génération HTML de la facture ────────────────────────────────────────────

/**
 * Construit le HTML complet d'une facture à partir des données retournées
 * par le backend (objet `invoice`).
 *
 * Structure attendue :
 *   invoice.id, invoice.total, invoice.consigneRendue?, invoice.consigneCageotRendue?
 *   invoice.client  { nom, adresse?, telephone? }
 *   invoice.vendeur, invoice.date
 *   invoice.lignes[]  { article { nom, bottleType, aConsigner, prixConsigne },
 *                       quantite, prixUnitaire, prixTotal,
 *                       consigne, consigneCageot?, qteCageots? }
 *   invoice.consignesRetour[]  { articleNom, quantite, prixConsigne, montant }
 *   invoice.cageotsRetour[]    { capacite, quantite, montant }
 */
export function buildInvoiceHTML(invoice) {
  // ── 1. Lignes articles ──────────────────────────────────────────────────────
  const lignesRows = invoice.lignes
    .map((l) => {
      const prixConsigneUnitaire =
        l.article.aConsigner && l.quantite > 0 ? l.consigne / l.quantite : 0;

      const cageotInfo =
        (l.consigneCageot ?? 0) > 0
          ? `<br/><span style="font-size:11px; color:#d97706">${l.qteCageots ?? 0} cageot${(l.qteCageots ?? 0) > 1 ? "s" : ""} × ${CAGEOT_CONSIGNE.toLocaleString("fr-FR")} Ar = ${(l.consigneCageot ?? 0).toLocaleString("fr-FR")} Ar</span>`
          : "";

      return `<tr>
          <td>${escapeHtml(l.article.nom)}</td>
          <td style="text-align:center">${escapeHtml(l.article.bottleType)}</td>
          <td style="text-align:center">${l.article.aConsigner ? "Oui (+" + prixConsigneUnitaire.toLocaleString("fr-FR") + " Ar)" : "Non"}</td>
          <td style="text-align:right">${l.quantite}</td>
          <td style="text-align:right">${l.prixUnitaire.toLocaleString("fr-FR")} Ar</td>
          <td style="text-align:right">${l.consigne > 0 ? l.consigne.toLocaleString("fr-FR") + " Ar" + cageotInfo : "—"}</td>
          <td style="text-align:right"><strong>${l.prixTotal.toLocaleString("fr-FR")} Ar</strong></td>
        </tr>`;
    })
    .join("");

  // ── 2. Section retour bouteilles ────────────────────────────────────────────
  const hasRetour =
    Array.isArray(invoice.consignesRetour) &&
    invoice.consignesRetour.length > 0;

  const retourRows = hasRetour
    ? invoice.consignesRetour
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
    ? `<h3 style="font-size:15px; margin: 28px 0 10px; color:#15803d; display:flex; align-items:center; gap:6px;">
    &#x21A9; Bouteilles rendues par le client
  </h3>
  <table>
    <thead>
      <tr style="background:#f0fdf4;">
        <th style="color:#15803d">Article</th>
        <th style="text-align:right; color:#15803d">Qté rendue</th>
        <th style="text-align:right; color:#15803d">Consigne/u</th>
        <th style="text-align:right; color:#15803d">Déduction</th>
      </tr>
    </thead>
    <tbody>${retourRows}</tbody>
    <tfoot>
      <tr style="background:#f0fdf4;">
        <td colspan="3" style="text-align:right; font-weight:600; color:#15803d">Total déduction consignes bouteilles</td>
        <td style="text-align:right; font-weight:700; font-size:15px; color:#15803d">−${(invoice.consigneRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
      </tr>
    </tfoot>
  </table>`
    : "";

  // ── 3. Section retour cageots ───────────────────────────────────────────────
  const hasCageotRetour =
    Array.isArray(invoice.cageotsRetour) && invoice.cageotsRetour.length > 0;

  const cageotRetourRows = hasCageotRetour
    ? invoice.cageotsRetour
        .map(
          (r) => `<tr>
          <td>Cageot ${r.capacite} bouteilles</td>
          <td style="text-align:right">${r.quantite}</td>
          <td style="text-align:right">${CAGEOT_CONSIGNE.toLocaleString("fr-FR")} Ar</td>
          <td style="text-align:right; color:#d97706; font-weight:600">−${r.montant.toLocaleString("fr-FR")} Ar</td>
        </tr>`,
        )
        .join("")
    : "";

  const cageotRetourSection = hasCageotRetour
    ? `<h3 style="font-size:15px; margin: 28px 0 10px; color:#d97706; display:flex; align-items:center; gap:6px;">
    &#x21A9; Cageots rendus par le client
  </h3>
  <table>
    <thead>
      <tr style="background:#fffbeb;">
        <th style="color:#d97706">Cageot</th>
        <th style="text-align:right; color:#d97706">Qté rendue</th>
        <th style="text-align:right; color:#d97706">Consigne/u</th>
        <th style="text-align:right; color:#d97706">Déduction</th>
      </tr>
    </thead>
    <tbody>${cageotRetourRows}</tbody>
    <tfoot>
      <tr style="background:#fffbeb;">
        <td colspan="3" style="text-align:right; font-weight:600; color:#d97706">Total déduction consignes cageots</td>
        <td style="text-align:right; font-weight:700; font-size:15px; color:#d97706">−${(invoice.consigneCageotRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
      </tr>
    </tfoot>
  </table>`
    : "";

  // ── 4. HTML complet ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture N° ${invoice.id} — ${escapeHtml(invoice.client.nom)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 48px; color: #111; }
    h1 { font-size: 26px; margin: 0 0 4px; }
    h2 { font-size: 16px; color: #555; font-weight: normal; margin: 0 0 28px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .meta-box { background: #f8f8f8; border: 1px solid #e0e0e0; padding: 14px 18px; border-radius: 6px; }
    .meta-box p { margin: 4px 0; font-size: 14px; }
    .meta-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f0f0f0; border: 1px solid #ddd; padding: 9px 12px; text-align: left; font-size: 13px; }
    td { border: 1px solid #ddd; padding: 9px 12px; font-size: 13px; }
    .total-row td { font-size: 15px; background: #f5f5f5; }
    .net-total td { font-size: 16px; background: #e8f5e9; }
    .footer { margin-top: 48px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { margin: 24px; } }
  </style>
</head>
<body>
  <h1>Depot-Star</h1>
  <h2>Facture N° ${invoice.id}</h2>
  <div class="meta-grid">
    <div class="meta-box">
      <div class="label">Client</div>
      <p><strong>${escapeHtml(invoice.client.nom)}</strong></p>
      ${invoice.client.adresse ? `<p>${escapeHtml(invoice.client.adresse)}</p>` : ""}
      ${invoice.client.telephone ? `<p>Tél. ${escapeHtml(invoice.client.telephone)}</p>` : ""}
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
        <td colspan="6" style="text-align:right">Sous-total articles</td>
        <td style="text-align:right">${(invoice.total + (invoice.consigneRendue ?? 0)).toLocaleString("fr-FR")} Ar</td>
      </tr>
    </tfoot>
  </table>

  ${retourSection}
  ${cageotRetourSection}

  <table style="margin-top: ${hasRetour || hasCageotRetour ? "8px" : "0"}">
    <tfoot>
      ${
        hasRetour
          ? `<tr class="total-row">
        <td colspan="6" style="text-align:right; color:#16a34a">↩ Déduction consignes bouteilles rendues</td>
        <td style="text-align:right; color:#16a34a">−${(invoice.consigneRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
      </tr>`
          : ""
      }
      ${
        hasCageotRetour
          ? `<tr class="total-row">
        <td colspan="6" style="text-align:right; color:#d97706">↩ Déduction consignes cageots rendus</td>
        <td style="text-align:right; color:#d97706">−${(invoice.consigneCageotRendue ?? 0).toLocaleString("fr-FR")} Ar</td>
      </tr>`
          : ""
      }
      <tr class="net-total">
        <td colspan="6" style="text-align:right"><strong>TOTAL NET À PAYER</strong></td>
        <td style="text-align:right"><strong>${invoice.total.toLocaleString("fr-FR")} Ar</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">Merci de votre confiance — Depot-Star</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

// ─── Impression ───────────────────────────────────────────────────────────────

/** Ouvre une nouvelle fenêtre, y écrit la facture HTML et lance l'impression. */
export function openPrintWindow(invoice) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildInvoiceHTML(invoice));
  win.document.close();
}
