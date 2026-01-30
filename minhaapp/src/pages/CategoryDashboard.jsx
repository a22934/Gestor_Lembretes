import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/config";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// Função auxiliar para adicionar meses a uma data
const addMonthsToDate = (date, months) => {
    const newDate = new Date(date.getTime());
    newDate.setMonth(date.getMonth() + months);
    return newDate;
};

// Função para obter a data mínima (amanhã)
const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
}
const minDate = getMinDate();


export default function CategoryDashboard({ categoria }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertUsers, setAlertUsers] = useState([]);
  const navigate = useNavigate();

  // ESTADOS DE AÇÃO
  const [userToRenewId, setUserToRenewId] = useState(null); // Para renovação manual de data
  const [renewalDate, setRenewalDate] = useState("");
  const [renewalError, setRenewalError] = useState("");
  
  const [quickRenewalPreview, setQuickRenewalPreview] = useState(null); // { user, date, type }
  const [userToEdit, setUserToEdit] = useState(null); // { id, nome, contacto, dataExpiracao (formatada) }

  // Funções Utilitárias
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("pt-PT");
  }

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "Data inválida";
    const date = new Date(timestamp.seconds * 1000);
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
  };

  const getCor = (dias) => {
    if (dias === null) return "#718096";
    if (dias < 0) return "#e53e3e";
    if (dias <= 2) return "#e53e3e";
    if (dias <= 5) return "#dd6b20";
    return "#38a169";
  };
  
  // Lógica de Fetching (inalterada)
  const fetchUsers = useCallback(async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(db, "contacts"),
      where("userId", "==", auth.currentUser.uid),
      where("categoria", "==", categoria)
    );

    try {
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const usersWithDays = docs.map((u, i) => {
        let dias = null;
        if (u.dataExpiracao && typeof u.dataExpiracao.seconds === "number") {
          const diff = Math.ceil((new Date(u.dataExpiracao.seconds * 1000) - new Date()) / (1000 * 60 * 60 * 24));
          dias = diff;
        }
        return {
          ...u,
          userIndex: i + 1,
          diasRestantes: dias,
          uniqueIdentifier: `${u.nome}-${u.contacto}-${i}`,
        };
      });

      usersWithDays.sort((a, b) => {
        if (!a.dataExpiracao || !b.dataExpiracao) return 0;
        return a.dataExpiracao.seconds - b.dataExpiracao.seconds;
      });

      setUsers(usersWithDays);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
    
  }, [categoria]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); 

  useEffect(() => {
    const alerta = users.filter(u => u.diasRestantes !== null && u.diasRestantes >= 0 && u.diasRestantes <= 5);
    alerta.sort((a,b) => a.diasRestantes - b.diasRestantes);
    setAlertUsers(alerta);
  }, [users]);

  // Lógica de Ação
  
  const clearActionStates = () => {
    setUserToRenewId(null);
    setRenewalDate("");
    setRenewalError("");
    setQuickRenewalPreview(null);
    setUserToEdit(null);
  }

  // 1. ELIMINAR
  const handleDelete = async (id, nome) => {
    if (window.confirm(`Eliminar ${nome}?`)) {
      await deleteDoc(doc(db, "contacts", id));
      fetchUsers();
    }
  };

  // 2. RENOVAÇÃO (Função de execução final)
  const executeRenewal = async (id, newDate) => {
    if (!window.confirm("Confirmar a renovação da data de expiração?")) {
        return;
    }
    
    try {
        const userRef = doc(db, "contacts", id);
        await updateDoc(userRef, {
            dataExpiracao: Timestamp.fromDate(newDate),
        });

        clearActionStates();
        fetchUsers();
    } catch (error) {
        console.error("Erro ao renovar data:", error);
        setRenewalError("Erro ao renovar a data.");
    }
  }

  // 3. RENOVAÇÃO MANUAL (Início)
  const startRenewal = (user) => {
    clearActionStates();
    setUserToRenewId(user.id);
    setRenewalError("");
    
    // Define a data atual como a data de expiração existente, ou a data mínima
    const currentExpDate = user.dataExpiracao 
        ? new Date(user.dataExpiracao.seconds * 1000) 
        : new Date(minDate);
        
    const formattedDate = currentExpDate.toISOString().split("T")[0];
    setRenewalDate(formattedDate);
  };

  // 4. RENOVAÇÃO MANUAL (Confirmação)
  const confirmRenewal = async (id) => {
    setRenewalError("");
    if (!renewalDate) {
      setRenewalError("Selecione uma data válida.");
      return;
    }

    const selectedDate = new Date(renewalDate);
    const min = new Date(minDate);

    if (selectedDate < min) {
      setRenewalError("A data deve ser pelo menos amanhã.");
      return;
    }
    
    await executeRenewal(id, selectedDate);
  };
  
  // 5. RENOVAÇÃO RÁPIDA (Preview 6 Meses)
  const renewForSixMonths = (user) => {
    clearActionStates();
    const newDate = addMonthsToDate(new Date(), 6);
    setQuickRenewalPreview({
        user: user, 
        date: newDate, 
        type: '6 meses'
    });
  };
  
  // 6. RENOVAÇÃO RÁPIDA (Preview 1 Ano)
  const renewForOneYear = (user) => {
    clearActionStates();
    const newDate = addMonthsToDate(new Date(), 12);
    setQuickRenewalPreview({
        user: user, 
        date: newDate, 
        type: '1 ano'
    });
  };
  
  // 7. EDIÇÃO COMPLETA (Início)
  const startEdit = (user) => {
    clearActionStates();
    
    const formattedDate = user.dataExpiracao 
        ? new Date(user.dataExpiracao.seconds * 1000).toISOString().split("T")[0]
        : minDate;
        
    setUserToEdit({
        id: user.id,
        nome: user.nome,
        contacto: user.contacto,
        dataExpiracao: formattedDate
    });
    setRenewalError(""); // Limpa erro ao iniciar
  };
  
  // 8. EDIÇÃO COMPLETA (Alteração de campos)
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setUserToEdit(prev => ({
        ...prev,
        [name]: value
    }));
    setRenewalError(""); // Limpa erro ao digitar
  };
  
  // 9. EDIÇÃO COMPLETA (Submissão)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;
    
    const { id, nome, contacto, dataExpiracao } = userToEdit;
    
    const regexName = /^[a-zA-Z\u00C0-\u017F\s]*$/;
    const regexContacto = /^[0-9]{9}$/;
    
    if (!nome || !contacto || !dataExpiracao) {
      setRenewalError("Preencha todos os campos do formulário de edição.");
      return;
    }
    
    if (!regexName.test(nome) || nome.trim().length < 3) {
      setRenewalError("Nome inválido ou muito curto (mín. 3 caracteres).");
      return;
    }

    if (!regexContacto.test(contacto)) {
      setRenewalError("Contacto deve ter 9 dígitos numéricos.");
      return;
    }

    const selectedDate = new Date(dataExpiracao);
    const min = new Date(minDate);
    if (selectedDate < min) {
      setRenewalError("A data de expiração deve ser pelo menos amanhã.");
      return;
    }

    if (window.confirm(`Confirmar a edição do cliente ${nome}?`)) {
        try {
            const userRef = doc(db, "contacts", id);
            await updateDoc(userRef, {
                nome,
                contacto,
                dataExpiracao: Timestamp.fromDate(selectedDate),
            });

            clearActionStates();
            fetchUsers();
        } catch (error) {
            console.error("Erro ao editar utilizador:", error);
            setRenewalError("Erro ao salvar a edição.");
        }
    }
  };


  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <button style={backButtonStyle} onClick={() => navigate("/dashboard")}>← Voltar</button>
        <h2 style={{ margin: 0 }}>{categoria}</h2>
        <div style={{ width: 80 }} /> {/* Spacer para equilibrar o flex */}
      </div>

      {alertUsers.length > 0 && (
        <div style={alertBoxStyle}>
          <strong>Atenção — próximos a expirar:</strong>
          <ul>
            {alertUsers.map(u => (
              <li key={u.uniqueIdentifier}>
                {u.nome} — {formatDate(u.dataExpiracao)} ({u.diasRestantes} dias)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={contentContainerStyle}>
        <h3>Lista ({users.length})</h3>

        {loading ? (
          <div style={{ color: '#667eea', fontWeight: 'bold' }}>Carregando...</div>
        ) : users.length === 0 ? (
          <div>Nenhum cliente nesta categoria.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map(u => (
              <div key={u.uniqueIdentifier} style={userCardStyle}>
                
                {/* 1. Secção de Informação principal (Sempre visível) */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{u.nome}</div>
                    <div style={{ color: "#666" }}>{u.contacto}</div>
                </div>

                <div style={{ textAlign: "right", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>{formatDate(u.dataExpiracao)}</div>
                    <div style={{ color: getCor(u.diasRestantes), fontWeight: 700 }}>
                        {u.diasRestantes === null ? "Data inválida" : (u.diasRestantes < 0 ? "Expirado" : `${u.diasRestantes} dias`)}
                    </div>
                    
                    {/* Botões de Ação */}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                        <button onClick={() => startEdit(u)} style={editButtonStyle}>Editar</button>
                        <button onClick={() => startRenewal(u)} style={renewButtonStyle}>Renovar</button>
                        <button onClick={() => handleDelete(u.id, u.nome)} style={deleteButtonStyle}>Eliminar</button>
                    </div>
                </div>
                
                {/* 2. Formulário de Edição Completa (Prioridade Máxima) */}
                {userToEdit && userToEdit.id === u.id && (
                    <form onSubmit={handleEditSubmit} style={fullEditFormStyle}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: 16, width: '100%', textAlign: 'left' }}>Editar Cliente</h4>
                        
                        {renewalError && <p style={renewalErrorStyle}>{renewalError}</p>}
                        
                        <input
                            type="text"
                            name="nome"
                            placeholder="Nome"
                            value={userToEdit.nome}
                            onChange={handleEditChange}
                            style={renewalInputStyle}
                        />
                        <input
                            type="text"
                            name="contacto"
                            placeholder="Contacto"
                            value={userToEdit.contacto}
                            onChange={handleEditChange}
                            maxLength={9}
                            style={renewalInputStyle}
                        />
                        <input
                            type="date"
                            name="dataExpiracao"
                            value={userToEdit.dataExpiracao}
                            min={minDate}
                            onChange={handleEditChange}
                            style={renewalInputStyle}
                        />

                        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                            <button type="submit" style={confirmRenewalButtonStyle}>
                                Guardar Edição
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {setUserToEdit(null); setRenewalError("")}} 
                                style={cancelRenewalButtonStyle}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                )}

                {/* 3. Pré-visualização de Renovação Rápida */}
                {quickRenewalPreview && quickRenewalPreview.user.id === u.id && (
                    <div style={renewalFormStyle}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, width: '100%', textAlign: 'left' }}>
                            Confirmar Renovação Rápida ({quickRenewalPreview.type})
                        </h4>
                        
                        <p style={renewalPreviewTextStyle}>
                            A nova data de expiração será: 
                            <span style={{ fontWeight: 'bold', marginLeft: 5 }}>
                                {formatDateForDisplay(quickRenewalPreview.date)}
                            </span>
                        </p>

                        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => executeRenewal(u.id, quickRenewalPreview.date)} 
                                style={confirmRenewalButtonStyle}
                            >
                                Confirmar Renovação
                            </button>
                            <button 
                                onClick={() => setQuickRenewalPreview(null)} 
                                style={cancelRenewalButtonStyle}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}


                {/* 4. Formulário de Renovação Manual (Quando 'Renovar' é clicado) */}
                {userToRenewId === u.id && !userToEdit && !quickRenewalPreview && (
                    <div style={renewalFormStyle}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, width: '100%', textAlign: 'left' }}>Renovação Rápida</h4>
                        <div style={quickRenewalButtonsStyle}>
                            <button 
                                onClick={() => renewForSixMonths(u)} 
                                style={quickRenewButtonStyle}
                            >
                                + 6 Meses
                            </button>
                            <button 
                                onClick={() => renewForOneYear(u)} 
                                style={quickRenewButtonStyle}
                            >
                                + 1 Ano
                            </button>
                        </div>
                        
                        <h4 style={{ margin: '15px 0 10px 0', fontSize: 14, width: '100%', textAlign: 'left' }}>Nova Data de Expiração (Manual)</h4>
                        <input
                            type="date"
                            value={renewalDate}
                            min={minDate}
                            onChange={(e) => { setRenewalDate(e.target.value); setRenewalError(""); }}
                            style={renewalInputStyle}
                        />
                        {renewalError && <p style={renewalErrorStyle}>{renewalError}</p>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <button 
                                onClick={() => confirmRenewal(u.id)} 
                                style={confirmRenewalButtonStyle}
                            >
                                Confirmar Data Manual
                            </button>
                            <button 
                                onClick={() => setUserToRenewId(null)} 
                                style={cancelRenewalButtonStyle}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Estilos Atualizados */
const pageStyle = {
  minHeight: "100vh",
  width: "100%", 
  boxSizing: 'border-box',
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  background: "#f6f8fb",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 20,
};

const backButtonStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "#667eea",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  transition: 'background 0.2s',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const alertBoxStyle = {
  background: "#fff3cd",
  padding: 12,
  borderRadius: 8,
  marginBottom: 20,
  border: "1px solid #ffeeba",
  color: "#856404"
};

const contentContainerStyle = {
  maxWidth: 800,
  margin: "0 auto"
};

const userCardStyle = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  display: "flex",
  justifyContent: "space-between",
  border: "1px solid #e6edf3",
  boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
  // ATUALIZADO: para suportar o form embutido, a direção muda
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start'
};

const deleteButtonStyle = {
  background: "#fed7d7",
  border: "none",
  color: "#c53030",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  transition: 'background 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
};

const renewButtonStyle = {
  background: "#9f7aea",
  border: "none",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  transition: 'background 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
};

// NOVO ESTILO: Botão Editar
const editButtonStyle = {
    background: "#f6ad55",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    transition: 'background 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
};


// Estilos de Formulário
const renewalFormStyle = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #eee',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
};

// NOVO ESTILO: Formulário de Edição Completa (Ocupa largura total)
const fullEditFormStyle = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #eee',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10 
};

const renewalInputStyle = {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e0",
    fontSize: "14px",
    outline: "none",
    width: '100%',
    maxWidth: '100%', 
    boxSizing: 'border-box'
};

const confirmRenewalButtonStyle = {
    background: "#48bb78",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    transition: 'background 0.2s',
};

const cancelRenewalButtonStyle = {
    background: "#e2e8f0",
    border: "none",
    color: "#4a5568",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    transition: 'background 0.2s',
};

const renewalErrorStyle = {
    color: "#e53e3e",
    fontSize: "12px",
    margin: '4px 0 0 0',
    textAlign: 'right',
    width: '100%'
}

const quickRenewalButtonsStyle = {
    display: 'flex',
    gap: 10,
    width: '100%',
    justifyContent: 'flex-start',
    marginBottom: 5
}

const quickRenewButtonStyle = {
    background: "#4299e1", 
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    transition: 'background 0.2s',
    flex: 1
}

// NOVO ESTILO: Texto de pré-visualização de renovação
const renewalPreviewTextStyle = {
    fontSize: 15,
    margin: '10px 0',
    width: '100%',
    textAlign: 'left'
};