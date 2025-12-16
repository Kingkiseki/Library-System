import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import BookShelf from "./components/BookShelf";
import Students from "./components/Students";
import Faculty from "./components/Faculty";
import LoginPage from "./components/Login";
import SignupPage from "./components/SignUp";
import Inventory from "./components/Inventory";
import RegisteredTeachers from "./components/RegisteredTeachers"; // ✅ fixed import path
import logo from "./assets/logo1.png";
import logo2 from "./assets/logo2.png";

function App() {
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);

  // NEW: control logo intro + welcome
  const [showLogoOnly, setShowLogoOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Validate token on app load
  useEffect(() => {
    const validateToken = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken && savedToken.trim() !== "") {
        try {
          // Validate token with server
          const response = await fetch("http://localhost:5000/api/auth/me", {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${savedToken}`,
              'Content-Type': 'application/json'
            },
          });

          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem("user", JSON.stringify(userData));
            setToken(savedToken);
            console.log("✅ Token validated successfully");
          } else {
            // Token is invalid, clear everything
            console.log("❌ Token validation failed, status:", response.status);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken("");
          }
        } catch (error) {
          // Network error or server error, clear everything
          console.log("❌ Error validating token:", error.message);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken("");
        }
      } else {
        console.log("ℹ️ No token found in localStorage");
      }
      setIsValidating(false);
    };

    validateToken();
  }, []);

  useEffect(() => {
    if (token) {
      setShowLogoOnly(true);

      // Step 1: show logo only
      const logoTimer = setTimeout(() => {
        setShowLogoOnly(false);
        setShowWelcome(true);
      }, 1000); // 1s logo only

      // Step 2: remove welcome after delay
      const welcomeTimer = setTimeout(() => {
        setShowWelcome(false);
      }, 2800); // ~2.8s total then go to dashboard

      return () => {
        clearTimeout(logoTimer);
        clearTimeout(welcomeTimer);
      };
    }
  }, [token]);

  // Show loading while validating token
  if (isValidating) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <div className="text-center">
          <img
            src={logo2}
            alt="Logo"
            className="w-20 h-20 mx-auto mb-4 animate-pulse"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Splash Screen
  if (showSplash) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <img
          src={logo2}
          alt="Logo"
          className="w-40 h-40 cursor-pointer hover:scale-105 transition duration-300"
          onClick={() => setShowSplash(false)}
        />
      </div>
    );
  }

  // Step 1: Logo only
  if (showLogoOnly) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <motion.img
          src={logo2}
          alt="Logo"
          className="w-40 h-40"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    );
  }

  // Step 2: Welcome animation
  if (showWelcome) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <div className="flex items-center space-x-6">
          {/* Logo animation (from left) */}
          <motion.img
            src={logo2}
            alt="Logo"
            className="w-40 h-40"
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: -10, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Vertical line */}
          <motion.div
            className="h-26 w-1 bg-orange-500"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          />

          {/* Welcome text (from right) */}
          <motion.h1
            className="text-4xl font-semibold text-orange-600"
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: 10, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Welcome
          </motion.h1>
        </div>
      </div>
    );
  }

  // Helper component for protected layout
  const ProtectedLayout = ({ children }) =>
    token ? (
      <div className="flex h-screen">
        <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
          <Sidebar activePage={activePage} setActivePage={setActivePage} />
        </aside>
        <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
          {children}
        </main>
      </div>
    ) : (
      <Navigate to="/login" replace />
    );

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage setToken={setToken} />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Debug route to clear storage */}
        <Route path="/clear-storage" element={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/login';
                }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Clear Storage & Redirect to Login
              </button>
            </div>
          </div>
        } />

        {/* Root Redirect */}
        <Route
          path="/"
          element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/bookshelf" element={<ProtectedLayout><BookShelf /></ProtectedLayout>} />
        <Route path="/students" element={<ProtectedLayout><Students /></ProtectedLayout>} />
        <Route path="/faculty" element={<ProtectedLayout><Faculty /></ProtectedLayout>} />
        <Route path="/inventory" element={<ProtectedLayout><Inventory /></ProtectedLayout>} />
        
        {/* Legacy route redirect for old /library path */}
        <Route path="/library" element={<Navigate to="/inventory" replace />} />

        {/* ✅ NEW: Teacher Registration Route */}
        <Route
          path="/teacher-registration"
          element={<ProtectedLayout><RegisteredTeachers /></ProtectedLayout>}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
