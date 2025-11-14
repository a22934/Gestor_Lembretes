import React, { useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function AddUser({ onUserAdded }) {
  const [nome, setNome] = useState("");
  const [contacto, setContacto] = useState("");
  const [dataExpiracao, setDataExpiracao] = useState("");
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
    if (regexName.test(value)) setNome(value);
  };

  const handleContactoChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 9) value = value.slice(0, 9);
    setContacto(value);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDataExpiracao(value);

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

    if (!nome || !contacto || !dataExpiracao) {
      setMessage("Preencha todos os campos");
      return;
    }

    if (!regexName.test(nome)) {
      setMessage("O nome só pode conter letras e espaços.");
      return;
    }

    if (!regexContacto.test(contacto)) {
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
      setMessage("Usuário não está logado");
      return;
    }

    try {
      await addDoc(collection(db, "contacts"), {
        userId: auth.currentUser.uid,
        nome,
        contacto,
        dataExpiracao: Timestamp.fromDate(selected),
        createdAt: Timestamp.now(),
      });

      setMessage("Usuário adicionado com sucesso!");
      setNome("");
      setContacto("");
      setDataExpiracao("");
      setDateError("");

      if (onUserAdded) onUserAdded();
    } catch (err) {
      console.error("Erro ao adicionar usuário:", err);
      setMessage("Erro ao adicionar usuário");
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Adicionar Usuário</h3>

      {message && (
        <p style={{ color: message.includes("sucesso") ? "green" : "red" }}>
          {message}
        </p>
      )}

      <form
        onSubmit={handleAddUser}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={handleNomeChange}
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          placeholder="Contato (9 dígitos)"
          value={contacto}
          onChange={handleContactoChange}
          maxLength={9}
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="date"
          value={dataExpiracao}
          min={minDate}
          onChange={handleDateChange}
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        {dateError && (
          <p style={{ color: "red", fontSize: "0.9rem" }}>{dateError}</p>
        )}

        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: "#6B73FF",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}
