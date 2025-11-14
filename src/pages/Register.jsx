import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const regexName = /^[a-zA-Z\u00C0-\u017F\s]*$/;

  const handleNameChange = (e) => {
    const valor = e.target.value;
    if (regexName.test(valor) || valor === "") {
      setName(valor);
      setNameError("");
    } else {
      setName(valor);
      setNameError("O nome deve conter apenas letras e espaços.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setNameError("");
    setIsLoading(true);

    if (!name || !email || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    if (!regexName.test(name)) {
      setNameError("O nome deve conter apenas letras e espaços.");
      setIsLoading(false);
      return;
    }
    if (name.trim().length < 3) {
      setNameError("O nome deve ter pelo menos 3 caracteres.");
      setIsLoading(false);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name
      });
      
      navigate("/dashboard");

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Este email já está a ser utilizado.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else if (err.code === 'auth/invalid-email') {
        setError("O email fornecido é inválido.");
      } else {
        setError("Erro ao criar conta: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}>
        <div style={styles.blob1}></div>
        <div style={styles.blob2}></div>
      </div>
      
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 0C8.96 0 0 8.96 0 20C0 31.04 8.96 40 20 40C31.04 40 40 31.04 40 20C40 8.96 31.04 0 20 0ZM20 36C11.16 36 4 28.84 4 20C4 11.16 11.16 4 20 4C28.84 4 36 11.16 36 20C36 28.84 28.84 36 20 36Z" fill="#667eea"/>
              <path d="M20 8C13.372 8 8 13.372 8 20C8 26.628 13.372 32 20 32C26.628 32 32 26.628 32 20C32 13.372 26.628 8 20 8ZM20 28C16.686 28 14 25.314 14 22C14 18.686 16.686 16 20 16C23.314 16 26 18.686 26 22C26 25.314 23.314 28 20 28Z" fill="#667eea"/>
            </svg>
          </div>
          <h2 style={styles.title}>Criar sua conta</h2>
          <p style={styles.subtitle}>Preencha os dados abaixo</p>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={styles.errorIcon}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nome Completo</label>
            <div style={styles.inputContainer}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={styles.inputIcon}>
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={handleNameChange}
                style={{
                  ...styles.input,
                  ...(nameError ? styles.inputError : {})
                }}
                required
              />
            </div>
            {nameError && <span style={styles.fieldErrorText}>{nameError}</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputContainer}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={styles.inputIcon}>
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <div style={styles.inputContainer}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={styles.inputIcon}>
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar Senha</label>
            <div style={styles.inputContainer}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={styles.inputIcon}>
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                type="password"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonLoading : {})
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              "Criar Conta"
            )}
          </button>
        </form>

        <p style={styles.footer}>
          Já tem uma conta? 
          <span 
            style={styles.link} 
            onClick={() => navigate("/login")}
          >
            Fazer login
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden"
  },
  blob1: {
    position: "absolute",
    top: "-10%",
    right: "-10%",
    width: "400px",
    height: "400px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    filter: "blur(40px)"
  },
  blob2: {
    position: "absolute",
    bottom: "-10%",
    left: "-10%",
    width: "300px",
    height: "300px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    filter: "blur(40px)"
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "48px 40px",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
    width: "440px",
    textAlign: "center",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    zIndex: 1
  },
  header: {
    marginBottom: "32px"
  },
  logo: {
    width: "60px",
    height: "60px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    color: "white"
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "8px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text"
  },
  subtitle: {
    fontSize: "16px",
    color: "#718096",
    margin: 0
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    textAlign: "left"
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: "8px"
  },
  inputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    color: "#a0aec0",
    zIndex: 1
  },
  input: {
    padding: "16px 16px 16px 48px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#fff",
    fontSize: "16px",
    outline: "none",
    transition: "all 0.3s ease",
    width: "100%",
    boxSizing: "border-box"
  },
  inputError: {
    borderColor: "#e53e3e",
    backgroundColor: "#fff5f5"
  },
  button: {
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "8px"
  },
  buttonLoading: {
    opacity: 0.7,
    cursor: "not-allowed"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid transparent",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#fed7d7",
    border: "1px solid #feb2b2",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  errorIcon: {
    color: "#e53e3e",
    flexShrink: 0
  },
  errorText: {
    color: "#c53030",
    fontSize: "14px",
    fontWeight: "500"
  },
  fieldErrorText: {
    color: "#e53e3e",
    fontSize: "12px",
    marginTop: "6px",
    display: "block"
  },
  footer: {
    marginTop: "32px",
    fontSize: "14px",
    color: "#718096"
  },
  link: {
    color: "#667eea",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "color 0.3s ease"
  }
};