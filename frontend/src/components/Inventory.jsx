import React, { useState, useEffect } from "react";
import { FaBook, FaList, FaGlobe, FaTabletAlt } from "react-icons/fa";
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
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

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
        { key: "no", label: "No.", type: "number", required: true },
        { key: "Type", label: "Type", type: "text", required: true },
        { key: "Name Publisher", label: "Name Publisher", type: "text", required: true },
        { key: "Publication", label: "Publication", type: "text", required: true },
        { key: "Frequency", label: "Frequency", type: "text", required: true },
        { key: "Regular Subscription", label: "Regular Subscription", type: "number", required: true },
        { key: "Supporting Documents Link", label: "Supporting Documents Link", type: "url", required: true },
      ]
    },
    "book-holdings": {
      label: "Book Holdings",
      icon: FaBookOpen,
      endpoint: "/inventory/book-holdings",
      fields: [
        { key: "no", label: "No.", type: "number", required: true },
        { key: "coltype", label: "Collection Type", type: "text", required: true },
        { key: "classification", label: "Classification", type: "text", required: true },
        { key: "booktitle", label: "Book Title", type: "text", required: true },
        { key: "author", label: "Author", type: "text", required: true },
        { key: "pubyear", label: "Publication Year", type: "number", required: true },
        { key: "volumes", label: "Volumes", type: "number", required: true },
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

  // ✅ Fetch data from backend based on active tab
  const fetchData = async () => {
    try {
      const res = await api.get(currentConfig.endpoint);
      setData(res.data);
    } catch (err) {
      console.error(`Error fetching ${currentConfig.label}:`, err);
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
    fetchData();
    initializeFormData();
    setSelectedItems([]);
    setDeleteMode(false);
    setEditMode(false);
  }, [activeTab]);

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

  // ✅ Filter search
  const filteredData = data.filter((item) => {
    const query = search.toLowerCase();
    return currentConfig.fields.some(field => {
      const value = item[field.key];
      return value && value.toString().toLowerCase().includes(query);
    });
  });

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

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          title={`Add ${currentConfig.label} Entry`}
        >
          <FiPlus className="mr-2" />
          Add {currentConfig.label}
        </button>

        <button
          onClick={() => {
            if (deleteMode) handleDeleteSelected();
            else setDeleteMode(true);
          }}
          className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
            deleteMode
              ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
              : "bg-white text-red-600 border-red-600 hover:bg-red-50"
          }`}
          title={deleteMode ? "Confirm Delete" : "Delete Mode"}
        >
          <FiX className="mr-2" />
          {deleteMode ? "Confirm Delete" : "Delete Mode"}
        </button>

        {deleteMode && (
          <button
            onClick={() => {
              setDeleteMode(false);
              setSelectedItems([]);
            }}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

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
                  <td colSpan={currentConfig.fields.length + (deleteMode ? 1 : 0)} className="text-center text-gray-400 py-10 border">
                    No {currentConfig.label.toLowerCase()} entries found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item._id || idx} className="border-b text-center hover:bg-gray-50">
                    {deleteMode && (
                      <td className="px-3 py-3 border">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(idx)}
                          onChange={() =>
                            setSelectedItems((prev) =>
                              prev.includes(idx)
                                ? prev.filter((i) => i !== idx)
                                : [...prev, idx]
                            )
                          }
                        />
                      </td>
                    )}
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
      </div>

      {/* Modal (Add Book) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-md shadow-lg w-80">
            <h2 className="text-lg font-semibold mb-4">Add New Book</h2>
            {Object.keys(newBook).map((key) => (
              <input
                key={key}
                name={key}
                value={newBook[key]}
                onChange={(e) => setNewBook({ ...newBook, [key]: e.target.value })}
                placeholder={key.toUpperCase()}
                className="w-full border rounded px-2 py-1 mb-2 text-sm"
              />
            ))}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBook}
                className="px-3 py-1 bg-teal-600 text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Adding/Editing Items */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingItem ? `Edit ${currentConfig.label}` : `Add New ${currentConfig.label}`}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  setFormData({});
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentConfig.fields.map((field) => (
                  <div key={field.key} className="mb-4">
                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === "textarea" ? (
                      <textarea
                        id={field.key}
                        name={field.key}
                        rows={3}
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={field.key}
                        name={field.key}
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || "text"}
                        id={field.key}
                        name={field.key}
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingItem ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
