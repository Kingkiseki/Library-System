import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import BookShelf from "./components/BookShelf";
import Students from "./components/Students";
import Faculty from "./components/Faculty";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import QRPopup from "./components/QRPopup"; // <-- new import
import logo from "./assets/logo.png";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [activePage, setActivePage] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);

  const [scannedData, setScannedData] = useState(null);

  // QR Scanner listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        setScannedData(e.target.value); // physical scanner sends QR as text input + Enter
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (showSplash) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white">
        <img
          src={logo}
          alt="Logo"
          className="w-90 h-90 cursor-pointer hover:bg-teal-600 rounded-4xl transition duration-200"
          onClick={() => setShowSplash(false)}
        />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/signup" element={<SignUp />} />

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
