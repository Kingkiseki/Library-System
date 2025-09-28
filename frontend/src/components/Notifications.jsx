import React, { useState } from "react";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("Today");

  const notifications = {
    Today: [
      { text: "10 Book in total has been returned", time: "1 minute ago" },
    ],
    Week: [
      { text: "5 Students are overdue", time: "3 days ago" },
      { text: "Fire and Blood Book has been added", time: "1 week ago" },
    ],
    Month: [
      { text: "New Semester has started", time: "2 weeks ago" },
      { text: "30 Books borrowed", time: "3 weeks ago" },
    ],
  };

  return (
    <div className="bg-teal-700 text-white p-4 w-full">
      {/* Title */}
      <h2 className="text-2xl font-sans mb-2">Notifications</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-white/50 mb-3">
        {["Today", "Week", "Month"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-1 text-sm ${
              activeTab === tab
                ? "border-b-2 border-amber-600 font-semibold"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications[activeTab].map((note, index) => (
          <div
            key={index}
            className="flex justify-between items-center border-b border-white/40 pb-2"
          >
            <p
              className={`text-sm ${
                note.text.includes("overdue")
                  ? "text-red-300 font-medium"
                  : "font-medium"
              }`}
            >
              {note.text}
            </p>
            <span className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full shadow">
              {note.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
