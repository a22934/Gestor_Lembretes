// Importar módulos do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCRVAq9RpTnCPnsp5ID9bH1ElxS9sIbLjg",
  authDomain: "lembretedb-71598.firebaseapp.com",
  projectId: "lembretedb-71598",
  storageBucket: "lembretedb-71598.firebasestorage.app",
  messagingSenderId: "594769341603",
  appId: "1:594769341603:web:4bb7c2b464f7974bffa316",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar Auth e Firestore para usar em outras partes do app
export const auth = getAuth(app);
export const db = getFirestore(app);
   