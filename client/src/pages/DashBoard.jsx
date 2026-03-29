import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Award,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getDashboardStats } from "../api/dashboardService";

const COLOR_CLASSES = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary" },
  accent: { bg: "bg-accent/10", text: "text-accent" },
  info: { bg: "bg-info/10", text: "text-info" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  error: { bg: "bg-error/10", text: "text-error" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(n);
}

function shortDate(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = "primary" }) {
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.primary;

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 flex-row items-center gap-4">
        <div className={`p-3 rounded-xl ${classes.bg} ${classes.text}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-base-content/60">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-base-content/50">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashBoard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) =>
        setError(
          err.response?.status === 401
            ? "Accès refusé au DashBoard."
            : "Impossible de charger le Dashboard.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert alert-error max-w-md">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const {
    kpis,
    ventesParJour,
    topVendeurs,
    topArticles,
    stockFaible,
    topClients,
    repartitionBottle,
    caParVendeur7j,
    vendeurs7j,
  } = stats;

  const deltaMois =
    kpis.caMoisPrecedent > 0
      ? Math.round(
          ((kpis.caMois - kpis.caMoisPrecedent) / kpis.caMoisPrecedent) * 100,
        )
      : null;

  const VENDEUR_COLORS = [
    "#570df8",
    "#f000b8",
    "#36d399",
    "#fbbd23",
    "#3abff8",
    "#f87272",
  ];
  const BOTTLE_COLORS = ["#3abff8", "#36d399"];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="CA du jour"
          value={fmt(kpis.caJour)}
          sub={`${kpis.nbVentesJour} vente(s)`}
          color="primary"
        />
        <KpiCard
          icon={TrendingUp}
          label="CA du mois"
          value={fmt(kpis.caMois)}
          color="secondary"
        />
        <KpiCard
          icon={ShoppingCart}
          label="CA total"
          value={fmt(kpis.caTotal)}
          sub={`${kpis.nbVentes} ventes`}
          color="accent"
        />
        <KpiCard
          icon={Users}
          label="Clients"
          value={kpis.nbClients}
          color="info"
        />
        <KpiCard
          icon={Package}
          label="Articles"
          value={kpis.nbArticles}
          color="success"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Stock faible (≤5)"
          value={kpis.stockFaibleCount}
          color="warning"
        />
        <KpiCard
          icon={CreditCard}
          label="Panier moyen"
          value={fmt(kpis.panierMoyen)}
          sub={`sur ${kpis.nbVentes} ventes`}
          color="accent"
        />
        <KpiCard
          icon={Package}
          label="Valeur du stock"
          value={fmt(kpis.valeurStock)}
          sub="prix × quantité"
          color="success"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Valeur des emballages"
          value={fmt(kpis.valeurEmballages)}
          sub="consigne × quantité"
          color="info"
        />
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4 flex-row items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                deltaMois === null
                  ? "bg-base-200 text-base-content/40"
                  : deltaMois >= 0
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
              }`}
            >
              {deltaMois === null ? (
                <TrendingUp size={24} />
              ) : deltaMois >= 0 ? (
                <ArrowUpRight size={24} />
              ) : (
                <ArrowDownRight size={24} />
              )}
            </div>
            <div>
              <p className="text-sm text-base-content/60">
                CA vs mois précédent
              </p>
              <p className="text-xl font-bold">
                {deltaMois === null
                  ? "—"
                  : `${deltaMois > 0 ? "+" : ""}${deltaMois}%`}
              </p>
              <p className="text-xs text-base-content/50">
                {fmt(kpis.caMoisPrecedent)} le mois dernier
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Courbe CA 30 jours ───────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-base mb-2">CA sur 30 jours</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={ventesParJour}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11 }} // Réduit la taille des ticks de l'axe Y pour une meilleure lisibilité
                tickFormatter={(v) =>
                  v < 1000 // Affiche les valeurs inférieures à 1000 normalement, sinon en format "k" avec une décimale
                    ? `${v}`
                    : `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`
                }
              />
              <Tooltip
                formatter={(v) => [fmt(v), "CA"]}
                labelFormatter={(l) => `Date : ${l}`}
              />
              <Line
                type="monotone"
                dataKey="ca"
                stroke="#570df8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Nb ventes 30 jours ───────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-base mb-2">
            Nombre de ventes sur 30 jours
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={ventesParJour}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, "Ventes"]}
                labelFormatter={(l) => `Date : ${l}`}
              />
              <Bar dataKey="nbVentes" fill="#f000b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── CA par vendeur 7 jours ────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-base mb-2">
            CA par vendeur (7 derniers jours)
          </h2>
          {caParVendeur7j.length === 0 || vendeurs7j.length === 0 ? (
            <p className="text-sm text-base-content/50">
              Aucune vente sur les 7 derniers jours.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={caParVendeur7j}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  labelFormatter={(l) => `Date : ${l}`}
                />
                <Legend />
                {vendeurs7j.map((vendeur, i) => (
                  <Bar
                    key={vendeur}
                    dataKey={vendeur}
                    stackId="a"
                    fill={VENDEUR_COLORS[i % VENDEUR_COLORS.length]}
                    radius={
                      i === vendeurs7j.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Top vendeurs ─────────────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base mb-2">
              <Award size={18} className="text-warning" /> Top vendeurs
            </h2>
            {topVendeurs.length === 0 ? (
              <p className="text-sm text-base-content/50">
                Aucune vente enregistrée.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Vendeur</th>
                      <th className="text-right">CA</th>
                      <th className="text-right">Ventes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVendeurs.map((v, i) => (
                      <tr key={v.vendeur}>
                        <td>
                          <span
                            className={`badge badge-sm ${i === 0 ? "badge-warning" : i === 1 ? "badge-ghost" : "badge-ghost"}`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="font-medium">{v.vendeur}</td>
                        <td className="text-right tabular-nums">{fmt(v.ca)}</td>
                        <td className="text-right tabular-nums">
                          {v.nbVentes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Top articles ─────────────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base mb-2">
              <Package size={18} className="text-success" /> Top 5 articles
              vendus
            </h2>
            {topArticles.length === 0 ? (
              <p className="text-sm text-base-content/50">
                Aucune vente enregistrée.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topArticles}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip formatter={(v) => [v, "Quantité"]} />
                  <Bar
                    dataKey="quantite"
                    fill="#36d399"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Top clients ──────────────────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base mb-2">
              <Users size={18} className="text-info" /> Top 5 clients
            </h2>
            {topClients.length === 0 ? (
              <p className="text-sm text-base-content/50">
                Aucune vente enregistrée.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Client</th>
                      <th className="text-right">CA</th>
                      <th className="text-right">Commandes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((c, i) => (
                      <tr key={c.id}>
                        <td>
                          <span
                            className={`badge badge-sm ${i === 0 ? "badge-info" : "badge-ghost"}`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="font-medium">{c.nom}</td>
                        <td className="text-right tabular-nums">{fmt(c.ca)}</td>
                        <td className="text-right tabular-nums">
                          {c.nbVentes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Répartition bouteilles ───────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base mb-2">
              <Package size={18} className="text-info" /> Répartition stock par
              type
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={repartitionBottle}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ type, percent }) =>
                    `${type} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {repartitionBottle.map((_, i) => (
                    <Cell
                      key={i}
                      fill={BOTTLE_COLORS[i % BOTTLE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v + " articles", name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Alertes stock faible ─────────────────────────────────────────── */}
      {stockFaible.length > 0 && (
        <div className="card bg-base-100 shadow-md border border-warning/30">
          <div className="card-body">
            <h2 className="card-title text-base mb-2 text-warning">
              <AlertTriangle size={18} /> Articles en stock faible (≤ 10 unités)
            </h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Type</th>
                    <th className="text-right">Stock restant</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFaible.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.nom}</td>
                      <td>
                        <span className="badge badge-sm badge-outline">
                          {a.bottleType}
                        </span>
                      </td>
                      <td className="text-right">
                        <span
                          className={`font-bold ${a["quantitéStock"] <= 2 ? "text-error" : "text-warning"}`}
                        >
                          {a["quantitéStock"]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashBoard;
