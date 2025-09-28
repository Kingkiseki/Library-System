import React, { useEffect, useState } from "react";
import api from "../api";

const Activity = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api.get("/borrow/activities").then(res => setActivities(res.data));
  }, []);

  return (
    <div className="bg-teal-700 text-white shadow-lg w-full h-61 flex flex-col">
      <div className="p-4 border-b border-white">
        <h2 className="text-2xl font-sans">Activity</h2>
      </div>
      <div className="p-4 overflow-y-auto">
        {activities.map((activity, index) => (
          <div key={index} className="text-sm py-2 border-b border-white last:border-b-0">
            {activity}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Activity;
