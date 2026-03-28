import { AlertTriangle, Package, TrendingUp, Truck } from "lucide-react";

export default function StatsCards({ articles }) {
  const items = articles ?? [];
  const totalValeur = items.reduce(
    (sum, a) => sum + a.prix * (a["quantitéStock"] ?? 0),
    0,
  );
  const consigneCount = items.filter((a) => a.aConsigner).length;
  const ruptureCount = items.filter(
    (a) => (a["quantitéStock"] ?? 0) === 0,
  ).length;
  const lowStockCount = items.filter(
    (a) => (a["quantitéStock"] ?? 0) > 0 && (a["quantitéStock"] ?? 0) <= 5,
  ).length;

  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
      <div className="stat">
        <div className="stat-figure text-primary">
          <Package className="size-8" />
        </div>
        <div className="stat-title">Références</div>
        <div className="stat-value text-primary">{items.length}</div>
        <div className="stat-desc">produits enregistrés</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-secondary">
          <TrendingUp className="size-8" />
        </div>
        <div className="stat-title">Valeur stock</div>
        <div className="stat-value text-secondary">
          {totalValeur.toFixed(2)} Ar
        </div>
        <div className="stat-desc">prix × quantité</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-accent">
          <Truck className="size-8" />
        </div>
        <div className="stat-title">Consignés</div>
        <div className="stat-value text-accent">{consigneCount}</div>
        <div className="stat-desc">articles à consigne</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-warning">
          <AlertTriangle className="size-8" />
        </div>
        <div className="stat-title">Stock bas</div>
        <div className="stat-value text-warning">{lowStockCount}</div>
        <div className="stat-desc">≤ 5 unités restantes</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-error">
          <AlertTriangle className="size-8" />
        </div>
        <div className="stat-title">Ruptures</div>
        <div className="stat-value text-error">{ruptureCount}</div>
        <div className="stat-desc">quantité à zéro</div>
      </div>
    </div>
  );
}
