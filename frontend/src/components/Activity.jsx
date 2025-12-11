import React, { useEffect, useState } from "react";
import api from "../api";

const Activity = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api.get("/borrow/activities").then((res) => setActivities(res.data));
  }, []);

  return (
    <div
      className="bg-teal-700 text-white shadow-lg w-full h-61 flex flex-col rounded-xl"
      style={{
        boxShadow: "8px 8px 20px rgba(0,0,0,0.4)", // 3D shadow on right & bottom
      }}
    >
      {/* Header with underline */}
      <div className="p-4 border-b border-white">
        <h2 className="text-2xl font-sans">Activity</h2>
      </div>

      {/* Activity List */}
      <div className="p-4 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div
              key={activity._id || index}
              className="text-sm py-2 border-b border-white last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {activity.student?.fullName || activity.student?.name || 'Unknown Student'}
                </span>
                <span className="text-xs opacity-75">
                  {activity.returned ? 'Returned' : 'Borrowed'}
                </span>
              </div>
              <div className="text-xs opacity-90 mt-1">
                Book: {
                  activity.inventoryItemData?.booktitle ||
                  activity.inventoryItemData?.["Book Title"] ||
                  activity.book?.name ||
                  activity.book?.title ||
                  'Unknown Book'
                }
              </div>
              <div className="text-xs opacity-75">
                {new Date(activity.borrowedAt || activity.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm italic">No activities yet.</p>
        )}
      </div>
    </div>
  );
};

export default Activity;
