import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Income from "@/pages/Income";
import Expenses from "@/pages/Expenses";
import Assets from "@/pages/Assets";
import Investments from "@/pages/Investments";
import Savings from "@/pages/Savings";
import Goals from "@/pages/Goals";
import Settings from "@/pages/Settings";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ruta de autenticación (no protegida) */}
          <Route path="/auth" element={<Auth />} />

          {/* Rutas protegidas con layout y sidebar */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/savings" element={<Savings />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/settings" element={<Settings />} />
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
