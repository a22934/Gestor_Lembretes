import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase/config";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardMain from "./pages/DashboardMain";
import PiscinasPage from "./pages/PiscinasPage";
import JardinsPage from "./pages/JardinsPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Dashboard principal (resumo + botões) */}
      <Route path="/dashboard" element={user ? <DashboardMain /> : <Navigate to="/login" />} />

      {/* Páginas por categoria */}
      <Route path="/dashboard/piscinas" element={user ? <PiscinasPage /> : <Navigate to="/login" />} />
      <Route path="/dashboard/jardins" element={user ? <JardinsPage /> : <Navigate to="/login" />} />

      {/* catch-all -> se não logado vai para login */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}
