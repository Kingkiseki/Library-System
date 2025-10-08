import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import BookShelf from "./components/BookShelf";
import Students from "./components/Students";
import Faculty from "./components/Faculty";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import QRPopup from "./components/QRPopup";
import logo2 from "./assets/logo2.png"; // main logo

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [activePage, setActivePage] = useState("dashboard");
  const [scannedData, setScannedData] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

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

  // ✅ Smooth logo + welcome animation
  if (showWelcome) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white overflow-hidden">
        <div className="flex items-center justify-center space-x-10 relative">
          {/* Logo smoothly slides left */}
          <motion.img
            src={logo2}
            alt="Logo"
            className="w-40 h-40"
            initial={{ opacity: 0, x: -40, scale: 0.8 }}
            animate={{ opacity: 1, x: -20, scale: 1 }}
            transition={{
              duration: 1.2,
              ease: [0.6, -0.05, 0.01, 0.99],
            }}
          />

          {/* Divider grows in center */}
          <motion.div
            className="h-24 w-[4px] bg-teal-700 rounded-full"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.33, 1, 0.68, 1],
            }}
            style={{ transformOrigin: "bottom" }}
          />

          {/* Welcome text slides in to right */}
          <motion.h1
            className="text-5xl font-semibold text-teal-700"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Welcome
          </motion.h1>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <Login
            setToken={(tokenValue) => {
              localStorage.setItem("token", tokenValue);
              setToken(tokenValue);

              // ✅ Show logo + welcome animation together
              setShowWelcome(true);

              // After animation → go to dashboard
              setTimeout(() => {
                setShowWelcome(false);
                navigate("/dashboard");
              }, 3000);
            }}
          />
        }
      />

      <Route path="/signup" element={<SignUp />} />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          token ? (
            <div className="flex h-screen">
              {/* Sidebar */}
              <aside className="fixed top-0 left-0 h-full bg-gray-100 text-white">
                <Sidebar
                  activePage={activePage}
                  setActivePage={setActivePage}
                />
              </aside>

              {/* Main Content */}
              <main className="flex-1 ml-45 overflow-y-auto bg-gray-100 h-screen">
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="bookshelf" element={<BookShelf />} />
                  <Route path="students" element={<Students />} />
                  <Route path="faculty" element={<Faculty />} />
                  <Route
                    path="qrcode"
                    element={<h1 className="p-6">QR Code Page</h1>}
                  />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </main>

              {/* QR Popup */}
              {scannedData && (
                <QRPopup
                  qrData={scannedData}
                  onClose={() => setScannedData(null)}
                />
              )}
            </div>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}
