import {
  CheckIcon,
  ShoppingCart,
  StoreIcon,
  User,
  KeyRound,
  LogOut,
  UserPlusIcon,
  ShoppingBag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="navbar bg-base-100">
      <div className="max-w-7xl mx-auto w-full px-3 flex justify-between items-center">
        <div>
          <Link to="/" className="btn btn-ghost normal-case text-xl">
            Depot Sart
          </Link>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/vente" className="btn btn-ghost">
            <ShoppingCart className="size-5" />
            Vente
          </Link>
          {user.role === "ADMIN" && (
            <>
              <Link to="/stock" className="btn btn-ghost">
                <StoreIcon className="size-5" />
                Stock
              </Link>
              <Link to="/appro" className="btn btn-ghost">
                <ShoppingBag className="size-5" />
                Appro
              </Link>
              <Link to="/inventory" className="btn btn-ghost">
                <CheckIcon className="size-5" />
                Inventaire
              </Link>
            </>
          )}

          {/* Menu utilisateur */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost gap-2">
              <User className="size-5" />
              <span className="hidden sm:inline text-sm font-medium">
                {user.alias || "Compte"}
              </span>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-lg z-50 w-52 p-2 mt-1 border border-base-200"
            >
              <li className="menu-title px-2 py-1 text-xs text-base-content/50">
                {user.prenom} {user.nom}
              </li>
              <div className="divider my-0" />
              <li>
                <Link to="/change-password" className="gap-2">
                  <KeyRound className="size-4" />
                  Hanova mot de passe
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="gap-2 text-error">
                  <LogOut className="size-4" />
                  Déconnexion
                </button>
              </li>
              <div className="divider my-0" />

              {/* Affiche la section admin uniquement si l'utilisateur est admin */}
              {user.role === "ADMIN" && (
                <li>
                  <Link to="/register" className="gap-2 text-success">
                    <UserPlusIcon className="size-4" />
                    Hamonrona mpiasa vaovao
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
