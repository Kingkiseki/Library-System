import React, { useEffect, useState } from "react";
import {
  getStudentProfile,
  borrowBookByQR,
  returnBookByQR,
  removeFine,
} from "../api";

const QRPopup = ({ qrData, onClose }) => {
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowMode, setBorrowMode] = useState(false);
  const [returnMode, setReturnMode] = useState(false);
  const [bookQR, setBookQR] = useState("");

  useEffect(() => {
    if (!qrData) return;
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.studentId) fetchProfile(parsed.studentId);
    } catch {
      console.error("Invalid QR Data");
      setStudentProfile(null);
      setLoading(false);
    }
  }, [qrData]);

  const fetchProfile = async (id) => {
    setLoading(true);
    try {
      const res = await getStudentProfile(id);
      setStudentProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBookScan = async (e) => {
    if (e.key === "Enter") {
      try {
        const parsed = JSON.parse(e.target.value);
        if (parsed.bookId) {
          setBookQR(parsed.bookId);
        } else {
          console.error("QR does not contain a bookId");
        }
      } catch {
        console.error("Invalid QR format");
      }
    }
  };

  const confirmBorrow = async () => {
    if (!studentProfile?.student?._id || !bookQR) return;
    try {
      await borrowBookByQR(studentProfile.student._id, bookQR);
      fetchProfile(studentProfile.student._id);
    } catch (err) {
      console.error("Error borrowing book:", err.response?.data || err);
    } finally {
      resetModes();
    }
  };

  const confirmReturn = async (borrowId) => {
    if (!borrowId) return;
    try {
      await returnBookByQR(borrowId);
      fetchProfile(studentProfile.student._id);
    } catch (err) {
      console.error("Error returning book:", err.response?.data || err);
    } finally {
      resetModes();
    }
  };

  const resetModes = () => {
    setBorrowMode(false);
    setReturnMode(false);
    setBookQR("");
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        <button className="absolute top-2 right-2" onClick={onClose}>
          ✕
        </button>

        {!studentProfile ? (
          <div>Please register to borrow or return books</div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">{studentProfile.student.fullName}</h2>
            <p>Year: {studentProfile.student.year}</p>
            <p>Adviser: {studentProfile.student.adviser}</p>

            <div className="my-4">
              <h3 className="font-bold">Borrowed Books:</h3>
              {studentProfile.borrowedBooks.length === 0 ? (
                <p>No borrowed books</p>
              ) : (
                <ul>
                  {studentProfile.borrowedBooks.map((b) => (
                    <li key={b._id} className="flex justify-between items-center">
                      <span>
                        {b.book?.title} — Fine: ₱{b.fine}
                      </span>
                      {returnMode && (
                        <button
                          onClick={() => confirmReturn(b._id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Return
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="my-2">
              <h3>Total Fines: ₱{studentProfile.totalFine}</h3>
              {studentProfile.totalFine > 0 && (
                <button
                  onClick={() =>
                    removeFine(studentProfile.student._id).then(() =>
                      fetchProfile(studentProfile.student._id)
                    )
                  }
                  className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                >
                  Mark Fine as Paid
                </button>
              )}
            </div>

            {!borrowMode && !returnMode && (
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setBorrowMode(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Borrow Book
                </button>
                <button
                  onClick={() => setReturnMode(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Return Book
                </button>
              </div>
            )}

            {borrowMode && (
              <div className="mt-4">
                <p>Scan Book QR:</p>
                <input
                  type="text"
                  placeholder="Scan QR and press Enter"
                  onKeyDown={handleBookScan}
                  className="border p-2 w-full"
                  autoFocus
                />
                {bookQR && (
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={confirmBorrow}
                      className="bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Continue
                    </button>
                    <button
                      onClick={resetModes}
                      className="bg-gray-500 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QRPopup;
