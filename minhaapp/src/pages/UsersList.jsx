import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, "contacts"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      // CORREÇÃO: d.id deve ser declarado por último
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>Utilizadores</h2>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.nome} - {u.contacto} - {u.dataExpiracao ? new Date(u.dataExpiracao.seconds * 1000).toLocaleDateString() : "Sem data"}
          </li>
        ))}
      </ul>
    </div>
  );
}