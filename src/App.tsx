import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Onboarding from "@/pages/Onboarding";
import { Layout } from "@/components/Layout";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Movements from "@/pages/Movements";
import Income from "@/pages/Income";
import Expenses from "@/pages/Expenses";
import Assets from "@/pages/Assets";
import Investments from "@/pages/Investments";
import Savings from "@/pages/Savings";
import Goals from "@/pages/Goals";
import Settings, { SettingsHome } from "@/pages/Settings";
import SettingsCategories from "@/pages/SettingsCategories";
import SettingsAssets from "@/pages/SettingsAssets";
import SettingsIBKR from "@/pages/SettingsIBKR";
import SettingsBinance from "@/pages/SettingsBinance";
import IBKR from "@/pages/IBKR";
import PublicRoute from "@/components/PublicRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ruta de autenticación (no protegida) */}
          {/* Rutas públicas - solo accesibles sin sesión */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          {/* Rutas protegidas con layout y sidebar */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="/movements" element={<Movements />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/ibkr" element={<IBKR />} />
              <Route path="/savings" element={<Savings />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/settings" element={<Settings />}>
                <Route index element={<SettingsHome />} />
                <Route path="categories" element={<SettingsCategories />} />
                <Route path="assets" element={<SettingsAssets />} />
                <Route path="ibkr" element={<SettingsIBKR />} />
                <Route path="binance" element={<SettingsBinance />} />
              </Route>
              <Route
                path="/settings/categories"
                element={<SettingsCategories />}
              />
              <Route path="/settings/assets" element={<SettingsAssets />} />
            </Route>
          </Route>

          {/* Redirigir cualquier otra ruta a la raíz */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

