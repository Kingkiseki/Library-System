import React, { useEffect, useState } from "react";
import api from "../api";

const FineQueue = () => {
  const [fines, setFines] = useState([]);

  useEffect(() => {
    api.get("/borrow/fines").then(res => setFines(res.data));
  }, []);

  return (
    <div className="bg-teal-700 text-white shadow-lg w-full h-61 flex flex-col"
      style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.4)" }}>
      <div className="p-4 border-b border-white">
        <h2 className="text-2xl font-sans">Fine Queue</h2>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto">
        {fines.length > 0 ? (
          fines.map((fine, index) => (
            <div key={index} className="flex justify-between items-center text-sm border-b border-white pb-2 last:border-b-0">
              <div>
                <p className="font-medium">{fine.student?.fullName || fine.name || 'Unknown'}</p>
                <p className="text-xs opacity-75">{fine.book?.name || fine.bookTitle || 'Unknown Book'}</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-white text-teal-700 rounded-full px-3 py-1 text-xs font-medium">
                  {fine.overdueDays || fine.days || 0} days
                </span>
                <span className="bg-white text-teal-700 rounded-full px-3 py-1 text-xs font-medium">
                  ₱{fine.fineAmount || fine.amount || 0}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm italic">No fines at the moment</p>
        )}
      </div>
    </div>
  );
};

export default FineQueue;
