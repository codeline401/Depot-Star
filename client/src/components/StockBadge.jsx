export default function StockBadge({ qty }) {
  if (qty === 0)
    return <span className="badge badge-error badge-sm">Rupture</span>;
  if (qty <= 5)
    return <span className="badge badge-warning badge-sm">Stock bas</span>;
  return <span className="badge badge-success badge-sm">OK</span>;
}
