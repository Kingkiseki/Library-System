import React, { useState, useEffect } from "react";
import { FaBook, FaList, FaGlobe, FaBookOpen } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import api from "../api";

const Library = () => {
  // State management - Read-only, no CRUD operations
  const [activeTab, setActiveTab] = useState("master-list");
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [loading, setLoading] = useState(false);

  // Tab configurations - Read-only view
  const tabConfigs = {
    "master-list": {
      label: "Master List",
      icon: FaList,
      endpoint: "/inventory/master-list",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "number" },
        { key: "Date Received", label: "Date Received", type: "date" },
        { key: "Author", label: "Author", type: "text" },
        { key: "Book Title", label: "Book Title", type: "text" },
        { key: "Edition", label: "Edition", type: "text" },
        { key: "Volume", label: "Volume", type: "number" },
        { key: "Pages", label: "Pages", type: "number" },
        { key: "Publisher", label: "Publisher", type: "text" },
        { key: "Copyright", label: "Copyright", type: "text" },
        { key: "Call Number", label: "Call Number", type: "text" },
      ]
    },
    "library-collection": {
      label: "Library Collection",
      icon: FaGlobe,
      endpoint: "/inventory/library-collection",
      fields: [
        { key: "No", label: "No.", type: "number" },
        { key: "Collection Type", label: "Collection Type", type: "text" },
        { key: "Gen.Ed./Prof.Ed.", label: "Gen.Ed./Prof.Ed.", type: "text" },
        { key: "Course Name", label: "Course Name", type: "text" },
        { key: "Book Title", label: "Book Title", type: "text" },
        { key: "Author", label: "Author", type: "text" },
        { key: "Publication Year", label: "Publication Year", type: "number" },
        { key: "No. of Book Copies", label: "No. of Book Copies", type: "number" },
      ]
    },
    "book-holdings": {
      label: "Book Holdings",
      icon: FaBookOpen,
      endpoint: "/inventory/book-holdings",
      fields: [
        { key: "No", label: "No.", type: "number" },
        { key: "Collection Type", label: "Collection Type", type: "text" },
        { key: "Classification", label: "Classification", type: "text" },
        { key: "Course Name", label: "Course Name", type: "text" },
        { key: "Book Title", label: "Book Title", type: "text" },
        { key: "Author", label: "Author", type: "text" },
        { key: "Publication Year", label: "Publication Year", type: "number" },
        { key: "Volumes", label: "Volumes", type: "number" },
      ]
    },
    "ebooks": {
      label: "E-books",
      icon: FaBook,
      endpoint: "/inventory/ebooks",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "number" },
        { key: "Date Received", label: "Date Received", type: "date" },
        { key: "Author", label: "Author", type: "text" },
        { key: "Book Title", label: "Book Title", type: "text" },
        { key: "Edition", label: "Edition", type: "text" },
        { key: "Volume", label: "Volume", type: "number" },
        { key: "Pages", label: "Pages", type: "number" },
        { key: "Publisher", label: "Publisher", type: "text" },
        { key: "Copyright", label: "Copyright", type: "text" },
        { key: "Call Number", label: "Call Number", type: "text" },
      ]
    }
  };

  const currentConfig = tabConfigs[activeTab];

  // Fetch data from backend based on active tab (Read-only)
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(currentConfig.endpoint);
      setData(res.data);
    } catch (err) {
      console.error(`Error fetching ${currentConfig.label}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory stats (Read-only)
  const fetchStats = async () => {
    try {
      const statsRes = await api.get("/inventory/stats");
      setStats(statsRes.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Filter and sort data for display
  const filteredData = data
    .filter(item => {
      if (!search) return true;
      return currentConfig.fields.some(field => 
        String(item[field.key] || "").toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Library Collection Viewer</h1>
          <p className="text-gray-600">Browse all library inventory collections</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(tabConfigs).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats[key] || 0;
            return (
              <div key={key} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <Icon className="text-2xl text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">{config.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {Object.entries(tabConfigs).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${currentConfig.label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {currentConfig.fields.map(field => (
                      <th
                        key={field.key}
                        onClick={() => handleSort(field.key)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{field.label}</span>
                          {sortConfig.key === field.key && (
                            <span className="text-blue-600">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={currentConfig.fields.length} className="px-6 py-12 text-center text-gray-500">
                        No {currentConfig.label.toLowerCase()} found
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        {currentConfig.fields.map(field => (
                          <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {field.type === "url" && item[field.key] ? (
                              <a
                                href={item[field.key]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Link
                              </a>
                            ) : field.type === "date" ? (
                              new Date(item[field.key]).toLocaleDateString()
                            ) : (
                              item[field.key] || "N/A"
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {currentConfig.label} Summary
          </h3>
          <p className="text-gray-600">
            Total items: <span className="font-medium">{filteredData.length}</span>
            {search && ` (filtered from ${data.length} total)`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Library;