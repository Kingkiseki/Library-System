import React, { useEffect, useState } from "react";
import api from "../api";

const FineQueue = () => {
  const [fines, setFines] = useState([]);

  useEffect(() => {
    api.get("/borrow/fines").then(res => setFines(res.data));
  }, []);

  return (
    <div className="bg-teal-700 text-white shadow-lg w-full h-61 flex flex-col rounded-xl">
      <div className="p-4 border-b border-white">
        <h2 className="text-lg font-semibold">Fine Queue</h2>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto">
        {fines.map((fine, index) => (
          <div key={index} className="flex justify-between items-center text-sm border-l-2 border-white pl-4">
            <span>{fine.name}</span>
            <div className="flex gap-2">
              <span className="bg-white text-teal-700 rounded-full px-4 py-1 text-xs font-medium">
                {fine.days}
              </span>
              <span className="bg-white text-teal-700 rounded-full px-4 py-1 text-xs font-medium">
                {fine.amount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FineQueue;
