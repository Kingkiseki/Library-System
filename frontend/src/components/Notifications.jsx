import React, { useState, useEffect } from "react";
import api from "../api";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("Today");
  const [notifications, setNotifications] = useState({
    Today: [],
  });

  // Fetch recent registrants (students and teachers)
  useEffect(() => {
    const fetchRecentRegistrants = async () => {
      try {
        const [studentsRes, teachersRes] = await Promise.all([
          api.get("/students"),
          api.get("/teachers")
        ]);
        
        // Get recent students and teachers (created today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const recentStudents = studentsRes.data
          .filter(student => {
            const createdDate = new Date(student.createdAt);
            return createdDate >= today;
          })
          .map(student => ({
            text: `${student.fullName} (Student) registered`,
            time: new Date(student.createdAt).toLocaleTimeString(),
            createdAt: student.createdAt
          }));

        const recentTeachers = teachersRes.data
          .filter(teacher => {
            const createdDate = new Date(teacher.createdAt);
            return createdDate >= today;
          })
          .map(teacher => ({
            text: `${teacher.fullName} (Teacher) registered`,
            time: new Date(teacher.createdAt).toLocaleTimeString(),
            createdAt: teacher.createdAt
          }));

        // Combine and sort by time
        const allRecent = [...recentStudents, ...recentTeachers]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5); // Limit to 5 recent registrants

        setNotifications({
          Today: allRecent.length > 0 ? allRecent : [
            { text: "No new registrants today", time: "N/A" }
          ],
        });
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifications({
          Today: [
            { text: "Error loading notifications", time: "N/A" }
          ],
        });
      }
    };

    fetchRecentRegistrants();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentRegistrants, 30000);
    return () => clearInterval(interval);
  }, []);

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
