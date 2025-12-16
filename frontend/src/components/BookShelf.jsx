// frontend/src/components/BookShelf.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaBook, FaBookOpen, FaList, FaGlobe, FaDatabase } from "react-icons/fa";
import { FiSearch, FiPlus, FiX, FiEdit, FiUpload } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import QRPopup from "./QRPopup";
import ExcelImport from "./ExcelImport";
import api from "../api"; // ✅ connect to backend

const BookShelf = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  


  const [newBook, setNewBook] = useState({
    // Common fields that work across inventory types
    name: "",
    author: "",
    isbn: "",
    genre: "",
    color: "",
    copies: "",
    status: "Available",
    // Master List specific fields
    "Accession Number": "",
    "Date Received": "",
    "Book Title": "",
    "Call Number": "",
    // Library Collection / Book Holdings specific fields
    "Edition": "",
    "Volume": "",
    "Pages": "",
    "Publisher": "",
    "Copyright": "",
    // Ebooks specific fields
    "URL": "",
    "Date Uploaded": ""
  });
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("masterlist");
  const [inventoryData, setInventoryData] = useState({});
  
  // Excel-like editing states (only for masterlist)
  const [editingCell, setEditingCell] = useState({ row: null, column: null });
  const [cellValues, setCellValues] = useState({});
  
  // CSV Import state
  const [showExcelImport, setShowExcelImport] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Collapsible report state
  const [showReport, setShowReport] = useState(true);
  
  // Summary report state
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState(null);

  // Category configurations with detailed field definitions for CRUD operations
  const categoryConfig = {
    masterlist: {
      label: "Master List",
      icon: FaList,
      apiEndpoint: "/books",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "text", required: true, width: "150px" },
        { key: "Date Received", label: "Date Received", type: "date", required: false, width: "120px" },
        { key: "Author", label: "Author", type: "text", required: true, width: "200px" },
        { key: "Book Title", label: "Book Title", type: "text", required: true, width: "300px" },
        { key: "Call Number", label: "Call Number", type: "text", required: false, width: "150px" }
      ]
    },
    librarycollection: {
      label: "Library Collection",
      icon: FaDatabase,
      apiEndpoint: "/books",
      fields: [
        { 
          key: "School Year Semester", 
          label: "School Year/Semester", 
          type: "select", 
          required: false,
          width: "200px",
          options: [
            "First Year-First Semester",
            "First Year-Second Semester",
            "Second Year-First Semester",
            "Second Year-Second Semester",
            "Third Year-First Semester",
            "Third Year-Second Semester",
            "Fourth Year-First Semester",
            "Fourth Year-Second Semester"
          ]
        },
        { key: "No", label: "No.", type: "text", required: false, width: "60px" },
        { 
          key: "Collection Type", 
          label: "Collection Type", 
          type: "select", 
          required: false,
          width: "120px",
          options: [
            "Printed",
            "Electronic"
          ]
        },
        { 
          key: "Gen Ed Prof Ed", 
          label: "Gen.Ed./Prof.Ed.", 
          type: "select", 
          required: false,
          width: "180px",
          options: [
            "General Education",
            "Professional Education"
          ]
        },
        { key: "Course Name", label: "Course Name", type: "text", required: false, width: "300px" },
        { key: "Book Title", label: "Book Title", type: "text", required: false, width: "400px" },
        { key: "Author", label: "Author", type: "text", required: false, width: "250px" },
        { key: "Publication Year", label: "Publication Year", type: "text", required: false, width: "120px" },
        { key: "No of Book Copies", label: "No. of Book Copies", type: "text", required: false, width: "120px" }
      ]
    },
    bookholdings: {
      label: "Book Holdings",
      icon: FaBookOpen,
      apiEndpoint: "/books",
      fields: [
        { key: "No", label: "No.", type: "text", required: false, width: "60px" },
        { 
          key: "Collection Type", 
          label: "Collection Type", 
          type: "select", 
          required: false,
          width: "120px",
          options: [
            "Printed",
            "Electronic"
          ]
        },
        { 
          key: "Classification", 
          label: "Classification", 
          type: "select", 
          required: false,
          width: "150px",
          options: [
            "General Reference",
            "Filipiniana", 
            "Professional",
            "General Education"
          ]
        },
        { key: "Course Name", label: "Course Name", type: "text", required: false, width: "200px" },
        { key: "Book Title", label: "Book Title", type: "text", required: false, width: "400px" },
        { key: "Author", label: "Author", type: "text", required: false, width: "250px" },
        { key: "Publication Year", label: "Publication Year", type: "text", required: false, width: "120px" },
        { key: "Volumes", label: "Volumes", type: "text", required: false, width: "80px" }
      ]
    },
    ebooks: {
      label: "E-Books",
      icon: FaGlobe,
      apiEndpoint: "/books",
      fields: [
        { key: "Accession Number", label: "Accession Number", type: "text", required: false, width: "120px" },
        { key: "Date Received", label: "Date Received", type: "date", required: false, width: "120px" },
        { key: "Author", label: "Author", type: "text", required: true, width: "250px" },
        { key: "Book Title", label: "Book Title", type: "text", required: true, width: "350px" },
        { key: "Edition", label: "Edition", type: "text", required: false, width: "100px" },
        { key: "Volume", label: "Volume", type: "text", required: false, width: "100px" },
        { key: "Pages", label: "Pages", type: "text", required: false, width: "80px" },
        { key: "Publisher", label: "Publisher", type: "text", required: false, width: "250px" },
        { key: "Copyright", label: "Copyright", type: "text", required: false, width: "100px" },
        { key: "Call Number", label: "Call Number", type: "text", required: false, width: "120px" }
      ]
    }
  };

  // QR Scanner states
  const [qrData, setQrData] = useState(null);
  const [showQRPopup, setShowQRPopup] = useState(false);

  const qrRef = useRef(null);
  const bookQRRef = useRef(null);
  const editQRRef = useRef(null);

  // ✅ Fetch inventory data from backend with pagination
  const fetchInventoryData = async (category, page = 1, searchTerm = '') => {
    try {
      setIsLoading(true);
      const endpoint = categoryConfig[category]?.apiEndpoint;
      if (!endpoint) return;
      
      // Pass pagination parameters to backend
      const params = new URLSearchParams({
        inventoryType: category,
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm
      });
      
      const res = await api.get(`${endpoint}?${params}`);
      
      // Handle paginated response
      if (res.data.data) {
        // New paginated response format
        const booksWithCategory = res.data.data.map(book => ({
          ...book,
          inventoryCategory: category,
          inventoryType: category === "masterlist" ? "MasterList" : 
                        category === "librarycollection" ? "LibraryCollection" :
                        category === "bookholdings" ? "ListofBookHoldings" : "Ebooks"
        }));
        
        setInventoryData(prev => ({
          ...prev,
          [category]: {
            items: booksWithCategory,
            pagination: res.data.pagination
          }
        }));
        
        // Calculate summary for Book Holdings
        calculateSummary(booksWithCategory);
      } else {
        // Fallback for old response format
        const booksWithCategory = res.data.map(book => ({
          ...book,
          inventoryCategory: category,
          inventoryType: category === "masterlist" ? "MasterList" : 
                        category === "librarycollection" ? "LibraryCollection" :
                        category === "bookholdings" ? "ListofBookHoldings" : "Ebooks"
        }));
        
        setInventoryData(prev => ({
          ...prev,
          [category]: { items: booksWithCategory, pagination: null }
        }));
        
        // Calculate summary for Book Holdings
        calculateSummary(booksWithCategory);
      }
    } catch (err) {
      console.error(`Error fetching ${category} data:`, err);
      setInventoryData(prev => ({
        ...prev,
        [category]: { items: [], pagination: null }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch only the active category on component mount for faster loading
    if (activeCategory) {
      setCurrentPage(1);
      fetchInventoryData(activeCategory, 1, search);
    }
  }, [activeCategory, itemsPerPage]);

  // Refetch data when page or search changes
  useEffect(() => {
    if (activeCategory) {
      fetchInventoryData(activeCategory, currentPage, search);
    }
  }, [currentPage, search]);

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
      name: book.name || book["Book Title"] || "",
      isbn: book.isbn || "",
      genre: book.genre || "",
      author: book.author || book.Author || "",
      color: book.color || "",
      copies: book.copies ? book.copies.toString() : "",
      status: book.status || "Available",
      // Map database fields to form fields
      "Accession Number": book["Accession Number"] || "",
      "Date Received": book["Date Received"] || "",
      "Book Title": book["Book Title"] || book.name || "",
      "Call Number": book["Call Number"] || "",
      "Edition": book.Edition || "",
      "Volume": book.Volume || "",
      "Pages": book.Pages || "",
      "Publisher": book.Publisher || "",
      "Copyright": book.Copyright || "",
      "URL": book.URL || "",
      "Date Uploaded": book["Date Uploaded"] || ""
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

    let itemToUpdate = { ...newBook, inventoryType: activeCategory };
    let endpoint = `${currentConfig.apiEndpoint}/${selectedBook._id}`;

    try {
      await api.put(endpoint, itemToUpdate);
      
      // Refresh data
      fetchInventoryData(activeCategory);
      setIsEditModalOpen(false);
      setSelectedBook(null);
      setNewBook({
        name: "",
        author: "",
        isbn: "",
        genre: "",
        color: "",
        copies: "",
        status: "Available",
        "Accession Number": "",
        "Date Received": "",
        "Book Title": "",
        "Call Number": "",
        "Edition": "",
        "Volume": "",
        "Pages": "",
        "Publisher": "",
        "Copyright": "",
        "URL": "",
        "Date Uploaded": ""
      });
    } catch (err) {
      console.error("Error updating book:", err.response?.data || err.message);
      alert("Failed to update book.");
    }
  };

  // Show individual book QR code
  const handleShowQRCode = (item) => {
    // Use the book's stored inventory type or fall back to active category
    const bookCategory = item.inventoryCategory || activeCategory;
    const bookInventoryType = item.inventoryType || 
                             (activeCategory === "masterlist" ? "MasterList" : 
                              activeCategory === "librarycollection" ? "LibraryCollection" :
                              activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks");
    
    // Get title with special fallback for Library Collection
    let title = item["Book Title"] || item.booktitle || item.title || item.name;
    
    // For Library Collection books without a Book Title or with "Untitled", create a descriptive title
    const isEmptyTitle = !title || !title.toString().trim() || title.toString().trim().toLowerCase() === "untitled";
    if (isEmptyTitle && bookInventoryType === "LibraryCollection") {
      const schoolYear = item["School Year Semester"] || "";
      const genEd = item["Gen Ed Prof Ed"] || "";
      const courseName = item["Course Name"] || "";
      
      // Build a composite title from available fields
      const parts = [schoolYear, genEd, courseName].filter(p => p && p.toString().trim());
      if (parts.length > 0) {
        title = parts.join(" - ");
      } else {
        title = ""; // Reset to empty if no parts available
      }
    }
    
    // Get author from the item with proper fallbacks
    const author = item.Author || item.author;
    
    // Ensure we have valid, non-empty strings
    const safeTitle = (title && title.toString().trim() && title.toString().trim().toLowerCase() !== "untitled") ? title.toString().trim() : "Unknown Item";
    const safeAuthor = (author && author.toString().trim() && author.toString().trim().toLowerCase() !== "unknown author") ? author.toString().trim() : "Unknown Author";
    
    console.log("✅ QR Generation - Title:", safeTitle, "Author:", safeAuthor, "Category:", bookCategory, "InventoryType:", bookInventoryType);
    
    // Create unique QR data for this specific book
    const qrData = {
      type: "inventory",
      inventoryItemId: item._id,
      inventoryType: bookInventoryType,
      title: safeTitle,
      author: safeAuthor,
      category: bookCategory
    };
    
    const qrString = JSON.stringify(qrData);
    console.log("✅ Final QR string:", qrString);
    
    // Store the QR data with the selected book to prevent it from changing
    const bookWithQR = { ...item, qrData, originalCategory: bookCategory };
    setSelectedBook(bookWithQR);
    setIsQRModalOpen(true); // Use the correct QR modal for books
  };

  // Download Individual Book QR
  const handleDownloadBookQR = () => {
    const canvas = bookQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedBook.name}-qr.png`;
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
  
  // Map frontend fields to backend schema - now fields match directly
  let itemToAdd = {};
  
  if (activeCategory === "masterlist") {
    itemToAdd = {
      "Accession Number": newBook["Accession Number"] || "",
      "Date Received": newBook["Date Received"] || new Date().toLocaleDateString('en-CA'),
      "Author": newBook["Author"] || newBook.author || "",
      "Book Title": newBook["Book Title"] || newBook.name || "",
      "Edition": newBook["Edition"] || "",
      "Volume": newBook["Volume"] || "",
      "Pages": newBook["Pages"] || "",
      "Publisher": newBook["Publisher"] || "",
      "Copyright": newBook["Copyright"] || "",
      "Call Number": newBook["Call Number"] || ""
    };
  } else if (activeCategory === "librarycollection") {
    console.log("🔍 DEBUG: newBook state for Library Collection:", newBook);
    itemToAdd = {
      "School Year Semester": newBook["School Year Semester"] || newBook["School Year/Semester"] || "",
      "No": newBook["No"] || "",
      "Collection Type": newBook["Collection Type"] || "",
      "Gen Ed Prof Ed": newBook["Gen Ed Prof Ed"] || newBook["Gen.Ed./Prof.Ed."] || "",
      "Course Name": newBook["Course Name"] || "",
      "Book Title": newBook["Book Title"] || newBook.name || "",
      "Author": newBook.author || newBook["Author"] || "",
      "Publication Year": newBook["Publication Year"] || "",
      "No of Book Copies": newBook["No of Book Copies"] || newBook["No. of Book Copies"] || ""
    };
    console.log("🔍 DEBUG: itemToAdd for Library Collection:", itemToAdd);
  } else if (activeCategory === "bookholdings") {
    itemToAdd = {
      "No": newBook["No"] || "",
      "Collection Type": newBook["Collection Type"] || "",
      "Classification": newBook["Classification"] || "",
      "Course Name": newBook["Course Name"] || "",
      "Book Title": newBook["Book Title"] || newBook.name || "",
      "Author": newBook.author || newBook["Author"] || "",
      "Publication Year": newBook["Publication Year"] || "",
      "Volumes": newBook["Volumes"] || ""
    };
  } else if (activeCategory === "ebooks") {
    itemToAdd = {
      "Accession Number": newBook["Accession Number"] || "",
      "Date Received": newBook["Date Received"] || new Date().toLocaleDateString('en-CA'),
      "Author": newBook.author || newBook["Author"] || "",
      "Book Title": newBook["Book Title"] || newBook.name || "",
      "Edition": newBook["Edition"] || "",
      "Volume": newBook["Volume"] || "",
      "Pages": newBook["Pages"] || "",
      "Publisher": newBook["Publisher"] || "",
      "Copyright": newBook["Copyright"] || "",
      "Call Number": newBook["Call Number"] || ""
    };
  } else {
    // Fallback: copy all fields, filtering out empty ones
    Object.keys(newBook).forEach(key => {
      if (newBook[key] && newBook[key].trim() !== "") {
        itemToAdd[key] = newBook[key];
      }
    });
  }
  
  try {
    // Add inventoryType to the request
    const dataToSend = { ...itemToAdd, inventoryType: activeCategory };
    await api.post(currentConfig.apiEndpoint, dataToSend);
    fetchInventoryData(activeCategory);
      
      setIsModalOpen(false);
      setNewBook({
        name: "",
        author: "",
        isbn: "",
        genre: "",
        color: "",
        copies: "",
        status: "Available",
        "Accession Number": "",
        "Date Received": "",
        "Book Title": "",
        "Call Number": "",
        "Edition": "",
        "Volume": "",
        "Pages": "",
        "Publisher": "",
        "Copyright": "",
        "URL": "",
        "Date Uploaded": "",
        "No": "",
        "Collection Type": "",
        "Gen Ed Prof Ed": "",
        "Course Name": "",
        "Publication Year": "",
        "No of Book Copies": ""
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
            await api.delete(`${currentConfig.apiEndpoint}/${item._id}?inventoryType=${activeCategory}`);
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

  // ✅ Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const currentData = inventoryData[activeCategory] || [];
    const sortedData = [...currentData].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setInventoryData(prev => ({
      ...prev,
      [activeCategory]: sortedData
    }));
  };

  // Get current data based on active category
  const getCurrentData = () => {
    const categoryData = inventoryData[activeCategory];
    return categoryData?.items || [];
  };

  // Get pagination info
  const getCurrentPagination = () => {
    const categoryData = inventoryData[activeCategory];
    return categoryData?.pagination || null;
  };

  const getCurrentConfig = () => categoryConfig[activeCategory];

  // Calculate summary report for Book Holdings and Library Collection
  const calculateSummary = (data) => {
    if (!data || data.length === 0) {
      setSummaryData(null);
      return;
    }

    if (activeCategory === 'bookholdings') {
      const summary = {
        'General Reference': { printed: 0, electronic: 0, printedVolumes: 0, electronicVolumes: 0 },
        'General Education': { printed: 0, electronic: 0, printedVolumes: 0, electronicVolumes: 0 },
        'Filipiniana': { printed: 0, electronic: 0, printedVolumes: 0, electronicVolumes: 0 },
        'Professional': { printed: 0, electronic: 0, printedVolumes: 0, electronicVolumes: 0 }
      };

      data.forEach(item => {
        const classification = item.Classification || '';
        const collectionType = (item['Collection Type'] || '').toLowerCase();
        const volumes = parseInt(item.Volumes) || 0;

        if (summary[classification]) {
          if (collectionType === 'printed') {
            summary[classification].printed += 1;
            summary[classification].printedVolumes += volumes;
          } else if (collectionType === 'electronic') {
            summary[classification].electronic += 1;
            summary[classification].electronicVolumes += volumes;
          }
        }
      });

      // Calculate totals
      const totals = {
        printed: 0,
        electronic: 0,
        printedVolumes: 0,
        electronicVolumes: 0
      };

      Object.values(summary).forEach(cat => {
        totals.printed += cat.printed;
        totals.electronic += cat.electronic;
        totals.printedVolumes += cat.printedVolumes;
        totals.electronicVolumes += cat.electronicVolumes;
      });

      setSummaryData({ summary, totals, type: 'bookholdings' });
    } else if (activeCategory === 'librarycollection') {
      // Separate by Gen.Ed./Prof.Ed.
      const professionalMap = {};
      const generalMap = {};

      data.forEach(item => {
        const genEdProfEd = item['Gen Ed Prof Ed'] || '';
        const courseName = item['Course Name'] || '';
        const copies = parseInt(item['No of Book Copies']) || 0;
        
        const targetMap = genEdProfEd === 'Professional Education' ? professionalMap : generalMap;
        
        if (!targetMap[courseName]) {
          targetMap[courseName] = {
            courseName,
            titles: 0,
            publishedLast5Years: 0,
            copies: 0
          };
        }
        
        targetMap[courseName].titles += 1;
        targetMap[courseName].copies += copies;
        
        // Check if published in last 5 years
        const pubYear = parseInt(item['Publication Year']) || 0;
        const currentYear = new Date().getFullYear();
        if (pubYear >= currentYear - 5) {
          targetMap[courseName].publishedLast5Years += 1;
        }
      });

      const professionalEducation = Object.values(professionalMap);
      const generalEducation = Object.values(generalMap);
      
      setSummaryData({ 
        professionalEducation, 
        generalEducation, 
        type: 'librarycollection' 
      });
    } else {
      setSummaryData(null);
    }
  };

  // Excel-like functionality for all categories
  const handleCellClick = (rowIndex, columnKey) => {
    setEditingCell({ row: rowIndex, column: columnKey });
  };

  const handleCellChange = (rowIndex, columnKey, value) => {
    setCellValues(prev => ({
      ...prev,
      [`${rowIndex}-${columnKey}`]: value
    }));
  };

  const handleCellBlur = async (rowIndex, columnKey, item) => {
    const cellKey = `${rowIndex}-${columnKey}`;
    const newValue = cellValues[cellKey];
    
    if (newValue !== undefined && newValue !== item[columnKey]) {
      try {
        const updatedItem = { ...item, [columnKey]: newValue };
        
        // Update the backend
        const endpoint = getCurrentConfig().apiEndpoint;
        const categoryParam = activeCategory === "masterlist" ? "MasterList" : 
                            activeCategory === "librarycollection" ? "LibraryCollection" :
                            activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks";
        
        await api.put(`${endpoint}/${item._id}?category=${categoryParam}`, updatedItem);
        
        // Refresh the data
        fetchInventoryData(activeCategory);
        
        // Clear the cell value from temporary storage
        setCellValues(prev => {
          const newState = { ...prev };
          delete newState[cellKey];
          return newState;
        });
        
      } catch (error) {
        console.error("Error updating item:", error);
        alert("Failed to update item");
      }
    }
    
    setEditingCell({ row: null, column: null });
  };

  const handleKeyPress = (e, rowIndex, columnKey, item) => {
    if (e.key === 'Enter') {
      handleCellBlur(rowIndex, columnKey, item);
    } else if (e.key === 'Escape') {
      // Cancel editing and restore original value
      setCellValues(prev => {
        const newState = { ...prev };
        delete newState[`${rowIndex}-${columnKey}`];
        return newState;
      });
      setEditingCell({ row: null, column: null });
    }
  };

  const getCellValue = (rowIndex, columnKey, originalValue) => {
    const cellKey = `${rowIndex}-${columnKey}`;
    let value = cellValues[cellKey] !== undefined ? cellValues[cellKey] : originalValue;
    
    // Filter out "Unknown" values and replace with empty string
    if (value === "Unknown" || value === "Unknown Publisher" || value === "Unknown Author") {
      return "";
    }
    
    return value;
  };

  // Use server-side pagination - no client-side filtering needed
  const filteredBooks = getCurrentData();
  const pagination = getCurrentPagination();
  
  // Use server pagination info if available, otherwise fall back to client-side
  const totalPages = pagination?.totalPages || Math.ceil(filteredBooks.length / itemsPerPage);
  const totalItems = pagination?.totalItems || filteredBooks.length;
  const startIndex = pagination ? (pagination.currentPage - 1) * pagination.itemsPerPage : (currentPage - 1) * itemsPerPage;
  const endIndex = pagination ? startIndex + filteredBooks.length : startIndex + itemsPerPage;

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
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeCategory === key
                    ? "bg-orange-500 text-white"
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
          className="p-2 rounded-full bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-300"
          title={`Add ${getCurrentConfig().label}`}
        >
          <FiPlus />
        </button>

        <button
          onClick={() => setShowExcelImport(true)}
          className="p-2 rounded-full bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-300"
          title={`Import Excel - ${getCurrentConfig().label}`}
        >
          <FiUpload />
        </button>

        <button
          onClick={() => {
            if (deleteMode) {
              handleDeleteSelected();
            } else {
              setDeleteMode(true);
            }
          }}
          className={`p-2 rounded-full bg-white border-2 ${
            deleteMode
              ? "text-red-600 border-red-600 hover:bg-red-500"
              : "text-teal-600 border-teal-600 hover:bg-red-500"
          }`}
          title={deleteMode ? "Confirm Delete" : `Delete ${getCurrentConfig().label}`}
        >
          <FiX />
        </button>

        <button
          onClick={() => setEditMode(!editMode)}
          className={`p-2 rounded-full bg-white border-2 ${
            editMode
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
        <div className="flex items-center bg-orange-500 text-white px-4 py-2">
          {React.createElement(getCurrentConfig().icon, { className: "mr-2" })}
          <h2 className="text-lg font-sans">{getCurrentConfig().label}</h2>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-2 items-center px-4 py-2 border-b border-gray-300">
          {/* Items per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Show:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-400 rounded px-2 py-1 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
              <option value={totalItems}>All ({totalItems})</option>
            </select>
            <span className="text-sm text-gray-600">
              of {totalItems} items
            </span>
          </div>

          {/* Search */}
          <div className="flex items-center border rounded-4xl px-2 py-1 w-full sm:w-48 md:w-60">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                
                // Debounce search to avoid too many API calls
                if (searchDebounce) clearTimeout(searchDebounce);
                const timeout = setTimeout(() => {
                  setCurrentPage(1);
                }, 300);
                setSearchDebounce(timeout);
              }}
              className="outline-none text-sm w-full"
            />
            <FiSearch className="text-teal-700 ml-1" />
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 bg-gray-50 border-b">
            <div className="text-sm text-gray-600">
              Page {pagination?.currentPage || currentPage} of {totalPages} 
              ({startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems})
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-xs bg-orange-100 rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* Summary Report for Book Holdings */}
        {summaryData && summaryData.type === 'bookholdings' && !isLoading && (
          <div className="mx-4 my-4 bg-white border rounded-lg shadow-sm">
            <button 
              onClick={() => setShowReport(!showReport)}
              className="w-full bg-gray-100 px-4 py-2 border-b hover:bg-gray-200 transition-colors flex items-center justify-between"
            >
              <h3 className="text-sm font-bold text-gray-800">SUMMARY OF REPORT</h3>
              <span className="text-gray-600">{showReport ? '▼' : '▶'}</span>
            </button>
            {showReport && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-100 border-b">
                    <th className="px-4 py-2 text-left font-semibold border-r">Classification</th>
                    <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles(Printed)</th>
                    <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles(Electronic)</th>
                    <th className="px-4 py-2 text-center font-semibold border-r">Total Titles</th>
                    <th className="px-4 py-2 text-center font-semibold border-r">No. of Volumes(Printed)</th>
                    <th className="px-4 py-2 text-center font-semibold border-r">No. of Volumes(Electronic)</th>
                    <th className="px-4 py-2 text-center font-semibold">Total Titles</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summaryData.summary).map(([classification, data]) => (
                    <tr key={classification} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 border-r">{classification}</td>
                      <td className="px-4 py-2 text-center border-r">{data.printed}</td>
                      <td className="px-4 py-2 text-center border-r">{data.electronic}</td>
                      <td className="px-4 py-2 text-center border-r">{data.printed + data.electronic}</td>
                      <td className="px-4 py-2 text-center border-r">{data.printedVolumes}</td>
                      <td className="px-4 py-2 text-center border-r">{data.electronicVolumes}</td>
                      <td className="px-4 py-2 text-center">{data.printedVolumes + data.electronicVolumes}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold border-t-2">
                    <td className="px-4 py-2 border-r">TOTAL</td>
                    <td className="px-4 py-2 text-center border-r">{summaryData.totals.printed}</td>
                    <td className="px-4 py-2 text-center border-r">{summaryData.totals.electronic}</td>
                    <td className="px-4 py-2 text-center border-r">{summaryData.totals.printed + summaryData.totals.electronic}</td>
                    <td className="px-4 py-2 text-center border-r">{summaryData.totals.printedVolumes}</td>
                    <td className="px-4 py-2 text-center border-r">{summaryData.totals.electronicVolumes}</td>
                    <td className="px-4 py-2 text-center">{summaryData.totals.printedVolumes + summaryData.totals.electronicVolumes}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Summary Report for Library Collection */}
        {summaryData && summaryData.type === 'librarycollection' && !isLoading && (
          <div className="mx-4 my-4 space-y-4">
            {/* Professional Education Section */}
            {summaryData.professionalEducation.length > 0 && (
              <div className="bg-white border rounded-lg shadow-sm">
                <button 
                  onClick={() => setShowReport(!showReport)}
                  className="w-full bg-blue-500 px-4 py-2 border-b hover:bg-blue-600 transition-colors flex items-center justify-between"
                >
                  <h3 className="text-sm font-bold text-white">Professional Education - SUMMARY OF REPORT</h3>
                  <span className="text-white">{showReport ? '▼' : '▶'}</span>
                </button>
                {showReport && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-100 border-b">
                        <th className="px-4 py-2 text-left font-semibold border-r">Course Name</th>
                        <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles/Subject</th>
                        <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles Published with the last 5 years</th>
                        <th className="px-4 py-2 text-center font-semibold">No. of Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.professionalEducation.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 border-r">{item.courseName}</td>
                          <td className="px-4 py-2 text-center border-r">{item.titles}</td>
                          <td className="px-4 py-2 text-center border-r">{item.publishedLast5Years}</td>
                          <td className="px-4 py-2 text-center">{item.copies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}

            {/* General Education Section */}
            {summaryData.generalEducation.length > 0 && (
              <div className="bg-white border rounded-lg shadow-sm">
                <button 
                  onClick={() => setShowReport(!showReport)}
                  className="w-full bg-green-500 px-4 py-2 border-b hover:bg-green-600 transition-colors flex items-center justify-between"
                >
                  <h3 className="text-sm font-bold text-white">General Education - SUMMARY OF REPORT</h3>
                  <span className="text-white">{showReport ? '▼' : '▶'}</span>
                </button>
                {showReport && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-100 border-b">
                        <th className="px-4 py-2 text-left font-semibold border-r">Course Name</th>
                        <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles/Subject</th>
                        <th className="px-4 py-2 text-center font-semibold border-r">No. of Titles Published with the last 5 years</th>
                        <th className="px-4 py-2 text-center font-semibold">No. of Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.generalEducation.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 border-r">{item.courseName}</td>
                          <td className="px-4 py-2 text-center border-r">{item.titles}</td>
                          <td className="px-4 py-2 text-center border-r">{item.publishedLast5Years}</td>
                          <td className="px-4 py-2 text-center">{item.copies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-2 text-gray-600">Loading {getCurrentConfig().label}...</span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="text-gray-800 border-b border-gray-400 bg-gray-100">
                <th className="px-3 py-3 border border-gray-400 bg-gray-200 font-bold text-sm w-16 text-center">
                  #
                </th>
                {deleteMode && (
                  <th className="px-3 py-3 border border-gray-400 bg-gray-200 text-sm font-semibold text-center">Select</th>
                )}
                {getCurrentConfig().fields.map((field) => (
                  <th
                    key={field.key}
                    onClick={() => handleSort(field.key)}
                    className="py-3 px-3 border border-gray-400 cursor-pointer hover:bg-gray-150 font-semibold text-sm bg-gray-100 text-center"
                    style={{ width: field.width || 'auto' }}
                  >
                    {field.label}{" "}
                    {sortConfig.key === field.key
                      ? sortConfig.direction === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                ))}
                <th className="py-3 px-3 border border-gray-400 bg-gray-100 font-semibold text-sm text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={getCurrentConfig().fields.length + (deleteMode ? 1 : 0) + 2} 
                      className="text-center text-gray-500 py-12 border border-gray-400 bg-gray-50 text-lg">
                    No {getCurrentConfig().label.toLowerCase()} found
                  </td>
                </tr>
              ) : (
                filteredBooks.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    className="border-b border-gray-400 hover:bg-blue-50 even:bg-gray-25"
                  >
                    <td className="px-3 py-2 border border-gray-400 bg-gray-100 font-semibold text-sm text-center">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    {deleteMode && (
                      <td className="px-3 py-2 border border-gray-400 text-center">
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
                      const isEditing = editingCell.row === idx && editingCell.column === field.key;
                      const cellValue = getCellValue(idx, field.key, item[field.key]);
                      
                      return (
                        <td 
                          key={field.key} 
                          className="px-3 py-2 border border-gray-400 hover:bg-orange-50 cursor-cell bg-white text-left"
                          onClick={() => handleCellClick(idx, field.key)}
                          style={{ width: field.width || 'auto' }}
                        >
                          {/* Excel-like editable cell for all categories */}
                          {isEditing ? (
                            field.type === "select" ? (
                              <select
                                value={cellValue || ""}
                                onChange={(e) => handleCellChange(idx, field.key, e.target.value)}
                                onBlur={() => handleCellBlur(idx, field.key, item)}
                                onKeyDown={(e) => handleKeyPress(e, idx, field.key, item)}
                                className="w-full h-full px-2 py-1 border-2 border-blue-500 outline-none text-sm"
                                autoFocus
                              >
                                <option value="" disabled>
                                  {field.key === "Classification" ? "Select Classification" : 
                                   field.key === "Collection Type" ? "Select Collection Type" : 
                                   `Select ${field.label}`}
                                </option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === "url" ? (
                              <input
                                type="url"
                                value={cellValue || ""}
                                onChange={(e) => handleCellChange(idx, field.key, e.target.value)}
                                onBlur={() => handleCellBlur(idx, field.key, item)}
                                onKeyDown={(e) => handleKeyPress(e, idx, field.key, item)}
                                className="w-full h-full px-2 py-1 border-2 border-blue-500 outline-none text-sm"
                                autoFocus
                              />
                            ) : (
                              <input
                                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                                value={cellValue || ""}
                                onChange={(e) => handleCellChange(idx, field.key, e.target.value)}
                                onBlur={() => handleCellBlur(idx, field.key, item)}
                                onKeyDown={(e) => handleKeyPress(e, idx, field.key, item)}
                                className="w-full h-full px-2 py-1 border-2 border-blue-500 outline-none text-sm"
                                autoFocus
                              />
                            )
                          ) : (
                            <div className="px-2 py-1 min-h-[24px] text-sm">
                              {field.type === "url" && cellValue ? (
                                <a 
                                  href={cellValue} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Access Link
                                </a>
                              ) : field.type === "date" && cellValue ? (
                                new Date(cellValue).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })
                              ) : (
                                cellValue || ""
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-400 px-3 py-2 bg-white text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleShowQRCode(item)}
                          className="px-2 py-1 text-orange-600 hover:bg-orange-100 rounded text-sm"
                          title="Show QR Code"
                        >
                          📱
                        </button>
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
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-orange-500 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4 text-white">
            <h2 className="text-lg font-bold mb-6">Adding new {getCurrentConfig().label.toLowerCase()}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side - Inputs */}
              <div>
                <h3 className="font-semibold mb-4 text-center">{getCurrentConfig().label.toUpperCase()} INFORMATION</h3>
                <div className="space-y-4">
                  {getCurrentConfig().fields.map((field) => (
                    <div key={field.key} className="flex items-center">
                      <label className="w-28 text-sm font-medium">{field.label}</label>
                      {field.type === "select" ? (
                        <select
                          name={field.key}
                          value={newBook[field.key] || ''}
                          onChange={handleChange}
                          required={field.required}
                          className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.key}
                          value={newBook[field.key] || ''}
                          onChange={handleChange}
                          required={field.required}
                          className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2"
                        />
                      )}
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
                          inventoryItemId: "new-item", // Placeholder for new items
                          inventoryType: activeCategory === "masterlist" ? "MasterList" : 
                                       activeCategory === "librarycollection" ? "LibraryCollection" :
                                       activeCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
                          title: newBook["Book Title"] || newBook.name || "New Item",
                          author: newBook.author || newBook["Author"] || "Unknown Author",
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
                        onClick={handleDownloadNewBookQR}
                        disabled={!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                          newBook.name && newBook.author && newBook.isbn && newBook.genre
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      >
                        📥 Download QR
                      </button>
                      <button
                        onClick={handlePrintNewBookQR}
                        disabled={!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                          newBook.name && newBook.author && newBook.isbn && newBook.genre
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
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded bg-white text-black hover:bg-red-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBook}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-orange-600 cursor-pointer"
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
          <div className="bg-orange-500 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4 text-white">
            <h2 className="text-lg font-bold mb-6">Edit {getCurrentConfig().label}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side - Inputs */}
              <div>
                <h3 className="font-semibold mb-4 text-center">{getCurrentConfig().label.toUpperCase()} INFORMATION</h3>
                <div className="space-y-4">
                  {getCurrentConfig().fields.map((field) => (
                    <div key={field.key} className="flex items-center">
                      <label className="w-28 text-sm font-medium">{field.label}</label>
                      {field.type === "select" ? (
                        <select
                          name={field.key}
                          value={newBook[field.key] || ''}
                          onChange={handleChange}
                          required={field.required}
                          className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.key}
                          value={newBook[field.key] || ''}
                          onChange={handleChange}
                          required={field.required}
                          className="flex-1 ml-2 px-3 py-2 text-black bg-white border-2"
                        />
                      )}
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
                          inventoryType: (selectedBook?.originalCategory || activeCategory) === "masterlist" ? "MasterList" : 
                                       (selectedBook?.originalCategory || activeCategory) === "librarycollection" ? "LibraryCollection" :
                                       (selectedBook?.originalCategory || activeCategory) === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
                          title: newBook["Book Title"] || newBook.name || "Unknown Item",
                          author: newBook.Author || newBook.author || "Unknown Author",
                          category: selectedBook?.originalCategory || activeCategory
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
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                          newBook.name && newBook.author && newBook.isbn && newBook.genre
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      >
                        📥 Download QR
                      </button>
                      <button
                        onClick={handlePrintEditBookQR}
                        disabled={!newBook.name || !newBook.author || !newBook.isbn || !newBook.genre}
                        className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                          newBook.name && newBook.author && newBook.isbn && newBook.genre
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
                    author: "",
                    isbn: "",
                    genre: "",
                    color: "",
                    copies: "",
                    status: "Available",
                    "Accession Number": "",
                    "Date Received": "",
                    "Book Title": "",
                    "Call Number": "",
                    "Edition": "",
                    "Volume": "",
                    "Pages": "",
                    "Publisher": "",
                    "Copyright": "",
                    "URL": "",
                    "Date Uploaded": ""
                  });
                }}
                className="px-4 py-2 border rounded bg-white text-black hover:bg-red-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBook}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer"
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
              QR Code for "{selectedBook.qrData?.title || "Unknown Book"}"
            </h2>
            <div className="flex flex-col items-center">
              <div ref={bookQRRef}>
                <QRCodeCanvas
                  value={selectedBook.qrData ? JSON.stringify(selectedBook.qrData) : JSON.stringify({
                    type: "inventory",
                    inventoryItemId: selectedBook._id,
                    inventoryType: selectedBook.originalCategory === "masterlist" ? "MasterList" : 
                                 selectedBook.originalCategory === "librarycollection" ? "LibraryCollection" :
                                 selectedBook.originalCategory === "bookholdings" ? "ListofBookHoldings" : "Ebooks",
                    title: selectedBook["Book Title"] || 
                          selectedBook.booktitle || 
                          selectedBook.title || 
                          selectedBook.name || 
                          (selectedBook.originalCategory === "librarycollection" && selectedBook["School Year Semester"] && selectedBook["Course Name"]
                            ? `${selectedBook["School Year Semester"]} - ${selectedBook["Gen Ed Prof Ed"] || ""} - ${selectedBook["Course Name"]}`
                            : "Unknown Item"),
                    author: selectedBook.Author || selectedBook.author || "Unknown Author",
                    category: selectedBook.originalCategory || activeCategory
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
                <p><strong>Book:</strong> {selectedBook.qrData?.title || "Unknown Book"}</p>
                <p><strong>Author:</strong> {selectedBook.qrData?.author || selectedBook.Author || selectedBook.author || "Unknown Author"}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleDownloadBookQR}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-2"
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

      {/* Global QR Popup */}
      {showQRPopup && (
        <QRPopup qrData={qrData} onClose={() => setShowQRPopup(false)} />
      )}

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImport
          activeCategory={activeCategory}
          onImportComplete={() => {
            fetchInventoryData(activeCategory);
          }}
          onClose={() => setShowExcelImport(false)}
        />
      )}
    </div>
  );
};

export default BookShelf;
