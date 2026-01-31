import React, { useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function AddUser({ onUserAdded, defaultCategoria = "Piscinas" }) {
  const [nome, setNome] = useState("");
  const [contacto, setContacto] = useState("");
  const [dataExpiracao, setDataExpiracao] = useState("");
  const [categoria, setCategoria] = useState(defaultCategoria);
  const [dateError, setDateError] = useState("");
  const [message, setMessage] = useState("");

  const regexName = /^[a-zA-Z\u00C0-\u017F\s]*$/;
  const regexContacto = /^[0-9]{9}$/;

  // 📌 Data mínima (amanhã)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const handleNomeChange = (e) => {
    const value = e.target.value;
    // Verifica se cumpre o regex E se tem no máximo 50 caracteres
    if (regexName.test(value) && value.length <= 50) {
      setNome(value);
    }
  };

  const handleContactoChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 9) value = value.slice(0, 9);
    setContacto(value);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDataExpiracao(value);

    if (!value) {
      setDateError("");
      return;
    }

    const selected = new Date(value);
    const min = new Date(minDate);

    if (selected < min) {
      setDateError("A data deve ser pelo menos amanhã.");
    } else {
      setDateError("");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!nome || !dataExpiracao) {
      setMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!regexName.test(nome)) {
      setMessage("O nome só pode conter letras e espaços.");
      return;
    }

    if (contacto && !regexContacto.test(contacto)) {
  setMessage("O contacto deve conter exatamente 9 números.");
  return;
}


    // ❌ Data inválida
    if (dateError) {
      setMessage(dateError);
      return;
    }

    // Nova verificação (segurança)
    const selected = new Date(dataExpiracao);
    const min = new Date(minDate);
    if (selected < min) {
      setMessage("A data deve ser pelo menos amanhã.");
      return;
    }

    if (!auth.currentUser) {
      setMessage("Utilizador não está logado");
      return;
    }

    try {
      await addDoc(collection(db, "contacts"), {
        userId: auth.currentUser.uid,
        nome,
         contacto: contacto || null,
        categoria,
        dataExpiracao: Timestamp.fromDate(selected),
        createdAt: Timestamp.now(),
      });

      setMessage("Utilizador adicionado com sucesso!");
      setNome("");
      setContacto("");
      setDataExpiracao("");
      setDateError("");
      setCategoria(defaultCategoria);

      if (onUserAdded) onUserAdded();
    } catch (err) {
      console.error("Erro ao adicionar utilizador:", err);
      setMessage("Erro ao adicionar utilizador");
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ marginTop: 0, color: "#333" }}>Adicionar Cliente</h3>

      {message && (
        <p style={{ 
          color: message.includes("sucesso") ? "green" : "red", 
          background: message.includes("sucesso") ? "#e6fffa" : "#fff5f5",
          padding: "8px",
          borderRadius: "6px",
          marginBottom: "10px",
          fontWeight: "500"
        }}>
          {message}
        </p>
      )}

      <form
        onSubmit={handleAddUser}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <input
          type="text"
          placeholder="Nome (máx. 50 caracteres)"
          value={nome}
          onChange={handleNomeChange}
          maxLength={50} // Limite nativo do input
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: "10px" }}>
            <input
            type="text"
            placeholder="Contacto (Opcional- 9 dígitos)"
            value={contacto}
            onChange={handleContactoChange}
            maxLength={9}
            style={{ ...inputStyle, flex: 1 }}
            />

            <select 
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value)} 
                style={{ ...inputStyle, flex: 1 }}
            >
                <option value="Piscinas">Piscinas</option>
                <option value="Jardins">Jardins</option>
            </select>
        </div>

        <input
          type="date"
          value={dataExpiracao}
          min={minDate}
          onChange={handleDateChange}
          style={inputStyle}
        />

        {dateError && (
          <p style={{ color: "red", fontSize: "0.9rem", margin: 0 }}>{dateError}</p>
        )}

        <button
          type="submit"
          style={{
            padding: "12px",
            backgroundColor: "#6B73FF",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            marginTop: "4px"
          }}
        >
          Adicionar Cliente
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e0",
  fontSize: "14px",
  outline: "none"
};