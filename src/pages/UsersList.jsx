import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, "contacts"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>Utilizadores</h2>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.nome} - {u.contacto} - {new Date(u.dataExpiracao.seconds * 1000).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
