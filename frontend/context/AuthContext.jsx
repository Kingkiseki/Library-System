// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from "react";

// Create context
export const AuthContext = createContext();

// Hook so you can use `useAuth()` instead of useContext(AuthContext)
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // holds user object (id, email, etc.)
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Login function (store token + user info)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("token", userData.token);
  };

  // Signup works same as login
  const signup = (userData) => {
    setUser(userData);
    localStorage.setItem("token", userData.token);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
