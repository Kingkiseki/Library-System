import React, { useState } from "react";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("Today");

  const notifications = {
    Today: [
      { text: "Zaldy COrrupt", time: "1 minute ago" },
    ]
  };

  return (
    <div
      className="bg-teal-700 text-white p-0 w-full"
      style={{
        boxShadow: "8px 8px 20px rgba(0,0,0,0.4)", // 3D shadow on right & bottom
      }}
    >
      {/* Title */}
      <h2 className="text-2xl font-sans m-3">New Registrant</h2>

      {/* Tabs */}
      
      <div className="flex space-x-4 border-b p-2 border-white mb-3">
    
      </div> 

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications[activeTab].map((note, index) => (
          <div
            key={index}
            className="flex justify-between items-center border-b border-white pb-2 m-3"
          >
            <p
              className={`text-sm ${
                note.text.includes("")
                  ? "text-white font-medium"
                  : "font-medium"
              }`}
            >
              {note.text}
            </p>
            <span className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full shadow-md">
              {note.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
