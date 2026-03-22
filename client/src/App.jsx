import DashBoard from "./pages/DashBoard";
import StockPage from "./pages/StockPage";
import VentePage from "./pages/VentePage";
import InventoryPage from "./pages/InventoryPage";
import { Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProtecteRoute from "./components/ProtecteRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";

import "./App.css";
import Header from "./components/header";

function App() {
  const location = useLocation(); // Hook pour obtenir la localisation actuelle (URL) de l'application
  const isLoginPage =
    location.pathname === "/login" || location.pathname === "/change-password"; // Vérifie si la page actuelle est la page de login ou de changement de mot de passe
  return (
    <>
      {!isLoginPage && <Header />}{" "}
      {/* Affiche le header uniquement si ce n'est pas la page de login */}
      <Routes>
        <Route
          path="/"
          element={
            <ProtecteRoute>
              <DashBoard />
            </ProtecteRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtecteRoute>
              <StockPage />
            </ProtecteRoute>
          }
        />
        <Route
          path="/vente"
          element={
            <ProtecteRoute>
              <VentePage />
            </ProtecteRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtecteRoute>
              <InventoryPage />
            </ProtecteRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        {/**Route to StockPage */}
        {/**Route to VentePage */}
      </Routes>
    </>
  );
}

export default App;
