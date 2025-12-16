import React, { useState, useEffect } from "react";
import { FaBook, FaList, FaGlobe, FaTabletAlt, FaBookOpen } from "react-icons/fa";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import api from "../api";

const Inventory = () => {
  // State management
  const [activeTab, setActiveTab] = useState("master-list");
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(100); // Fixed at 100 items per page

  // Tab configurations
  const tabConfigs = {
    "master-list": {
      label: "Master List",
      icon: FaList,
      endpoint: "/inventory/master-list",
      fields: [
        { key: "Accession Number", label: "Accession No.", type: "number", required: true },
        { key: "Date Received", label: "Date Received", type: "date", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Call Number", label: "Call Number", type: "text", required: true },
      ]
    },
    "library-collection": {
      label: "Library Collection",
      icon: FaGlobe,
      endpoint: "/inventory/library-collection",
      fields: [
        { key: "No", label: "No." },
        { key: "Collection Type", label: "Collection Type" },
        { key: "Gen Ed Prof Ed", label: "Gen.Ed./Prof.Ed." },
        { key: "Course Name", label: "Course Name" },
        { key: "Book Title", label: "Book Title" },
        { key: "Author", label: "Author" },
        { key: "Publication Year", label: "Publication Year" },
        { key: "No of Book Copies", label: "No. of Book Copies" },
      ]
    },
    "book-holdings": {
      label: "Book Holdings",
      icon: FaBookOpen,
      endpoint: "/inventory/book-holdings",
      fields: [
        { key: "No", label: "No." },
        { key: "Collection Type", label: "Collection Type" },
        { key: "Classification", label: "Classification" },
        { key: "Book Title", label: "Book Title" },
        { key: "Author", label: "Author" },
        { key: "Publication Year", label: "Publication Year" },
        { key: "Volumes", label: "Volumes" },
      ]
    },
    "ebooks": {
      label: "E-books",
      icon: FaBook,
      endpoint: "/inventory/ebooks",
      fields: [
        { key: "Accession Number", label: "Accession No.", type: "number", required: true },
        { key: "Date Received", label: "Date Received", type: "text", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Edition", label: "Edition", type: "text", required: true },
        { key: "Pages", label: "Pages", type: "number", required: true },
        { key: "Publisher", label: "Publisher", type: "text", required: true },
        { key: "Call Number", label: "Call Number", type: "text", required: true },
      ]
    }
  };

  const currentConfig = tabConfigs[activeTab];

  // Initialize form data based on current tab
  const initializeFormData = () => {
    const initialData = {};
    currentConfig.fields.forEach(field => {
      initialData[field.key] = "";
    });
    setFormData(initialData);
  };

  // ✅ Fetch data from backend based on active tab with pagination
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(currentConfig.endpoint, {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: search
        }
      });
      
      // Check if response has pagination data (new format)
      if (res.data.data && res.data.pagination) {
        setData(res.data.data);
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      } else {
        // Fallback for old format (non-paginated)
        setData(res.data);
        setTotalPages(1);
        setTotalItems(res.data.length);
      }
    } catch (err) {
      console.error(`Error fetching ${currentConfig.label}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory stats
  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    // Reset to page 1 when tab changes
    setCurrentPage(1);
    setSelectedItems([]);
    setDeleteMode(false);
    initializeFormData();
  }, [activeTab]);

  useEffect(() => {
    // Fetch data when tab, page, or search changes
    const timer = setTimeout(() => {
      fetchData();
    }, search ? 500 : 0); // 500ms debounce for search, immediate for pagination
    
    return () => clearTimeout(timer);
  }, [activeTab, currentPage, search]);

  useEffect(() => {
    fetchStats();
  }, []);



  // ✅ Add new entry
  const handleAddEntry = async () => {
    // Check if all required fields are filled
    const missingFields = currentConfig.fields.filter(field => 
      field.required && (!formData[field.key] || formData[field.key].toString().trim() === "")
    );

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.map(f => f.label).join(", ")}`);
      return;
    }

    try {
      await api.post(currentConfig.endpoint, formData);
      fetchData();
      setIsModalOpen(false);
      initializeFormData();
      alert(`${currentConfig.label} entry added successfully!`);
    } catch (err) {
      console.error(`Error adding ${currentConfig.label}:`, err.response?.data || err.message);
      alert(err.response?.data?.message || `Failed to add ${currentConfig.label} entry.`);
    }
  };

  // ✅ Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      alert("No items selected.");
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} ${currentConfig.label.toLowerCase()} entry/entries?`
    );
    if (confirmDelete) {
      try {
        for (const idx of selectedItems) {
          const item = data[idx];
          await api.delete(`${currentConfig.endpoint}/${item._id}`);
        }
        fetchData();
        setSelectedItems([]);
        setDeleteMode(false);
        alert("Selected entries deleted successfully!");
      } catch (err) {
        console.error(`Error deleting ${currentConfig.label}:`, err);
        alert(`Failed to delete selected ${currentConfig.label.toLowerCase()} entries.`);
      }
    }
  };

  // ✅ Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });

    const sorted = [...data].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setData(sorted);
  };

  // Search is now handled by backend, so we just display the data
  const filteredData = data;

  // Handle form input changes
  const handleFormChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="p-4 sm:p-6 w-full bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-sans">Inventory Management</h1>
          <p className="text-gray-500 text-sm sm:text-base">Library Collection System</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <FaList className="text-blue-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Master List</p>
              <p className="text-xl font-bold">{stats.masterList || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <FaGlobe className="text-green-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Library Collection</p>
              <p className="text-xl font-bold">{stats.libraryCollection || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <FaBookOpen className="text-purple-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Book Holdings</p>
              <p className="text-xl font-bold">{stats.bookHoldings || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center">
            <FaBook className="text-orange-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">E-books</p>
              <p className="text-xl font-bold">{stats.ebooks || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(tabConfigs).map(([key, config]) => {
          const IconComponent = config.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === key
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 hover:bg-teal-100"
              }`}
            >
              <IconComponent className="mr-2" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* View Only - No Action Buttons */}

      {/* Data Table */}
      <div
        className="bg-white shadow-md rounded-md overflow-hidden"
        style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center bg-teal-700 text-white px-4 py-3">
          {React.createElement(currentConfig.icon, { className: "mr-2" })}
          <h2 className="text-lg font-sans">{currentConfig.label}</h2>
        </div>

        {/* Search */}
        <div className="flex justify-end px-4 py-3 border-b border-gray-300">
          <div className="flex items-center border rounded-lg px-3 py-2 w-full sm:w-80">
            <input
              type="text"
              placeholder={`Search ${currentConfig.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="outline-none text-sm w-full"
            />
            <FiSearch className="text-teal-700 ml-2" />
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 mt-4">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b text-center">
                    {deleteMode && <th className="px-3 py-3 border">Select</th>}
                    {currentConfig.fields.map((field) => (
                      <th
                        key={field.key}
                        onClick={() => handleSort(field.key)}
                        className="px-3 py-3 border cursor-pointer hover:bg-gray-200 font-medium"
                      >
                        {field.label}{" "}
                        {sortConfig.key === field.key
                          ? sortConfig.direction === "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={currentConfig.fields.length} className="text-center text-gray-400 py-10 border">
                        {search ? `No results found for "${search}"` : `No ${currentConfig.label.toLowerCase()} entries found`}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, idx) => (
                      <tr key={item._id || idx} className="border-b text-center hover:bg-gray-50">
                        {currentConfig.fields.map((field) => (
                          <td key={field.key} className="px-3 py-3 border">
                            {field.type === "date" && item[field.key] 
                              ? new Date(item[field.key]).toLocaleDateString()
                              : item[field.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-1 border rounded bg-teal-600 text-white text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Inventory;
