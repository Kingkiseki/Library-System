// frontend/src/components/BookShelf.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaBook, FaBookOpen, FaList, FaGlobe, FaDatabase, FaDownload } from "react-icons/fa";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";
import QRPopup from "./QRPopup";
import api from "../api"; // ✅ connect to backend

const BookShelf = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [importedData, setImportedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importFile, setImportFile] = useState(null);



  const [newBook, setNewBook] = useState({
    name: "",
    isbn: "",
    genre: "",
    author: "",
    color: "",
    copies: "",
    status: "Available",
  });
  const [search, setSearch] = useState("");
  // sorting removed: columns will no longer be clickable for sorting
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("masterlist");
  const [inventoryData, setInventoryData] = useState({});

  // Category configurations with detailed field definitions for CRUD operations
  const categoryConfig = {
    masterlist: {
      label: "Master List",
      icon: FaList,
      apiEndpoint: "/inventory/master-list",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "number", required: true },
        { key: "Date Received", label: "Date Received", type: "date", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Edition", label: "Edition", type: "text", required: true },
        { key: "Volume", label: "Volume", type: "number", required: true },
        { key: "Pages", label: "Pages", type: "number", required: true },
        { key: "Publisher", label: "Publisher", type: "text", required: true },
        { key: "Copyright", label: "Copyright", type: "text", required: true },
        { key: "Call Number", label: "Call Number", type: "text", required: true }
      ]
    },
    librarycollection: {
      label: "Library Collection",
      icon: FaDatabase,
      apiEndpoint: "/inventory/library-collection",
      fields: [
        { key: "No", label: "No.", type: "number", required: true },
        { key: "Collection Type", label: "Collection Type", type: "text", required: true },
        { key: "Gen.Ed./Prof.Ed.", label: "Gen.Ed./Prof.Ed.", type: "text", required: true },
        { key: "Course Name", label: "Course Name", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Publication Year", label: "Publication Year", type: "number", required: true },
        { key: "No. of Book Copies", label: "No. of Book Copies", type: "number", required: true }
      ]
    },
    bookholdings: {
      label: "Book Holdings",
      icon: FaBookOpen,
      apiEndpoint: "/inventory/book-holdings",
      fields: [
        { key: "No", label: "No.", type: "number", required: true },
        { key: "Collection Type", label: "Collection Type", type: "text", required: true },
        { key: "Classification", label: "Classification", type: "text", required: true },
        { key: "Course Name", label: "Course Name", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Publication Year", label: "Publication Year", type: "number", required: true },
        { key: "Volumes", label: "Volumes", type: "number", required: true }
      ]
    },
    ebooks: {
      label: "E-Books",
      icon: FaGlobe,
      apiEndpoint: "/inventory/ebooks",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "number", required: true },
        { key: "Date Received", label: "Date Received", type: "date", required: true },
        { key: "Author", label: "Author", type: "text", required: true },
        { key: "Book Title", label: "Book Title", type: "text", required: true },
        { key: "Edition", label: "Edition", type: "text", required: true },
        { key: "Volume", label: "Volume", type: "number", required: true },
        { key: "Pages", label: "Pages", type: "number", required: true },
        { key: "Publisher", label: "Publisher", type: "text", required: true },
        { key: "Copyright", label: "Copyright", type: "text", required: true },
        { key: "Call Number", label: "Call Number", type: "text", required: true }
      ]
    }
  };

  // QR Scanner states
  const [qrData, setQrData] = useState(null);
  const [showQRPopup, setShowQRPopup] = useState(false);

  const qrRef = useRef(null);
  const bookQRRef = useRef(null);
  const editQRRef = useRef(null);

  // ✅ Fetch inventory data from backend
  const fetchInventoryData = async (category) => {
    try {
      const endpoint = categoryConfig[category]?.apiEndpoint;
      if (!endpoint) return;

      const res = await api.get(endpoint);
      setInventoryData(prev => ({
        ...prev,
        [category]: res.data
      }));
    } catch (err) {
      console.error(`Error fetching ${category} data:`, err);
    }
  };

  // ✅ Handle Excel file import
  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert("Excel file is empty!");
          return;
        }

        setImportedData(jsonData);

        // Auto-detect column mapping
        const excelHeaders = Object.keys(jsonData[0]);
        const currentConfig = categoryConfig[activeCategory];
        const autoMapping = {};

        // Try to match Excel headers with field keys
        excelHeaders.forEach(excelHeader => {
          const lowerExcel = excelHeader.toLowerCase().trim();
          const matchedField = currentConfig.fields.find(field =>
            field.key.toLowerCase() === lowerExcel ||
            field.label.toLowerCase() === lowerExcel
          );
          if (matchedField) {
            autoMapping[excelHeader] = matchedField.key;
          }
        });

        setColumnMapping(autoMapping);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        alert("Error reading Excel file. Please ensure it's a valid .xlsx or .csv file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ✅ Handle column mapping change
  const handleMappingChange = (excelColumn, fieldKey) => {
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: fieldKey
    }));
  };

  // ✅ Submit imported data
  const handleImportSubmit = async () => {
    try {
      const currentConfig = categoryConfig[activeCategory];
      const itemsToAdd = [];

      // Transform imported data based on column mapping
      importedData.forEach(row => {
        const mappedItem = {};
        Object.entries(columnMapping).forEach(([excelCol, fieldKey]) => {
          if (fieldKey && row[excelCol] !== undefined) {
            mappedItem[fieldKey] = row[excelCol];
          }
        });

        // Only add if at least one field is mapped
        if (Object.keys(mappedItem).length > 0) {
          itemsToAdd.push(mappedItem);
        }
      });

      if (itemsToAdd.length === 0) {
        alert("No valid data to import after mapping.");
        return;
      }

      // Send data to backend
      let successCount = 0;
      let failureCount = 0;

      for (const item of itemsToAdd) {
        try {
          await api.post(currentConfig.apiEndpoint, item);
          successCount++;
        } catch (err) {
          console.error("Error importing item:", err);
          failureCount++;
        }
      }

      alert(`Import complete: ${successCount} items added, ${failureCount} items failed.`);

      // Refresh data and close modal
      fetchInventoryData(activeCategory);
      setIsImportModalOpen(false);
      setImportedData([]);
      setColumnMapping({});
      setImportFile(null);

      // Reset file input
      const fileInput = document.getElementById("excel-import-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Error submitting import:", err);
      alert("Error importing data. Please try again.");
    }
  };

  useEffect(() => {
    // Fetch all inventory categories on component mount
    Object.keys(categoryConfig).forEach(category => {
      fetchInventoryData(category);
    });
  }, []);

  // Refetch data when active category changes
  useEffect(() => {
    fetchInventoryData(activeCategory);
  }, [activeCategory]);

  // Global QR scanner listener
  useEffect(() => {
    let buffer = "";
    let scannerTimeout;

    const handleKeyDown = (e) => {
      // Ignore special keys and focus on input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("QR Scanner - Raw input:", trimmedBuffer);
          console.log("QR Scanner - Length:", trimmedBuffer.length);

          // Clean up the corrupted QR data
          let cleanedData = trimmedBuffer;

          // Remove scanner artifacts like @@*@@*@@*
          cleanedData = cleanedData.replace(/@@\*@@\*@@\*/g, '');
          cleanedData = cleanedData.replace(/@@\*/g, '');
          cleanedData = cleanedData.replace(/\*@@/g, '');
          cleanedData = cleanedData.replace(/@/g, '');

          console.log("QR Scanner - Cleaned input:", cleanedData);

          // Check if it looks like JSON after cleaning
          if (cleanedData.startsWith('{') && cleanedData.endsWith('}')) {
            console.log("QR Scanner - JSON format detected after cleaning");
            setQrData(cleanedData);
            setShowQRPopup(true);
          }
          // Handle student number format (like b6d349212B72767949450*2025-000010)
          else if (cleanedData.includes('2025-') || cleanedData.includes('2024-')) {
            console.log("QR Scanner - Student number format detected:", cleanedData);
            // Extract student number (looks like 2025-000010)
            const studentNumberMatch = cleanedData.match(/(20\d{2}-\d{4,6})/);
            if (studentNumberMatch) {
              const studentNumber = studentNumberMatch[1];
              console.log("QR Scanner - Extracted student number:", studentNumber);
              // Create a fake JSON for the student number
              const studentData = JSON.stringify({
                type: "student",
                studentNumber: studentNumber,
                fullName: "Scanned Student"
              });
              setQrData(studentData);
              setShowQRPopup(true);
            }
          }
          // Handle pure JSON format
          else if (trimmedBuffer.startsWith('{') && trimmedBuffer.endsWith('}')) {
            console.log("QR Scanner - Pure JSON format detected");
            setQrData(trimmedBuffer);
            setShowQRPopup(true);
          }
          // Handle any other legacy formats
          else {
            console.log("QR Scanner - Trying as legacy format:", cleanedData);
            setQrData(cleanedData);
            setShowQRPopup(true);
          }
          buffer = "";
        } else {
          console.log("QR Scanner - Buffer too short or empty:", buffer.trim());
        }
      } else if (e.key.length === 1) { // Only capture printable characters
        buffer += e.key;

        // Auto-clear buffer after 100ms of no input (scanner inputs are very fast)
        scannerTimeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewBook((prev) => ({ ...prev, [name]: value }));
  };

  // Edit book functionality
  const handleEditBook = (book) => {
    setSelectedBook(book);
    setNewBook({
      name: book.name,
      isbn: book.isbn,
      genre: book.genre,
      author: book.author,
      color: book.color,
      copies: book.copies.toString(),
      status: book.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBook = async () => {
    const currentConfig = getCurrentConfig();

    // Validate required fields based on category
    if (activeCategory === "traditional") {
      if (!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre) {
        alert("Please fill out all required fields.");
        return;
      }
    }

    let itemToUpdate = { ...newBook };
    let endpoint = `${currentConfig.apiEndpoint}/${selectedBook._id}`;

    try {
      await api.put(endpoint, itemToUpdate);

      // Refresh data
      fetchInventoryData(activeCategory);
      setIsEditModalOpen(false);
      setSelectedBook(null);
      setNewBook({
        name: "",
        isbn: "",
        genre: "",
        author: "",
        color: "",
        copies: "",
        status: "Available",
      });
    } catch (err) {
      console.error("Error updating book:", err.response?.data || err.message);
      alert("Failed to update book.");
    }
  };

  // Show individual book QR code
  const handleShowQRCode = (item) => {
    setSelectedBook(item);
    setQrData({
      type: "inventory",
      inventoryItemId: item._id,
      inventoryType: activeCategory === "masterlist" ? "MasterList" :
        activeCategory === "librarycollection" ? "LibraryCollection" :
          activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
      title: item.booktitle || item["Book Title"] || item.name || "Unknown Item",
      author: item.author || item.Author || "Unknown Author",
      category: activeCategory
    });
    setShowQRPopup(true);
  };

  // Download Individual Book QR
  const handleDownloadBookQR = () => {
    const canvas = bookQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedBook.name}-${selectedBook.isbn}-qr.png`;
    link.click();
  };

  // Print Individual Book QR
  const handlePrintBookQR = () => {
    const canvas = bookQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");

    const printWindow = window.open('', '_blank');
    const url = canvas.toDataURL("image/png");

    printWindow.document.write(`
      <html>
        <head>
          <title>Book QR Code - ${selectedBook.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
              margin: 0;
            }
            .header { 
              margin-bottom: 20px; 
            }
            .qr-container { 
              margin: 20px 0; 
            }
            .book-info { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Book QR Code</h1>
            <h2>${selectedBook.name}</h2>
          </div>
          <div class="qr-container">
            <img src="${url}" alt="Book QR Code" style="width: 200px; height: 200px;">
          </div>
          <div class="book-info">
            <p><strong>Book:</strong> ${selectedBook.name}</p>
            <p><strong>ISBN:</strong> ${selectedBook.isbn}</p>
            <p><strong>Author:</strong> ${selectedBook.author}</p>
            <p><strong>Genre:</strong> ${selectedBook.genre}</p>
            <p style="margin-top: 15px; font-size: 12px;">
              Scan this QR code to access book information for library borrowing
            </p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download New Book QR (from add modal)
  const handleDownloadNewBookQR = () => {
    if (!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre) {
      alert("Please fill out all required fields before downloading QR code.");
      return;
    }
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${newBook.name}-${newBook.isbn}-qr.png`;
    link.click();
  };

  // Print New Book QR (from add modal)
  const handlePrintNewBookQR = () => {
    if (!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre) {
      alert("Please fill out all required fields before printing QR code.");
      return;
    }
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");

    const printWindow = window.open('', '_blank');
    const url = canvas.toDataURL("image/png");

    printWindow.document.write(`
      <html>
        <head>
          <title>New Book QR Code - ${newBook.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
              margin: 0;
            }
            .header { 
              margin-bottom: 20px; 
            }
            .qr-container { 
              margin: 20px 0; 
            }
            .book-info { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Book QR Code</h1>
            <h2>${newBook.name}</h2>
          </div>
          <div class="qr-container">
            <img src="${url}" alt="Book QR Code" style="width: 200px; height: 200px;">
          </div>
          <div class="book-info">
            <p><strong>Book:</strong> ${newBook.name}</p>
            <p><strong>ISBN:</strong> ${newBook.isbn}</p>
            <p><strong>Author:</strong> ${newBook.author}</p>
            <p><strong>Genre:</strong> ${newBook.genre}</p>
            ${newBook.color ? `<p><strong>Color:</strong> ${newBook.color}</p>` : ''}
            <p style="margin-top: 15px; font-size: 12px;">
              Scan this QR code to access book information for library borrowing
            </p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download Edit Book QR (from edit modal)
  const handleDownloadEditBookQR = () => {
    if (!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre) {
      alert("Please fill out all required fields before downloading QR code.");
      return;
    }
    const canvas = editQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${newBook.name}-${newBook.isbn}-qr.png`;
    link.click();
  };

  // Print Edit Book QR (from edit modal)
  const handlePrintEditBookQR = () => {
    if (!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre) {
      alert("Please fill out all required fields before printing QR code.");
      return;
    }
    const canvas = editQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");

    const printWindow = window.open('', '_blank');
    const url = canvas.toDataURL("image/png");

    printWindow.document.write(`
      <html>
        <head>
          <title>Edit Book QR Code - ${newBook.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
              margin: 0;
            }
            .header { 
              margin-bottom: 20px; 
            }
            .qr-container { 
              margin: 20px 0; 
            }
            .book-info { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Book QR Code</h1>
            <h2>${newBook.name}</h2>
          </div>
          <div class="qr-container">
            <img src="${url}" alt="Book QR Code" style="width: 200px; height: 200px;">
          </div>
          <div class="book-info">
            <p><strong>Book:</strong> ${newBook.name}</p>
            <p><strong>ISBN:</strong> ${newBook.isbn}</p>
            <p><strong>Author:</strong> ${newBook.author}</p>
            <p><strong>Genre:</strong> ${newBook.genre}</p>
            ${newBook.color ? `<p><strong>Color:</strong> ${newBook.color}</p>` : ''}
            <p style="margin-top: 15px; font-size: 12px;">
              Scan this QR code to access book information for library borrowing
            </p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ✅ Add book/inventory item to database
  const handleAddBook = async () => {
    const currentConfig = getCurrentConfig();

    // For traditional books (now using book-holdings), map the fields
    // Add inventory item using direct field mapping
    let itemToAdd = { ...newBook };

    try {
      await api.post(currentConfig.apiEndpoint, itemToAdd);
      fetchInventoryData(activeCategory);

      setIsModalOpen(false);
      setNewBook({
        name: "",
        isbn: "",
        genre: "",
        author: "",
        color: "",
        copies: "",
        status: "Available",
      });
    } catch (err) {
      console.error("Error adding item:", err);
      alert("Failed to add item.");
    }
  };

  // ✅ Delete items from database
  const handleDeleteSelected = async () => {
    if (selectedBooks.length === 0) {
      alert("No items selected.");
      return;
    }

    const currentConfig = getCurrentConfig();

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedBooks.length} item(s)?`
    );

    if (confirmDelete) {
      try {
        const dataSource = getCurrentData();

        for (const idx of selectedBooks) {
          const item = dataSource[idx];
          if (item && item._id) {
            await api.delete(`${currentConfig.apiEndpoint}/${item._id}`);
          }
        }

        // Refresh data
        fetchInventoryData(activeCategory);

        setSelectedBooks([]);
        setDeleteMode(false);
      } catch (err) {
        console.error("Error deleting items:", err);
        alert("Failed to delete selected items.");
      }
    }
  };

  // sorting removed: columns are static now

  // Get current data based on active category
  const getCurrentData = () => {
    return inventoryData[activeCategory] || [];
  };

  const getCurrentConfig = () => categoryConfig[activeCategory];

  const filteredBooks = getCurrentData().filter((item) => {
    const query = search.toLowerCase();
    const config = getCurrentConfig();

    return config.fields.some(field => {
      const value = item[field.key];
      return value && value.toString().toLowerCase().includes(query);
    });
  });

  return (
    <div className="p-4 sm:p-6 w-full bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-sans">Book Shelf</h1>
          <p className="text-gray-500 text-sm sm:text-base">Library / Collection</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-md">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const IconComponent = config.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeCategory === key
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <IconComponent className="text-sm" />
                <span className="text-sm font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons - Show for all categories */}
      <div className="flex items-center space-x-3 mb-4 pt-10">
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 rounded-full bg-white text-teal-600 border-2 border-teal-600 hover:bg-teal-400"
          title={`Add ${getCurrentConfig().label}`}
        >
          <FiPlus />
        </button>

        <button
          onClick={() => document.getElementById("excel-import-input")?.click()}
          className="p-2 rounded-full bg-white text-teal-600 border-2 border-teal-600 hover:bg-teal-400"
          title={`Import ${getCurrentConfig().label} from Excel`}
        >
          <FaDownload />
        </button>

        <input
          id="excel-import-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelImport}
          style={{ display: "none" }}
        />

        <button
          onClick={() => {
            if (deleteMode) {
              handleDeleteSelected();
            } else {
              setDeleteMode(true);
            }
          }}
          className={`p-2 rounded-full bg-white border-2 ${deleteMode
            ? "text-red-600 border-red-600 hover:bg-red-500"
            : "text-teal-600 border-teal-600 hover:bg-red-500"
            }`}
          title={deleteMode ? "Confirm Delete" : `Delete ${getCurrentConfig().label}`}
        >
          <FiX />
        </button>

        <button
          onClick={() => setEditMode(!editMode)}
          className={`p-2 rounded-full bg-white border-2 ${editMode
            ? "text-yellow-600 border-yellow-600 hover:bg-yellow-400"
            : "text-teal-600 border-teal-600 hover:bg-yellow-400"
            }`}
          title={editMode ? "Exit Edit Mode" : `Edit ${getCurrentConfig().label}`}
        >
          <FiEdit />
        </button>
      </div>

      {/* Book List */}
      <div
        className="bg-white shadow-md rounded-md overflow-hidden"
        style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.4)" }}
      >
        {/* Title bar */}
        <div className="flex items-center bg-teal-700 text-white px-4 py-2">
          {React.createElement(getCurrentConfig().icon, { className: "mr-2" })}
          <h2 className="text-lg font-sans">{getCurrentConfig().label}</h2>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 items-center px-4 py-2 border-b border-gray-300">
          <select className="border border-gray-400 rounded px-2 py-1 text-sm">
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>

          {/* Search */}
          <div className="flex items-center border rounded-4xl px-2 py-1 w-full sm:w-48 md:w-60">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="outline-none text-sm w-full"
            />
            <FiSearch className="text-teal-700 ml-1" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] sm:min-w-[800px] text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b text-center">
                {deleteMode && (
                  <th className="px-2 py-2 border">Select</th>
                )}
                {getCurrentConfig().fields.map((field) => (
                  <th
                    key={field.key}
                    className="px-2 sm:px-4 py-2 border text-center"
                  >
                    {field.label}
                  </th>
                ))}
                <th className="px-2 sm:px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={getCurrentConfig().fields.length + (deleteMode ? 1 : 0) + 1} className="text-center text-gray-400 py-10 border">
                    No {getCurrentConfig().label.toLowerCase()} found
                  </td>
                </tr>
              ) : (
                filteredBooks.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    className="border-b text-center hover:bg-gray-100"
                  >
                    {deleteMode && (
                      <td className="px-2 py-2 border">
                        <input
                          type="checkbox"
                          checked={selectedBooks.includes(idx)}
                          onChange={() =>
                            setSelectedBooks((prev) =>
                              prev.includes(idx)
                                ? prev.filter((i) => i !== idx)
                                : [...prev, idx]
                            )
                          }
                        />
                      </td>
                    )}
                    {getCurrentConfig().fields.map((field) => {
                      // Provide a sequential index for display (based on filteredBooks order)
                      const displayIndex = idx + 1;

                      // Normalize the field key for checks
                      const normalizedKey = (field.key || "").toLowerCase();

                      // If the field is a URL type, keep the original link behaviour
                      if (field.type === "url") {
                        return (
                          <td key={field.key} className="px-2 sm:px-4 py-2 border">
                            <a
                              href={item[field.key]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {item[field.key] ? "Access Link" : "N/A"}
                            </a>
                          </td>
                        );
                      }

                      // Render sequential numbering for 'No' column
                      if (normalizedKey === "no") {
                        return (
                          <td key={field.key} className="px-2 sm:px-4 py-2 border">
                            {displayIndex}
                          </td>
                        );
                      }

                      // Make 'Accession Number' clickable (shows QR) and also display sequential number
                      if (normalizedKey === "accession number" || normalizedKey.includes("accession")) {
                        const displayValue = item[field.key] || displayIndex;
                        return (
                          <td key={field.key} className="px-2 sm:px-4 py-2 border">
                            <button
                              onClick={() => handleShowQRCode(item)}
                              className="hover:underline"
                              title="Show QR / Details"
                            >
                              {displayValue}
                            </button>
                          </td>
                        );
                      }

                      // Default rendering for other fields
                      return (
                        <td key={field.key} className="px-2 sm:px-4 py-2 border">
                          {item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== "" ? item[field.key] : "N/A"}
                        </td>
                      );
                    })}
                    <td className="px-2 sm:px-4 py-2 border">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleShowQRCode(item)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Show QR Code"
                        >
                          📱
                        </button>
                        {editMode && (
                          <button
                            onClick={() => handleEditBook(item)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title={`Edit ${getCurrentConfig().label}`}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50  bg-opacity-50">
          <div
            className="bg-teal-700 rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 text-white 
      max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold mb-6">
              Adding new {getCurrentConfig().label.toLowerCase()}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side - Inputs */}
              <div>
                <h3 className="font-semibold mb-4 text-center">
                  {getCurrentConfig().label.toUpperCase()} INFORMATION
                </h3>
                <div className="space-y-4">
                  {getCurrentConfig().fields.map((field) => (
                    <div key={field.key} className="flex items-center">
                      <label className="w-28 text-sm font-medium">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.key}
                        value={newBook[field.key] || ""}
                        onChange={handleChange}
                        required={field.required}
                        className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - QR Code */}
              <div className="flex flex-col items-center justify-center text-black">
                {Object.values(newBook).some((val) => val !== "") ? (
                  <>
                    <div ref={qrRef}>
                      <QRCodeCanvas
                        value={JSON.stringify({
                          type: "inventory",
                          inventoryItemId: "new-item",
                          inventoryType:
                            activeCategory === "masterlist"
                              ? "MasterList"
                              : activeCategory === "librarycollection"
                                ? "LibraryCollection"
                                : activeCategory === "bookholdings"
                                  ? "ListofBookHoldings"
                                  : "Ebooks",
                          title:
                            newBook.name ||
                            newBook["Book Title"] ||
                            "New Item",
                          author:
                            newBook.author ||
                            newBook.Author ||
                            "Unknown Author",
                          category: activeCategory,
                        })}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                      <button
                        onClick={handleDownloadNewBookQR}
                        disabled={
                          !newBook.name ||
                          !newBook.author ||
                          !newBook.isbn ||
                          !newBook.genre
                        }
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newBook.name &&
                          newBook.author &&
                          newBook.isbn &&
                          newBook.genre
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-400 text-white cursor-not-allowed"
                          }`}
                      >
                        📥 Download QR
                      </button>

                      <button
                        onClick={handlePrintNewBookQR}
                        disabled={
                          !newBook.name ||
                          !newBook.author ||
                          !newBook.isbn ||
                          !newBook.genre
                        }
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newBook.name &&
                          newBook.author &&
                          newBook.isbn &&
                          newBook.genre
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-400 text-white cursor-not-allowed"
                          }`}
                      >
                        🖨️ Print QR
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-300 text-sm text-center">
                    Fill in details to generate QR
                  </p>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded bg-white text-black hover:bg-red-500 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBook}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-teal-800 cursor-pointer"
              >
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-teal-700 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4 text-white">
            <h2 className="text-lg font-bold mb-6">Edit {getCurrentConfig().label}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side - Inputs */}
              <div>
                <h3 className="font-semibold mb-4 text-center">{getCurrentConfig().label.toUpperCase()} INFORMATION</h3>
                <div className="space-y-4">
                  {getCurrentConfig().fields.map((field) => (
                    <div key={field.key} className="flex items-center">
                      <label className="w-28 text-sm font-medium">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.key}
                        value={newBook[field.key] || ''}
                        onChange={handleChange}
                        required={field.required}
                        className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - QR Code */}
              <div className="flex flex-col items-center justify-center text-black">
                {Object.values(newBook).some((val) => val !== "") ? (
                  <>
                    <div ref={editQRRef}>
                      <QRCodeCanvas
                        value={JSON.stringify({
                          type: "inventory",
                          inventoryItemId: selectedBook?._id,
                          inventoryType: activeCategory === "masterlist" ? "MasterList" :
                            activeCategory === "librarycollection" ? "LibraryCollection" :
                              activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
                          title: newBook.name || newBook["Book Title"] || "Unknown Item",
                          author: newBook.author || newBook.Author || "Unknown Author",
                          category: activeCategory
                        })}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <div className="flex flex-col gap-2 mt-3">
                      <button
                        onClick={handleDownloadEditBookQR}
                        disabled={!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newBook.name && newBook.author && newBook.isbn && newBook.genre
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-400 text-white cursor-not-allowed"
                          }`}
                      >
                        📥 Download QR
                      </button>
                      <button
                        onClick={handlePrintEditBookQR}
                        disabled={!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newBook.name && newBook.author && newBook.isbn && newBook.genre
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-400 text-white cursor-not-allowed"
                          }`}
                      >
                        🖨️ Print QR
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Fill in details to generate QR
                  </p>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedBook(null);
                  setNewBook({
                    name: "",
                    isbn: "",
                    genre: "",
                    author: "",
                    color: "",
                    copies: "",
                    status: "Available",
                  });
                }}
                className="px-4 py-2 border rounded bg-white text-black hover:bg-red-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBook}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 cursor-pointer"
              >
                Update Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQRModalOpen && selectedBook && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4 text-center text-gray-800">
              QR Code for "{selectedBook.name}"
            </h2>
            <div className="flex flex-col items-center">
              <div ref={bookQRRef}>
                <QRCodeCanvas
                  value={JSON.stringify({
                    type: "inventory",
                    inventoryItemId: selectedBook._id,
                    inventoryType: activeCategory === "masterlist" ? "MasterList" :
                      activeCategory === "librarycollection" ? "LibraryCollection" :
                        activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
                    title: selectedBook.booktitle || selectedBook["Book Title"] || selectedBook.name || "Unknown Item",
                    author: selectedBook.author || selectedBook.Author || "Unknown Author",
                    category: activeCategory
                  })}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Scan this QR code to access book information for borrowing
              </p>
              <div className="text-xs text-gray-500 mt-2">
                <p><strong>Book:</strong> {selectedBook.name}</p>
                <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                <p><strong>Author:</strong> {selectedBook.author}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleDownloadBookQR}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                📥 Download
              </button>
              <button
                onClick={handlePrintBookQR}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => {
                  setIsQRModalOpen(false);
                  setSelectedBook(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4 my-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Import {getCurrentConfig().label} from Excel
            </h2>

            {/* Column Mapping Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Map Excel Columns to Fields
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-teal-600 text-white">
                      <th className="px-4 py-2 text-left border">Excel Column</th>
                      <th className="px-4 py-2 text-left border">Map to Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.length > 0 &&
                      Object.keys(importedData[0]).map((excelCol) => (
                        <tr key={excelCol} className="border-b hover:bg-gray-100">
                          <td className="px-4 py-2 border font-medium text-gray-700">
                            {excelCol}
                          </td>
                          <td className="px-4 py-2 border">
                            <select
                              value={columnMapping[excelCol] || ""}
                              onChange={(e) =>
                                handleMappingChange(excelCol, e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-700"
                            >
                              <option value="">-- Select Field --</option>
                              {getCurrentConfig().fields.map((field) => (
                                <option key={field.key} value={field.key}>
                                  {field.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Preview ({importedData.length} rows)
              </h3>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-300 sticky top-0">
                      {importedData.length > 0 &&
                        Object.keys(importedData[0]).map((col) => (
                          <th
                            key={col}
                            className="px-2 py-1 border text-left font-semibold"
                          >
                            {col}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-100">
                        {Object.keys(row).map((col) => (
                          <td
                            key={col}
                            className="px-2 py-1 border text-gray-700"
                          >
                            {row[col]?.toString() || "N/A"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importedData.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing 10 of {importedData.length} rows
                </p>
              )}
            </div>

            {/* Info Message */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Make sure the Excel columns match the field names
                above. You can select which Excel column maps to each field.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedData([]);
                  setColumnMapping({});
                  const fileInput = document.getElementById("excel-import-input");
                  if (fileInput) fileInput.value = "";
                }}
                className="px-6 py-2 border rounded bg-gray-500 text-white hover:bg-gray-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={Object.values(columnMapping).every((val) => !val)}
                className={`px-6 py-2 rounded text-white cursor-pointer ${Object.values(columnMapping).every((val) => !val)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700"
                  }`}
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global QR Popup */}
      {showQRPopup && (
        <QRPopup qrData={qrData} onClose={() => setShowQRPopup(false)} />
      )}
    </div>
  );
};

export default BookShelf;
