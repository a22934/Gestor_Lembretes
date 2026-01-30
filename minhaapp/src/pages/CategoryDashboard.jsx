import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/config";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const addMonthsToDate = (date, months) => {
  const newDate = new Date(date.getTime());
  newDate.setMonth(date.getMonth() + months);
  return newDate;
};

const getMinDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

const minDate = getMinDate();

export default function CategoryDashboard({ categoria }) {

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertUsers, setAlertUsers] = useState([]);

  const [userToRenewId, setUserToRenewId] = useState(null);
  const [renewalDate, setRenewalDate] = useState("");
  const [renewalError, setRenewalError] = useState("");
  const [quickRenewalPreview, setQuickRenewalPreview] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);

  const navigate = useNavigate();

  // FORMAT
  const formatDateForDisplay = (date) => date.toLocaleDateString("pt-PT");

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "Data inválida";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("pt-PT");
  };

  const getCor = (dias) => {
    if (dias === null) return "#718096";
    if (dias < 0) return "#e53e3e";
    if (dias <= 2) return "#e53e3e";
    if (dias <= 5) return "#dd6b20";
    return "#38a169";
  };

  // FETCH USERS
  const fetchUsers = useCallback(async () => {

    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "contacts"),
        where("userId", "==", auth.currentUser.uid),
        where("categoria", "==", categoria)
      );

      const snap = await getDocs(q);

      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.id); // segurança

      const usersWithDays = docs.map((u, i) => {

        let dias = null;

        if (u.dataExpiracao?.seconds) {
          dias = Math.ceil(
            (new Date(u.dataExpiracao.seconds * 1000) - new Date()) /
            (1000 * 60 * 60 * 24)
          );
        }

        return {
          ...u,
          userIndex: i + 1,
          diasRestantes: dias,
        };
      });

      usersWithDays.sort((a, b) =>
        (a.dataExpiracao?.seconds || 0) - (b.dataExpiracao?.seconds || 0)
      );

      setUsers(usersWithDays);

    } catch (err) {
      console.error("Erro fetch:", err);
    }

    setLoading(false);

  }, [categoria]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const alerta = users
      .filter(u => u.diasRestantes !== null && u.diasRestantes >= 0 && u.diasRestantes <= 5)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    setAlertUsers(alerta);

  }, [users]);

  // CLEAR STATES
  const clearActionStates = () => {
    setUserToRenewId(null);
    setRenewalDate("");
    setRenewalError("");
    setQuickRenewalPreview(null);
    setUserToEdit(null);
  };

  // DELETE
  const handleDelete = async (id, nome) => {

    if (!id) return;

    if (window.confirm(`Eliminar ${nome}?`)) {
      await deleteDoc(doc(db, "contacts", id));
      fetchUsers();
    }
  };

  // EXECUTE RENEWAL
  const executeRenewal = async (id, newDate) => {

    if (!id) {
      setRenewalError("Erro interno: ID inválido.");
      return;
    }

    if (!window.confirm("Confirmar renovação?")) return;

    try {
      await updateDoc(doc(db, "contacts", id), {
        dataExpiracao: Timestamp.fromDate(newDate)
      });

      clearActionStates();
      fetchUsers();

    } catch (err) {
      console.error(err);
      setRenewalError("Erro ao renovar.");
    }
  };

  // START EDIT
  const startEdit = (user) => {

    if (!user?.id) return;

    clearActionStates();

    const formattedDate = user.dataExpiracao
      ? new Date(user.dataExpiracao.seconds * 1000).toISOString().split("T")[0]
      : minDate;

    setUserToEdit({
      id: user.id,
      nome: user.nome || "",
      contacto: user.contacto || "",
      dataExpiracao: formattedDate
    });
  };

  // HANDLE EDIT CHANGE
  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setUserToEdit(prev => ({
      ...prev,
      [name]: value
    }));

    setRenewalError("");
  };

  // SUBMIT EDIT
  const handleEditSubmit = async (e) => {

    e.preventDefault();
    if (!userToEdit) return;

    const { id, nome, contacto, dataExpiracao } = userToEdit;

    if (!id) {
      setRenewalError("Erro interno: ID inválido.");
      return;
    }

    const regexName = /^[a-zA-Z\u00C0-\u017F\s]*$/;
    const regexContacto = /^[0-9]{9}$/;

    if (!nome || !dataExpiracao) {
      setRenewalError("Nome e data são obrigatórios.");
      return;
    }

    if (!regexName.test(nome) || nome.trim().length < 3) {
      setRenewalError("Nome inválido.");
      return;
    }

    if (contacto && !regexContacto.test(contacto)) {
      setRenewalError("Contacto deve ter 9 dígitos.");
      return;
    }

    const selectedDate = new Date(dataExpiracao);

    if (selectedDate < new Date(minDate)) {
      setRenewalError("Data inválida.");
      return;
    }

    if (!window.confirm(`Confirmar edição de ${nome}?`)) return;

    try {

      await updateDoc(doc(db, "contacts", id), {
        nome,
        contacto: contacto || null,
        dataExpiracao: Timestamp.fromDate(selectedDate)
      });

      clearActionStates();
      fetchUsers();

    } catch (err) {
      console.error(err);
      setRenewalError("Erro ao salvar edição.");
    }
  };

  // UI
  return (
    <div style={{ padding: 20 }}>

      <button onClick={() => navigate("/dashboard")}>Voltar</button>
      <h2>{categoria}</h2>

      {users.map(u => (
        <div key={u.id} style={{ border: "1px solid #ddd", padding: 15, marginBottom: 10 }}>

          <strong>{u.nome}</strong>
          <div>{u.contacto || "Sem contacto"}</div>
          <div>{formatDate(u.dataExpiracao)}</div>

          <button onClick={() => startEdit(u)}>Editar</button>
          <button onClick={() => executeRenewal(u.id, addMonthsToDate(new Date(), 6))}>+6M</button>
          <button onClick={() => handleDelete(u.id, u.nome)}>Delete</button>

          {userToEdit?.id === u.id && (
            <form onSubmit={handleEditSubmit}>

              {renewalError && <p style={{ color: "red" }}>{renewalError}</p>}

              <input name="nome" value={userToEdit.nome} onChange={handleEditChange} />
              <input name="contacto" value={userToEdit.contacto} onChange={handleEditChange} />
              <input type="date" name="dataExpiracao" value={userToEdit.dataExpiracao} onChange={handleEditChange} />

              <button type="submit">Guardar</button>
              <button type="button" onClick={clearActionStates}>Cancelar</button>

            </form>
          )}

        </div>
      ))}

    </div>
  );
}
