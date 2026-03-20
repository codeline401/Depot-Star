import DashBoard from "./pages/DashBoard";
import StockPage from "./pages/StockPage";
import VentePage from "./pages/VentePage";
import InventoryPage from "./pages/InventoryPage";
import { Routes, Route } from "react-router-dom";

import "./App.css";
import Header from "./components/header";

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<DashBoard />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/vente" element={<VentePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        {/**Route to StockPage */}
        {/**Route to VentePage */}
      </Routes>
    </>
  );
}

export default App;
