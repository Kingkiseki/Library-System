import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import api from "../api";

const TotalBooksReport = () => {
  const [range, setRange] = useState("Weekly"); // keeping dropdown
  const [stats, setStats] = useState({
    Added: 0,
    Available: 0,
    Borrowed: 0,
    Returned: 0
  });

  useEffect(() => {
    api.get("/books/stats").then(res => setStats(res.data));
  }, []);

  const getData = () => [
    { category: "Added", value: stats.Added },
    { category: "Available", value: stats.Available },
    { category: "Borrowed", value: stats.Borrowed },
    { category: "Returned", value: stats.Returned },
  ];

  const colors = {
    Added: "#f87171",     // red
    Available: "#34d399", // green
    Borrowed: "#60a5fa",  // blue
    Returned: "#facc15",  // yellow
  };

  return (
    <div className="bg-teal-700 text-white shadow-md p-4 h-65">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-sans text-2xl">Total Books Report</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-teal-600 text-white text-sm px-2 py-1 rounded-md"
        >
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>
      </div>

      {/* Chart + Legend */}
      <div className="flex items-center h-[200px]">
        <div className="flex-1 h-50">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getData()} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="category" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} label={{ position: "top", fill: "#fff" }}>
                {getData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[entry.category] || "#34d399"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="ml-3 space-y-1 text-sm">
          {Object.entries(colors).map(([key, color]) => (
            <div key={key} className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: color }}></span>
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TotalBooksReport;
