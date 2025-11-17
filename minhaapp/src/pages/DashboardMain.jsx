import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import AddUser from "./AddUser";

export default function DashboardMain() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    piscinas: 0,
    jardins: 0,
    expirados: 0,
  });
  const [expiringUsers, setExpiringUsers] = useState([]); // Lista de a expirar (0-5 dias)
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    const q = query(collection(db, "contacts"), where("userId", "==", auth.currentUser.uid));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const piscinas = docs.filter(d => d.categoria === "Piscinas");
    const jardins = docs.filter(d => d.categoria === "Jardins");

    const hoje = new Date();
    
    // Processar todos os utilizadores para calcular dias restantes
    const usersWithDays = docs.map(d => {
      if (!d.dataExpiracao || typeof d.dataExpiracao.seconds !== "number") return null;
      const exp = new Date(d.dataExpiracao.seconds * 1000);
      // Diferença em dias
      const diff = Math.ceil((exp - hoje) / (1000 * 60 * 60 * 24));
      return { ...d, diasRestantes: diff };
    }).filter(Boolean); // Remove nulos

    // 1. Filtro: Expirados (< 0 dias) - Apenas para contagem
    const countExpirados = usersWithDays.filter(u => u.diasRestantes < 0).length;

    // 2. Filtro: A Expirar (0 a 5 dias) - Para lista e contagem
    const listaAExpirar = usersWithDays.filter(u => u.diasRestantes >= 0 && u.diasRestantes <= 5);
    // Ordenar: Menos dias primeiro
    listaAExpirar.sort((a, b) => a.diasRestantes - b.diasRestantes);

    setCounts({
      piscinas: piscinas.length,
      jardins: jardins.length,
      expirados: countExpirados,
    });
    
    setExpiringUsers(listaAExpirar);

    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Visão geral do sistema</p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={styles.secondaryButton} onClick={() => fetchCounts()}>
            Atualizar
          </button>
          <button style={styles.logoutButton} onClick={handleLogout}>Sair</button>
        </div>
      </header>

      {/* Cartões Principais */}
      <section style={styles.cardsRow}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📘</div>
          <div>
            <div style={styles.cardTitle}>Piscinas</div>
            <div style={styles.cardNumber}>{loading ? "..." : counts.piscinas}</div>
          </div>
          <button style={styles.cardButton} onClick={() => navigate("/dashboard/piscinas")}>Ver Lista</button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>🌿</div>
          <div>
            <div style={styles.cardTitle}>Jardins</div>
            <div style={styles.cardNumber}>{loading ? "..." : counts.jardins}</div>
          </div>
          <button style={styles.cardButton} onClick={() => navigate("/dashboard/jardins")}>Ver Lista</button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>🚫</div>
          <div>
            <div style={styles.cardTitle}>Expirados</div>
            <div style={styles.cardNumber}>{loading ? "..." : counts.expirados}</div>
          </div>
        </div>
      </section>

      {/* SECÇÃO: Clientes A Expirar em breve (Amarelo) */}
      {expiringUsers.length > 0 && (
        <section style={styles.alertSectionWarning}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#744210" }}>
            ⚠️ A Expirar (Próximos 5 dias)
          </h3>
          <div style={styles.alertGrid}>
            {expiringUsers.map((user) => (
              <div key={user.id} style={styles.alertCardWarning}>
                <div style={styles.alertHeader}>
                  <span style={styles.alertName} title={user.nome}>
                    {user.nome}
                  </span>
                  <span style={styles.alertDaysWarning}>
                    {user.diasRestantes === 0 ? "Hoje!" : `${user.diasRestantes} dias`}
                  </span>
                </div>
                <div style={styles.alertBody}>
                  <div style={styles.categoryBadge}>
                    {user.categoria === "Piscinas" ? "📘 Piscinas" : "🌿 Jardins"}
                  </div>
                  <span style={{ fontSize: 13, color: "#666" }}>
                    {new Date(user.dataExpiracao.seconds * 1000).toLocaleDateString("pt-PT")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      <hr style={styles.divider} />

      {/* Adicionar Novo User */}
      <section style={styles.addSection}>
        <div style={styles.addCard}>
            <AddUser onUserAdded={fetchCounts} defaultCategoria="Piscinas" />
        </div>
      </section>

      <section style={styles.footerNote}>
        <small>Gerencie seus clientes de forma simples.</small>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 28,
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: 0, color: "rgba(255,255,255,0.85)" },
  logoutButton: {
    background: "#ef5350",
    border: "none",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  cardsRow: {
    display: "flex",
    gap: 16,
    alignItems: "stretch",
    flexWrap: "wrap",
    marginBottom: 30,
  },
  card: {
    background: "rgba(255,255,255,0.12)",
    padding: 18,
    borderRadius: 12,
    minWidth: 220,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: "1 1 240px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  },
  cardIcon: {
    fontSize: 28,
    width: 56,
    height: 56,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.12)",
  },
  cardTitle: { fontSize: 14, marginBottom: 6, fontWeight: 600 },
  cardNumber: { fontSize: 22, fontWeight: 800 },
  cardButton: {
    marginLeft: "auto",
    background: "#fff",
    color: "#222",
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  },
  divider: {
    border: "0",
    height: "1px",
    background: "rgba(255,255,255,0.2)",
    margin: "20px 0 30px 0"
  },
  
  // Grid comum para alertas
  alertGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12
  },
  alertHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    fontWeight: 700,
    overflow: "hidden"
  },
  alertName: { 
    fontSize: 15, 
    color: "#2d3748",
    whiteSpace: "nowrap", 
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginRight: 8,
    flex: 1
  },
  alertBody: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  categoryBadge: {
    background: "#edf2f7",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "#4a5568"
  },

  // Estilos Específicos para A EXPIRAR (Amarelo)
  alertSectionWarning: {
    background: "#fffaf0", // Creme/Amarelo claro
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    color: "#333",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    border: "1px solid #fbd38d"
  },
  alertCardWarning: {
    background: "#fff",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    border: "1px solid #f6e05e"
  },
  alertDaysWarning: { 
    color: "#d69e2e", // Amarelo escuro/Laranja
    fontSize: 13,
    whiteSpace: "nowrap",
    flexShrink: 0,
    fontWeight: 800
  },

  addSection: {
    display: "flex",
    justifyContent: "center"
  },
  addCard: {
    background: "#fff",
    color: "#333",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  },
  footerNote: { marginTop: 30, opacity: 0.8, textAlign: "center" },
};