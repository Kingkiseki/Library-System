// frontend/src/components/Bookshelf.jsx
import React, { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import { FiSearch, FiTrash2, FiEdit } from "react-icons/fi";
import api from "../api";

const BookShelf = () => {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");

  // Fetch books from backend
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get("/books");
        setBooks(res.data);
      } catch (err) {
        console.error("Error fetching books:", err);
      }
    };
    fetchBooks();
  }, []);

  // Filter books by title or author
  const filteredBooks = books.filter((book) =>
  (book.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
  (book.author?.toLowerCase() || "").includes(search.toLowerCase())
);

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="flex items-center border rounded-lg p-2 mb-6">
        <FiSearch className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search books..."
          className="flex-1 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Book List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <div
            key={book._id}
            className="border rounded-lg p-4 shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center mb-2">
              <FaBook className="text-blue-500 mr-2" />
              <h2 className="font-bold text-lg">{book.title}</h2>
            </div>

            <p className="text-gray-600 mb-2 flex items-center">
              <span className="font-medium">Author:</span>&nbsp;{book.author}
              {/* Show QR Code beside author */}
              {book.qrCode && (
                <img
                  src={book.qrCode}
                  alt="Book QR"
                  className="ml-3 w-12 h-12 border rounded"
                />
              )}
            </p>

            <p className="text-gray-500">
              <span className="font-medium">Category:</span> {book.category}
            </p>
            <p className="text-gray-500 mb-3">
              <span className="font-medium">Copies:</span> {book.copies}
            </p>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button className="text-yellow-500 hover:text-yellow-700">
                <FiEdit size={18} />
              </button>
              <button className="text-red-500 hover:text-red-700">
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookShelf;
