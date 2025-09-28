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
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

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
    } catch (err) {
      console.error(err);
      window.location.href = "/login";
    }
  };

  const handleQRScan = (data) => {
    setQrData(data);
    setShowPopup(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-100">
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
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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

      {/* QR Scanner Simulation */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Simulate QR Scan (paste QR data)"
          onKeyDown={(e) => e.key === "Enter" && handleQRScan(e.target.value)}
          className="border p-2 w-full"
        />
      </div>

      {showPopup && (
        <QRPopup qrData={qrData} onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
