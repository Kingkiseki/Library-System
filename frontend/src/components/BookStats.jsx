import React, { useEffect, useState } from "react";
import api from "../api";
import dashboardBookIcon from "../assets/dashboardbookicon.png";

const BookStats = () => {
  const [stats, setStats] = useState({
    Added: 0,
    Available: 0,
    Borrowed: 0,
    Returned: 0,
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/books/stats", getAuthHeader());
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

  const statsData = [
    { title: "Total Books", value: stats.Added },
    { title: "Available Books", value: stats.Available },
    { title: "Borrowed Books", value: stats.Borrowed },
    { title: "Returned Books", value: stats.Returned },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
      {statsData.map((stat, idx) => (
        <div
          key={idx}
          className="relative h-45 flex items-center pl-5"
          style={{
            backgroundImage: `url(${dashboardBookIcon})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative z-10 flex flex-col justify-between h-full p-4 text-white">
            <h2 className="text-lg font-semibold">{stat.title}</h2>
            <p className="text-sm">{stat.value ?? 0}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookStats;
