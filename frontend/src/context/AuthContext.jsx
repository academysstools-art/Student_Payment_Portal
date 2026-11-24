import { createContext, useCallback, useContext, useState } from "react";

const AuthContext = createContext(null);

function readSavedStudent() {
  const saved = localStorage.getItem("student");
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("student");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(readSavedStudent);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = useCallback((tokenValue, studentData) => {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("student", JSON.stringify(studentData));
    setToken(tokenValue);
    setStudent(studentData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("student");
    setToken(null);
    setStudent(null);
  }, []);

  const isAuthenticated = !!token;
  const isAdmin = student?.role === "admin";

  return (
    <AuthContext.Provider value={{ token, student, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
