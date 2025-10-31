// frontend/src/components/BookStats.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import dashboardBookIcon1 from "../assets/DashboardBookIcon1.png";
import dashboardBookIcon2 from "../assets/DashboardBookIcon2.png";
import dashboardBookIcon3 from "../assets/DashboardBookIcon3.png";
import dashboardBookIcon4 from "../assets/DashboardBookIcon.png"; // for Returned

const BookStats = () => {
  const [stats, setStats] = useState({
    Added: 0,
    Available: 0,
    Borrowed: 0,
    Returned: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/book-stats");
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching book stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Data with icons
  const statsData = [
    {
      title: "Added Books",
      value: `${stats.Added ?? 0} New Books`,
      icon: dashboardBookIcon1,
    },
    {
      title: "Available Books",
      value: `${stats.Available ?? 0} Available`,
      icon: dashboardBookIcon2,
    },
    {
      title: "Borrowed Books",
      value: `${stats.Borrowed ?? 0} Borrowed`,
      icon: dashboardBookIcon3,
    },
    {
      title: "Returned Books",
      value: `${stats.Returned ?? 0} Returned`,
      icon: dashboardBookIcon4,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, idx) => (
        <div
          key={idx}
          className="relative h-40 flex items-center justify-center rounded-xl overflow-hidden group"
          style={{
            backgroundImage: `url(${stat.icon})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 group-hover:bg-opacity-60 transition-all"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center text-white px-4">
            <h2 className="text-lg font-semibold">{stat.title}</h2>
            <p className="text-sm mt-1">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookStats;
