import DashBoard from "./pages/DashBoard";
import StockPage from "./pages/StockPage";
import VentePage from "./pages/VentePage";
import VentesListPage from "./pages/VentesListPage";
import InventoryPage from "./pages/InventoryPage";
import { Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProtecteRoute from "./components/ProtecteRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import RegisterPage from "./pages/RegisterPage";

import "./App.css";
import Header from "./components/header";
import ApproPage from "./pages/ApproPage";
import ApprosListPage from "./pages/ApprosListPage";

function App() {
  const location = useLocation(); // Hook pour obtenir la localisation actuelle (URL) de l'application
  const isLoginPage =
    location.pathname === "/login" ||
    location.pathname === "/change-password" ||
    location.pathname === "/register"; // Vérifie si la page actuelle est la page de login ou de changement de mot de passe
  return (
    <>
      {!isLoginPage && <Header />}{" "}
      {/* Affiche le header uniquement si ce n'est pas la page de login */}
      <Routes>
        <Route
          path="/"
          element={
            <ProtecteRoute adminOnly>
              <DashBoard />
            </ProtecteRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtecteRoute adminOnly>
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
            <ProtecteRoute adminOnly>
              <InventoryPage />
            </ProtecteRoute>
          }
        />
        <Route
          path="/appro"
          element={
            <ProtecteRoute adminOnly>
              <ApproPage />
            </ProtecteRoute>
          }
        />
        <Route
          path="/appros"
          element={
            <ProtecteRoute adminOnly>
              <ApprosListPage />
            </ProtecteRoute>
          }
        />
        <Route
          path="/ventes"
          element={
            <ProtecteRoute adminOnly>
              <VentesListPage />
            </ProtecteRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route
          path="/register"
          element={
            <ProtecteRoute>
              <RegisterPage />
            </ProtecteRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
