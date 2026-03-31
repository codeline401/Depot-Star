import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  ClipboardList,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { getAllAppros } from "../api/approService";

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

// ── ApproRow ──────────────────────────────────────────────────────────────────

function ApproRow({ appro }) {
  const [open, setOpen] = useState(false);

  return (
    <>
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
          #{appro.id}
        </td>
        <td className="tabular-nums">{fmtDate(appro.date)}</td>
        <td className="text-center">
          {appro.status === "VALIDE" ? (
            <span className="badge badge-success badge-sm gap-1">
              <CheckCircle className="size-3" /> Validé
            </span>
          ) : (
            <span className="badge badge-warning badge-sm gap-1">
              <Clock className="size-3" /> Vérifié
            </span>
          )}
        </td>
        <td className="text-center tabular-nums">
          <span className="badge badge-ghost badge-sm">
            {appro.lignes?.length ?? 0}
          </span>
        </td>
        <td className="text-right tabular-nums">
          {appro.dateValidation ? fmtDate(appro.dateValidation) : "—"}
        </td>
        <td className="text-right tabular-nums font-semibold text-warning">
          {fmt(appro.coutTotal)}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="bg-base-200/60 p-0">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
                Détail des articles commandés
              </p>
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="text-right">Qté commandée</th>
                    <th className="text-right">Prix unitaire</th>
                    <th className="text-right">Coût ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {(appro.lignes ?? []).map((l) => (
                    <tr key={l.id}>
                      <td>{l.articleNom}</td>
                      <td className="text-right tabular-nums">
                        {l.qteCommandee}
                      </td>
                      <td className="text-right tabular-nums">
                        {l.prixUnitaire.toLocaleString("fr-FR")} Ar
                      </td>
                      <td className="text-right tabular-nums font-medium">
                        {l.coutLigne.toLocaleString("fr-FR")} Ar
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="text-right font-semibold text-base-content/70"
                    >
                      Total
                    </td>
                    <td className="text-right tabular-nums font-bold text-warning">
                      {appro.coutTotal.toLocaleString("fr-FR")} Ar
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApprosListPage() {
  const [appros, setAppros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtre, setFiltre] = useState("TOUS"); // TOUS | VALIDE | VERIFIE

  useEffect(() => {
    getAllAppros()
      .then(setAppros)
      .catch(() =>
        setError("Impossible de charger l'historique des approvisionnements."),
      )
      .finally(() => setLoading(false));
  }, []);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const valides = appros.filter((a) => a.status === "VALIDE");
    const enAttente = appros.filter((a) => a.status === "VERIFIE");
    return {
      totalValide: valides.reduce((s, a) => s + a.coutTotal, 0),
      totalEnAttente: enAttente.reduce((s, a) => s + a.coutTotal, 0),
      nbValide: valides.length,
      nbEnAttente: enAttente.length,
      nbTotal: appros.length,
    };
  }, [appros]);

  // ── Filtrage ─────────────────────────────────────────────────────────────────
  const approsAffiches = useMemo(
    () =>
      filtre === "TOUS" ? appros : appros.filter((a) => a.status === filtre),
    [appros, filtre],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-warning" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClipboardList className="size-7 text-warning" />
        <h1 className="text-2xl font-bold">
          Historique des approvisionnements
        </h1>
      </div>

      {/* KPI cards */}
      {appros.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-base-200 text-base-content/60">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Total appros</p>
                <p className="text-lg font-bold">{kpis.nbTotal}</p>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-success/10 text-success">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Validés</p>
                <p className="text-lg font-bold">{kpis.nbValide}</p>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-error/10 text-error">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="text-xs text-base-content/50">
                  Total dépensé (validé)
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {fmt(kpis.totalValide)}
                </p>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 flex-row items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/10 text-warning">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-xs text-base-content/50">
                  En attente validation
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {fmt(kpis.totalEnAttente)}
                </p>
                <p className="text-xs text-base-content/40">
                  {kpis.nbEnAttente} appro(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtre statut */}
      {appros.length > 0 && (
        <div className="flex gap-2">
          {["TOUS", "VALIDE", "VERIFIE"].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filtre === s ? "btn-warning" : "btn-ghost"}`}
              onClick={() => setFiltre(s)}
            >
              {s === "TOUS"
                ? "Tous"
                : s === "VALIDE"
                  ? "Validés"
                  : "En attente"}
              <span className="badge badge-sm ml-1">
                {s === "TOUS"
                  ? kpis.nbTotal
                  : s === "VALIDE"
                    ? kpis.nbValide
                    : kpis.nbEnAttente}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tableau */}
      {appros.length === 0 ? (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body text-center text-base-content/50 py-16">
            <ClipboardList className="size-12 mx-auto mb-3 opacity-30" />
            <p>Aucun approvisionnement enregistré.</p>
          </div>
        </div>
      ) : approsAffiches.length === 0 ? (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body text-center text-base-content/50 py-10">
            <p>Aucun approvisionnement pour ce filtre.</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-0">
            <div className="overflow-x-auto rounded-box">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th />
                    <th>#</th>
                    <th>Date création</th>
                    <th className="text-center">Statut</th>
                    <th className="text-center">Articles</th>
                    <th className="text-right">Date validation</th>
                    <th className="text-right">Coût total</th>
                  </tr>
                </thead>
                <tbody>
                  {approsAffiches.map((a) => (
                    <ApproRow key={a.id} appro={a} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={6} className="text-right text-base-content/60">
                      Total affiché
                    </td>
                    <td className="text-right tabular-nums text-warning">
                      {fmt(approsAffiches.reduce((s, a) => s + a.coutTotal, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
