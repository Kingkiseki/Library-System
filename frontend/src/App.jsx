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
import Library from "./components/Library"
import logo from "./assets/logo1.png";   // splash
import logo2 from "./assets/logo2.png";  // main logo

function App() {
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);
  const [scannedData, setScannedData] = useState(null);

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
          const response = await fetch("http://localhost:5000/auth/me", {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem("user", JSON.stringify(userData));
            setToken(savedToken);
          } else {
            // Token is invalid, clear everything
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch (error) {
          // Network error or server error, clear everything
          console.log("Error validating token, clearing storage...");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
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

  // QR Scanner listener - Improved to avoid false triggers
  useEffect(() => {
    let buffer = "";
    let scannerTimeout;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in input fields or text areas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        // Only process if buffer has significant content (QR codes are typically long)
        if (buffer.trim() !== "" && buffer.length > 10) {
          console.log("QR Scanner - Processing scanned data:", buffer.trim());
          setScannedData(buffer.trim());
        }
        buffer = "";
      } else if (e.key.length === 1) { // Only capture printable characters
        buffer += e.key;
        
        // Auto-clear buffer after 100ms of no input (scanner inputs are very fast)
        scannerTimeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, []);

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

        {/* Root Route Redirect */}
        <Route 
          path="/" 
          element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <Dashboard />
                </main>
                {scannedData && (
                  <QRPopup qrData={scannedData} onClose={() => setScannedData(null)} />
                )}
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/bookshelf"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <BookShelf />
                </main>
                {scannedData && (
                  <QRPopup qrData={scannedData} onClose={() => setScannedData(null)} />
                )}
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/students"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <Students />
                </main>
                {scannedData && (
                  <QRPopup qrData={scannedData} onClose={() => setScannedData(null)} />
                )}
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/faculty"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <Faculty />
                </main>
                {scannedData && (
                  <QRPopup qrData={scannedData} onClose={() => setScannedData(null)} />
                )}
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

      <Route
          path="/library"
          element={
            token ? (
              <div className="flex h-screen">
                <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                  <Sidebar activePage={activePage} setActivePage={setActivePage} />
                </aside>
                <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                  <Library />
                </main>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />



        {/* Catch all other routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
