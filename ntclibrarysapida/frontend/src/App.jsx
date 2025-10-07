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
import QRPopup from "./components/QRPopup"; 
import logo from "./assets/logo1.png";   // splash
import logo2 from "./assets/logo2.png";  // main logo

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [activePage, setActivePage] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);
  const [scannedData, setScannedData] = useState(null);

  // NEW: control logo intro + welcome
  const [showLogoOnly, setShowLogoOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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

  // QR Scanner listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        setScannedData(e.target.value);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

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
            className="h-26 w-1 bg-teal-700"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          />

          {/* Welcome text (from right) */}
          <motion.h1
            className="text-4xl font-semibold text-teal-700"
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

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage setToken={setToken} />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="bookshelf" element={<BookShelf />} />
                    <Route path="students" element={<Students />} />
                    <Route path="faculty" element={<Faculty />} />
                    <Route path="qrcode" element={<h1 className="p-6">QR Code Page</h1>} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </main>

                {/* QR Popup */}
                {scannedData && (
                  <QRPopup qrData={scannedData} onClose={() => setScannedData(null)} />
                )}
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
