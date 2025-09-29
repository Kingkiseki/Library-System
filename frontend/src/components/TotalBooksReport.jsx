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
  const [range, setRange] = useState("Weekly");
  const [stats, setStats] = useState({
    Added: 0,
    Available: 0,
    Borrowed: 0,
    Returned: 0,
  });

  // ✅ Fetch backend stats
  useEffect(() => {
    api.get("/books/stats").then((res) => setStats(res.data));
  }, []);

  // ✅ Static fallback data for demo/testing
  const weeklyData = [
    { category: "Added", value: 120 },
    { category: "Available", value: 980 },
    { category: "Borrowed", value: 230 },
    { category: "Returned", value: 150 },
  ];

  const monthlyData = [
    { category: "Added", value: 520 },
    { category: "Available", value: 4100 },
    { category: "Borrowed", value: 920 },
    { category: "Returned", value: 700 },
  ];

  const yearlyData = [
    { category: "Added", value: 6200 },
    { category: "Available", value: 48000 },
    { category: "Borrowed", value: 10900 },
    { category: "Returned", value: 8900 },
  ];

  // ✅ Get data either from backend or fallback static
  const getData = () => {
    const backendData = [
      { category: "Added", value: stats.Added },
      { category: "Available", value: stats.Available },
      { category: "Borrowed", value: stats.Borrowed },
      { category: "Returned", value: stats.Returned },
    ];

    // If backend returns all zeros, fallback to static sample
    if (backendData.every((item) => item.value === 0)) {
      if (range === "Weekly") return weeklyData;
      if (range === "Monthly") return monthlyData;
      if (range === "Yearly") return yearlyData;
    }

    return backendData;
  };

  const colors = {
    Added: "#f87171", // red
    Available: "#34d399", // green
    Borrowed: "#60a5fa", // blue
    Returned: "#facc15", // yellow
  };

  return (
    <div
      className="bg-teal-700 text-white p-4 h-65"
      style={{
        boxShadow: "8px 8px 25px rgba(0,0,0,0.45)", // ✅ 3D shadow
      }}
    >
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
        {/* Chart */}
        <div className="flex-1 h-50">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getData()}
              margin={{ top: 20, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis dataKey="category" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip />
              <Bar
                dataKey="value"
                radius={[5, 5, 0, 0]}
                label={{ position: "top", fill: "#fff" }}
              >
                {getData().map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[entry.category] || "#34d399"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="ml-3 space-y-1 text-sm">
          {Object.entries(colors).map(([key, color]) => (
            <div key={key} className="flex items-center space-x-1">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              ></span>
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TotalBooksReport;
