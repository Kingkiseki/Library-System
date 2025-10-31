import React, { useEffect, useState } from "react";
import QRPopup from "./QRPopup"; // import the popup
import BookStats from "./BookStats";
import Notifications from "./Notifications";
import TotalBooksReport from "./TotalBooksReport";
import Activity from "./Activity";
import FineQueue from "./FineQueue";

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [qrData, setQrData] = useState(null); // scanner data
  const [showPopup, setShowPopup] = useState(false); // QR popup state
  const [showWelcome, setShowWelcome] = useState(false);

  // Global scanner listener
  useEffect(() => {
    let buffer = "";
    let scannerTimeout;

    const handleKeyDown = (e) => {
      // Ignore special keys and focus on input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("QR Scanner - Raw input:", trimmedBuffer);
          console.log("QR Scanner - Length:", trimmedBuffer.length);
          
          // Clean up the corrupted QR data
          let cleanedData = trimmedBuffer;
          
          // Remove scanner artifacts like @@*@@*@@*
          cleanedData = cleanedData.replace(/@@\*@@\*@@\*/g, '');
          cleanedData = cleanedData.replace(/@@\*/g, '');
          cleanedData = cleanedData.replace(/\*@@/g, '');
          cleanedData = cleanedData.replace(/@/g, '');
          
          console.log("QR Scanner - Cleaned input:", cleanedData);
          
          // Check if it looks like JSON after cleaning
          if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
            console.log("QR Scanner - JSON format detected after cleaning");
            setQrData(cleanedData);
            setShowPopup(true);
          } 
          // Handle student number format (like b6d349212B72767949450*2025-000010)
          else if (cleanedData.includes('2025-') || cleanedData.includes('2024-')) {
            console.log("QR Scanner - Student number format detected:", cleanedData);
            // Extract student number (looks like 2025-000010)
            const studentNumberMatch = cleanedData.match(/(20\d{2}-\d{4,6})/);
            if (studentNumberMatch) {
              const studentNumber = studentNumberMatch[1];
              console.log("QR Scanner - Extracted student number:", studentNumber);
              // Create a fake JSON for the student number
              const studentData = JSON.stringify({
                type: "student",
                studentNumber: studentNumber,
                fullName: "Scanned Student"
              });
              setQrData(studentData);
              setShowPopup(true);
            }
          }
          // Handle pure JSON format
          else if (trimmedBuffer.startsWith('{') && trimmedBuffer.endsWith('}')) {
            console.log("QR Scanner - Pure JSON format detected");
            setQrData(trimmedBuffer);
            setShowPopup(true);
          } 
          // Handle any other legacy formats
          else {
            console.log("QR Scanner - Trying as legacy format:", cleanedData);
            setQrData(cleanedData);
            setShowPopup(true);
          }
          buffer = "";
        } else {
          console.log("QR Scanner - Buffer too short or empty:", buffer.trim());
        }
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

  useEffect(() => {
    fetchUser();
  }, []);

  // ✅ Fetch logged-in user
  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setEmail(data.email);

      // ✅ Show welcome message only once per login/session
      const hasShownWelcome = sessionStorage.getItem("hasShownWelcome");
      if (!hasShownWelcome) {
        setShowWelcome(true);
        const timer = setTimeout(() => {
          setShowWelcome(false);
          sessionStorage.setItem("hasShownWelcome", "true");
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error(err);
      window.location.href = "/login";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("hasShownWelcome"); // reset welcome on next login
    window.location.href = "/login";
  };

  const handleQRScan = (data) => {
    if (data && data.trim()) {
      setQrData(data.trim());
      setShowPopup(true);
    }
  };

  return (
    <div className="relative p-4 sm:p-6 min-h-screen bg-gray-100">
      {/* ✅ Welcome Overlay (only shows once per login) */}
      {showWelcome && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold text-teal-600">
              Welcome {email ? email : "User"} 🎉
            </h2>
            <p className="text-gray-600 mt-2">Glad to see you back!</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-sans text-gray-800">
          Dashboard
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">Home / Overview</p>
        {email && (
          <p className="mt-1 text-teal-600 font-medium">Welcome, {email} 👋</p>
        )}
        <button
          onClick={handleLogout}
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </header>

      {/* Book Stats Row */}
      <div className="mb-6">
        <BookStats />
      </div>

      {/* Section Label */}
      <div className="mb-3 pt-6 sm:pt-2">
        <h2 className="text-lg sm:text-xl font-sans text-gray-700">
          Reports & Updates
        </h2>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Notifications />
        <TotalBooksReport />
        <Activity />
        <FineQueue />
      </div>

      {/* QR Popup */}
      {showPopup && (
        <QRPopup qrData={qrData} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
