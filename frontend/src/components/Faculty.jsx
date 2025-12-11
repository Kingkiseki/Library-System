import React, { useState, useEffect } from "react";
import QRPopup from "./QRPopup";
import noprofile1 from "../assets/noprofile1.png";
import noprofile2 from "../assets/noprofile2.png";
import bglibrarian from "../assets/bglibrarian.png";

const Faculty = () => {
  // QR Scanner states
  const [qrData, setQrData] = useState(null);
  const [showQRPopup, setShowQRPopup] = useState(false);

  // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("hasShownWelcome");
    window.location.href = "/login";
  };

  // QR SCANNER LISTENER
  useEffect(() => {
    let buffer = "";
    let scannerTimeout;

    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (scannerTimeout) clearTimeout(scannerTimeout);

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 10) {
          let cleanedData = buffer.trim();
          cleanedData = cleanedData
            .replace(/@@\*@@\*@@\*/g, "")
            .replace(/@@\*/g, "")
            .replace(/\*@@/g, "")
            .replace(/@/g, "");

          if (cleanedData.startsWith("{") && cleanedData.endsWith("}")) {
            setQrData(cleanedData);
            setShowQRPopup(true);
          } else if (cleanedData.includes("2025-") || cleanedData.includes("2024-")) {
            const studentNumberMatch = cleanedData.match(/(20\d{2}-\d{4,6})/);
            if (studentNumberMatch) {
              const studentData = JSON.stringify({
                type: "student",
                studentNumber: studentNumberMatch[1],
                fullName: "Scanned Student",
              });
              setQrData(studentData);
              setShowQRPopup(true);
            }
          } else if (buffer.startsWith("{") && buffer.endsWith("}")) {
            setQrData(buffer);
            setShowQRPopup(true);
          } else {
            setQrData(cleanedData);
            setShowQRPopup(true);
          }

          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        scannerTimeout = setTimeout(() => (buffer = ""), 100);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-100 relative">

      {/* ✅ LOGOUT BUTTON — TOP RIGHT */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow-md z-50"
      >
        Logout
      </button>

      {/* Background Section */}
      <div
        className="relative w-full h-72 bg-cover bg-center rounded-lg"
        style={{ backgroundImage: `url(${bglibrarian})` }}
      >
        {/* Title */}
        <div className="absolute top-4 left-6 text-black">
          <h2 className="text-5xl font-sans">Staffs</h2>
          <p className="text-sm">Library Staff</p>
        </div>

        {/* Small profile pics */}
        <div className="absolute -bottom-8 left-6 flex space-x-4">
          {[noprofile1, noprofile2].map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`Staff ${i + 1}`}
                className="w-16 h-16 rounded-full border-4 border-white shadow-md"
              />
              <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
          ))}
        </div>

        {/* Main profile */}
        <div className="absolute -bottom-14 right-10 flex items-center">
          <div className="bg-teal-600 bg-opacity-90 opacity-75 px-10 py-3 min-w-[300px] rounded-l-xl shadow-lg flex items-center justify-end">
            <h3 className="text-white text-xl font-semibold">Jane Gray, RL.</h3>
          </div>

          <div className="relative -ml-6">
            <img
              src={noprofile2}
              alt="Main Librarian"
              className="w-28 h-28 rounded-full border-4 border-white shadow-md"
            />
            <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
        </div>
      </div>

      {/* Vision & Mission */}
      <div className="px-10 py-16 space-y-10">
        <div className="bg-teal-700 text-white rounded-md shadow-md p-6 relative">
          <div className="absolute -top-4 left-6 bg-orange-500 px-4 py-1 text-sm font-bold rounded">
            VISION
          </div>
          <p>
            To be a modern and inclusive library that serves as a gateway to
            knowledge, connecting people with resources, technology, and
            opportunities for lifelong learning. We envision a space where
            traditional and digital tools come together to inspire curiosity,
            support education, and foster a culture of reading and discovery.
          </p>
        </div>

        <div className="bg-teal-700 text-white rounded-md shadow-md p-6 relative">
          <div className="absolute -top-4 left-6 bg-orange-500 px-4 py-1 text-sm font-bold rounded">
            MISSION
          </div>
          <p>
            Our mission is to provide accessible and diverse collections that
            support education, research, and lifelong learning. We are dedicated
            to embracing both traditional and digital systems such as catalogs
            and QR codes to make knowledge more reachable. By creating an
            engaging environment that values curiosity, collaboration, and
            discovery, we strive to empower individuals to grow, innovate, and
            contribute positively to society.
          </p>
        </div>
      </div>

      {showQRPopup && (
        <QRPopup qrData={qrData} onClose={() => setShowQRPopup(false)} />
      )}
    </div>
  );
};

export default Faculty;
