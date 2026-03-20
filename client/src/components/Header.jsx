import { CheckIcon, ShoppingCart, StoreIcon } from "lucide-react";
import { Link } from "react-router-dom";

function Header() {
  return (
    <div className="navbar bg-base-100">
      <div className="max-w-7xl mx-auto w-full px-3 flex justify-between items-center">
        <div>
          <Link to="/" className="btn btn-ghost normal-case text-xl">
            Depot Sart
          </Link>
        </div>
        <div className="flex gap-2">
          <Link to="/vente" className="btn btn-ghost">
            <ShoppingCart className="size-5" />
            Vente
          </Link>
          <Link to="/stock" className="btn btn-ghost">
            <StoreIcon className="size-5" />
            Stock
          </Link>
          <Link to="/inventory" className="btn btn-ghost">
            <CheckIcon className="size-5" />
            Inventaire
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Header;
