import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import AddUser from "./AddUser";
import styled from "styled-components";

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertUsers, setAlertUsers] = useState([]);

  const fetchUsers = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const q = query(
      collection(db, "contacts"),
      where("userId", "==", auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    // Adicionar índice único e calcular dias restantes
    const usersWithAdditionalData = usersData.map((user, index) => {
      const diasRestantes = calcularDiasRestantes(user.dataExpiracao);
      return {
        ...user,
        userIndex: index + 1,
        uniqueIdentifier: `${user.nome}-${user.contacto}-${index}`,
        diasRestantes: diasRestantes,
        estaExpirado: diasRestantes < 0
      };
    });

    // Ordenar por data de expiração (mais próximo primeiro)
    const usersOrdenados = usersWithAdditionalData.sort((a, b) => {
      if (!a.dataExpiracao || !b.dataExpiracao) return 0;
      
      const dataA = new Date(a.dataExpiracao.seconds * 1000);
      const dataB = new Date(b.dataExpiracao.seconds * 1000);
      
      return dataA - dataB; // Ordem crescente = mais próximo primeiro
    });

    // Reatribuir índices baseados na nova ordem
    const usersComIndicesReordenados = usersOrdenados.map((user, index) => ({
      ...user,
      userIndex: index + 1
    }));

    setUsers(usersComIndicesReordenados);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const alerta = users.filter((u) => {
      return u.diasRestantes <= 5 && u.diasRestantes >= 0;
    });
    
    // Ordenar alertas por dias restantes (menos dias primeiro)
    const alertaOrdenado = alerta.sort((a, b) => a.diasRestantes - b.diasRestantes);
    setAlertUsers(alertaOrdenado);
  }, [users]);

  // Função para calcular dias restantes
  const calcularDiasRestantes = (dataExpiracao) => {
    if (!dataExpiracao || typeof dataExpiracao.seconds !== "number") {
      return null;
    }
    
    const hoje = new Date();
    const dataExp = new Date(dataExpiracao.seconds * 1000);
    const diffTempo = dataExp - hoje;
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
    
    return diffDias;
  };

  // Função para obter a cor baseada nos dias restantes
  const getCorDiasRestantes = (dias) => {
    if (dias === null) return "#718096"; // Cinza para datas inválidas
    if (dias < 0) return "#e53e3e"; // Vermelho para expirado
    if (dias <= 2) return "#e53e3e"; // Vermelho para 0-2 dias
    if (dias <= 5) return "#dd6b20"; // Laranja para 3-5 dias
    return "#38a169"; // Verde para mais de 5 dias
  };

  // Função para obter texto dos dias restantes
  const getTextoDiasRestantes = (dias) => {
    if (dias === null) return "Data inválida";
    if (dias < 0) return "Expirado";
    if (dias === 0) return "Expira hoje";
    if (dias === 1) return "1 dia restante";
    return `${dias} dias restantes`;
  };

  const handleDeleteUser = async (userId, nome) => {
    if (window.confirm(`Tem certeza que deseja eliminar ${nome}?`)) {
      try {
        await deleteDoc(doc(db, "contacts", userId));
        fetchUsers();
      } catch (err) {
        console.error("Erro ao deletar usuário:", err);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.seconds !== "number") {
      return "Data inválida";
    }
    return new Date(timestamp.seconds * 1000).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Função para gerar identificação única do usuário no alerta
  const getUserAlertIdentifier = (user) => {
    return `#${user.userIndex} - ${user.nome} (${user.contacto})`;
  };

  return (
    <DashboardContainer>
      <Background>
        <Blob1 />
        <Blob2 />
      </Background>
      
      <DashboardCard>
        <Header>
          <HeaderContent>
            <Logo>
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <path d="M20 0C8.96 0 0 8.96 0 20C0 31.04 8.96 40 20 40C31.04 40 40 31.04 40 20C40 8.96 31.04 0 20 0ZM20 36C11.16 36 4 28.84 4 20C4 11.16 11.16 4 20 4C28.84 4 36 11.16 36 20C36 28.84 28.84 36 20 36Z" fill="#667eea"/>
                <path d="M20 8C13.372 8 8 13.372 8 20C8 26.628 13.372 32 20 32C26.628 32 32 26.628 32 20C32 13.372 26.628 8 20 8ZM20 28C16.686 28 14 25.314 14 22C14 18.686 16.686 16 20 16C23.314 16 26 18.686 26 22C26 25.314 23.314 28 20 28Z" fill="#667eea"/>
              </svg>
            </Logo>
            <HeaderText>
              <Title>Dashboard</Title>
              <Subtitle>Gerencie seus contatos</Subtitle>
            </HeaderText>
          </HeaderContent>
          <LogoutButton onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: "8px" }}>
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Sair
          </LogoutButton>
        </Header>

        {alertUsers.length > 0 && (
          <AlertBox>
            <AlertIcon>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Atenção! Contatos prestes a expirar</AlertTitle>
              <AlertList>
                {alertUsers.map((u) => (
                  <AlertItem key={u.uniqueIdentifier}>
                    <UserIdentifier>{getUserAlertIdentifier(u)}</UserIdentifier>
                    <AlertDetails>
                      Expira em <strong>{formatDate(u.dataExpiracao)}</strong> 
                      {" "}(<AlertDias style={{ color: getCorDiasRestantes(u.diasRestantes) }}>
                        {getTextoDiasRestantes(u.diasRestantes)}
                      </AlertDias>)
                    </AlertDetails>
                  </AlertItem>
                ))}
              </AlertList>
            </AlertContent>
          </AlertBox>
        )}

        <AddUserContainer>
          <AddUser onUserAdded={fetchUsers} />
        </AddUserContainer>

        <UserListContainer>
          <SectionHeader>
            <SectionTitle>Meus Contatos</SectionTitle>
            <UserCount>{users.length} contato{users.length !== 1 ? 's' : ''}</UserCount>
          </SectionHeader>
          
          {loading ? (
            <LoadingState>
              <Spinner />
              <LoadingText>Carregando contatos...</LoadingText>
            </LoadingState>
          ) : users.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </EmptyIcon>
              <EmptyText>Nenhum contato cadastrado</EmptyText>
              <EmptySubtext>Adicione seu primeiro contato usando o formulário acima</EmptySubtext>
            </EmptyState>
          ) : (
            <UserList>
              {users.map((u) => (
                <UserItem key={u.uniqueIdentifier}>
                  <UserInfoSection>
                    <UserAvatar $cor={getCorDiasRestantes(u.diasRestantes)}>
                      {u.userIndex}
                    </UserAvatar>
                    <UserInfo>
                      <UserName>
                        <UserIdentifierBadge>#{u.userIndex}</UserIdentifierBadge>
                        {u.nome}
                      </UserName>
                      <UserContact>{u.contacto}</UserContact>
                    </UserInfo>
                  </UserInfoSection>
                  
                  <ExpiryInfo>
                    <ExpiryDateMain>{formatDate(u.dataExpiracao)}</ExpiryDateMain>
                    <DiasRestantes $cor={getCorDiasRestantes(u.diasRestantes)}>
                      {getTextoDiasRestantes(u.diasRestantes)}
                    </DiasRestantes>
                  </ExpiryInfo>
                  
                  <DeleteButton onClick={() => handleDeleteUser(u.id, u.nome)}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Eliminar
                  </DeleteButton>
                </UserItem>
              ))}
            </UserList>
          )}
        </UserListContainer>
      </DashboardCard>
    </DashboardContainer>
  );
}

// --- ESTILOS ATUALIZADOS ---
const DashboardContainer = styled.div`
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  position: relative;
  overflow: hidden;
`;

const Background = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
`;

const Blob1 = styled.div`
  position: absolute;
  top: -10%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(40px);
`;

const Blob2 = styled.div`
  position: absolute;
  bottom: -10%;
  left: -10%;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  filter: blur(40px);
`;

const DashboardCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 40px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
`;

// ... (manter os estilos anteriores para Header, Logo, Title, etc.)

const AlertBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  margin: 0 40px 32px;
  background: #fff3cd;
  border: 1px solid #ffe69c;
  border-radius: 12px;
`;

const AlertIcon = styled.div`
  color: #664d03;
  flex-shrink: 0;
  margin-top: 2px;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.h3`
  color: #664d03;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
`;

const AlertList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AlertItem = styled.li`
  color: #664d03;
  padding: 8px 0;
  border-bottom: 1px solid rgba(102, 77, 3, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const UserIdentifier = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
`;

const AlertDetails = styled.div`
  font-size: 13px;
  color: #8a6d3b;
`;

const AlertDias = styled.span`
  font-weight: 600;
`;

const AddUserContainer = styled.div`
  padding: 0 40px 32px;
`;

const UserListContainer = styled.div`
  padding: 0 40px 40px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
`;

const UserCount = styled.span`
  background: #edf2f7;
  color: #4a5568;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: #718096;
  font-size: 16px;
  margin: 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  color: #cbd5e0;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  color: #4a5568;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const EmptySubtext = styled.p`
  color: #718096;
  font-size: 14px;
  margin: 0;
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }
`;

const UserInfoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  background: ${props => props.$cor || '#667eea'};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
`;

const UserIdentifierBadge = styled.span`
  background: #edf2f7;
  color: #4a5568;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const UserContact = styled.div`
  color: #718096;
  font-size: 14px;
`;

const ExpiryInfo = styled.div`
  text-align: right;
  margin-right: 16px;
  min-width: 120px;
`;

const ExpiryDateMain = styled.div`
  font-weight: 600;
  color: #4a5568;
  font-size: 14px;
  margin-bottom: 4px;
`;

const DiasRestantes = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$cor || '#718096'};
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fed7d7;
  color: #c53030;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #feb2b2;
    transform: translateY(-1px);
  }
`;

// Manter os estilos anteriores que não foram mostrados por brevidade...
const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Logo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #718096;
  margin: 4px 0 0 0;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
`;