// frontend/src/components/BookShelf.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaBook } from "react-icons/fa";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api"; // ✅ connect to backend

const BookShelf = () => {
  const [books, setBooks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);

  const qrRef = useRef(null);

  // ✅ Fetch books from backend
  const fetchBooks = async () => {
    try {
      const res = await api.get("/books");
      setBooks(res.data);
    } catch (err) {
      console.error("Error fetching books:", err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewBook((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Add book to database
  const handleAddBook = async () => {
    if (!newBook.name || !newBook.author) {
      alert("Please fill out the required fields (Book Name & Author).");
      return;
    }

    const bookToAdd = {
      ...newBook,
      status: parseInt(newBook.copies, 10) === 0 ? "Not Available" : "Available",
    };

    try {
      await api.post("/books", bookToAdd); // save to backend
      fetchBooks(); // refresh list
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
      console.error("Error adding book:", err);
      alert("Failed to add book.");
    }
  };

  // ✅ Delete books from database
  const handleDeleteSelected = async () => {
    if (selectedBooks.length === 0) {
      alert("No books selected.");
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedBooks.length} book(s)?`
    );
    if (confirmDelete) {
      try {
        for (const idx of selectedBooks) {
          const book = books[idx];
          await api.delete(`/books/${book._id}`);
        }
        fetchBooks();
        setSelectedBooks([]);
        setDeleteMode(false);
      } catch (err) {
        console.error("Error deleting books:", err);
        alert("Failed to delete selected books.");
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

    const sortedBooks = [...books].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setBooks(sortedBooks);
  };

  const filteredBooks = books.filter((book) => {
    const query = search.toLowerCase();
    return (
      book.name.toLowerCase().includes(query) ||
      book.isbn.toLowerCase().includes(query) ||
      book.genre.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
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

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-4 pt-10">
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 rounded-full bg-white text-teal-600 border-2 border-teal-600 hover:bg-teal-400"
          title="Add Book"
        >
          <FiPlus />
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
          title={deleteMode ? "Confirm Delete" : "Delete Books"}
        >
          <FiX />
        </button>

        <button
          onClick={() => alert("Edit action not yet implemented.")}
          className="p-2 rounded-full bg-white text-teal-600 border-2 border-teal-600 hover:bg-yellow-400"
          title="Edit Book"
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
          <FaBook className="mr-2" />
          <h2 className="text-lg font-sans">Book List</h2>
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
                {[
                  { key: "name", label: "Book Name" },
                  { key: "isbn", label: "ISBN No." },
                  { key: "genre", label: "Genre" },
                  { key: "author", label: "Author" },
                  { key: "color", label: "Color Code" },
                  { key: "copies", label: "Copies" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-2 sm:px-4 py-2 border cursor-pointer hover:bg-gray-200"
                  >
                    {col.label}{" "}
                    {sortConfig.key === col.key
                      ? sortConfig.direction === "asc"
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={deleteMode ? "8" : "7"} className="text-center text-gray-400 py-10 border">
                    No books found
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book, idx) => (
                  <tr
                    key={book._id || idx}
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
                    <td className="px-2 sm:px-4 py-2 border">{book.name}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.isbn}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.genre}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.author}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.color}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.copies}</td>
                    <td className="px-2 sm:px-4 py-2 border">{book.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-teal-700 rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4 text-white">
            <h2 className="text-lg font-bold mb-6">Adding new book</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side - Inputs */}
              <div>
                <h3 className="font-semibold mb-4 text-center">BOOK INFORMATION</h3>
                <div className="space-y-4">
                  {[
                    { label: "Book Name", name: "name", type: "text" },
                    { label: "ISBN No.", name: "isbn", type: "text" },
                    { label: "Genre", name: "genre", type: "text" },
                    { label: "Author", name: "author", type: "text" },
                    { label: "Color Code", name: "color", type: "text" },
                    { label: "Copies", name: "copies", type: "number" },
                  ].map((field) => (
                    <div key={field.name} className="flex items-center">
                      <label className="w-28 text-sm font-medium">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={newBook[field.name]}
                        onChange={handleChange}
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
                    <div ref={qrRef}>
                      <QRCodeCanvas
                        value={`Book: ${newBook.name}, ISBN: ${newBook.isbn}, Genre: ${newBook.genre}, Author: ${newBook.author}, Color: ${newBook.color}`}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={true}
                      />
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
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-teal-800 cursor-pointer"
              >
                Add Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookShelf;
