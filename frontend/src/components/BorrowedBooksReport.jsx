import { useState, useEffect } from "react";
import api from "../api";

const BorrowedBooksReport = () => {
  const [borrowCount, setBorrowCount] = useState(0);
  const [borrowList, setBorrowList] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch borrowed count + list
  useEffect(() => {
    api.get("/books/borrowedCount").then((res) => setBorrowCount(res.data.count));

    api.get("/books/borrowedList").then((res) => setBorrowList(res.data));
  }, []);

  // Filter logic for search bar
  const filteredBorrowList = borrowList.filter((item) => {
    const dateBorrowed = new Date(item.dateBorrowed)
      .toLocaleDateString()
      .toLowerCase();

    const query = search.toLowerCase();

    return (
      item.bookTitle.toLowerCase().includes(query) ||
      item.studentName.toLowerCase().includes(query) ||
      (item.yearOrGrade && item.yearOrGrade.toLowerCase().includes(query)) ||
      dateBorrowed.includes(query)
    );
  });

  return (
    <div>
      {/* Borrowed Books Box */}
      <div
        className="bg-teal-700 text-white p-5 rounded-xl cursor-pointer hover:bg-teal-600 transition shadow-xl"
        onClick={() => setOpenModal(true)}
      >
        <h2 className="text-2xl font-bold">Borrowed Books</h2>
        <p className="text-5xl font-extrabold mt-3">{borrowCount}</p>
        <p className="text-sm opacity-80 mt-2">Click to view details</p>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white w-[900px] max-h-[85vh] p-7 rounded-xl shadow-2xl flex flex-col">

            {/* Title */}
            <h2 className="text-3xl font-bold mb-5 text-teal-700">
              Borrowed Books
            </h2>

            {/* SEARCH BAR WITH ICON */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-3 text-gray-500">🔍</span>
              <input
                type="text"
                placeholder="Search book, student, year/grade, or date..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 
                     focus:ring-2 focus:ring-teal-600 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Headers */}
            <div className="grid grid-cols-4 font-semibold text-gray-700 border-b pb-2 mb-2">
              <span>📘 Book Name</span>
              <span>🧑 Borrowed By</span>
              <span>🎓 Year / Grade</span>
              <span>📅 Date Borrowed</span>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="overflow-y-auto flex-1 pr-2" style={{ maxHeight: "58vh" }}>
              {filteredBorrowList.length === 0 ? (
                <p className="text-gray-600">No results found.</p>
              ) : (
                filteredBorrowList.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 py-3 border-b text-sm gap-2"
                  >
                    <span className="font-medium break-words">{item.bookTitle}</span>
                    <span className="break-words">{item.studentName}</span>
                    <span className="break-words">{item.yearOrGrade}</span>
                    <span>
                      {new Date(item.dateBorrowed).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* CLOSE */}
            <div className="text-right mt-4">
              <button
                className="bg-teal-700 text-white px-5 py-2 rounded-lg hover:bg-teal-600"
                onClick={() => setOpenModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BorrowedBooksReport;
