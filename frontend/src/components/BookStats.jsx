// frontend/src/components/BookStats.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

const BookStats = () => {
  const [available, setAvailable] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/book-stats");
      setAvailable(res.data.Available ?? 0);
    } catch (err) {
      console.error("Error fetching book stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-6">
      <div
        className="relative h-40 flex items-center justify-center rounded-xl overflow-hidden bg-teal-700 shadow-md group transition-all"
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center text-white px-4">
          <h2 className="text-lg font-semibold">Available Books</h2>
          <p className="text-sm mt-1">{available} Available</p>
        </div>
      </div>
    </div>
  );
};

export default BookStats;
