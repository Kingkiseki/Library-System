// frontend/src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Automatically attach token for every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token"); // Get token
  if (token) {
    req.headers.Authorization = `Bearer ${token}`; // Attach token
  }
  return req;
});

export const addStudent = (data) => API.post("/students", data);
export const getStudent = (id) => API.get(`/students/${id}`);
export const getStudents = () => API.get("/students");
export const payFine = (id) => API.patch(`/students/${id}/payfine`);

export const addBook = (data) => API.post("/books", data);
export const getBooks = () => API.get("/books");

export const borrowBook = (studentId, bookId) =>
  API.post("/borrow/borrow", { studentId, bookId });

export const returnBook = (studentId, bookId) =>
  API.post("/borrow/return", { studentId, bookId });

export const getBorrowRecords = () => API.get("/borrow");

// QR Popup API
export const getStudentProfile = (studentId) =>
  API.post("/borrow/scan/student", { studentId });

export const borrowBookByQR = (studentId, bookId) => {
  console.log("🌐 API: borrowBookByQR called with:", { studentId, bookId });
  console.log("🌐 API: bookId details:", {
    raw: JSON.stringify(bookId),
    type: typeof bookId,
    length: bookId?.length,
    charCodes: bookId ? Array.from(bookId).map(c => c.charCodeAt(0)) : 'N/A'
  });
  return API.post("/borrow/scan/book", { studentId, bookId, action: "borrow" });
};

export const returnBookByQR = (borrowId) =>
  API.post("/borrow/scan/book", { studentId: null, bookId: borrowId, action: "return" });

export const removeFine = (studentId) =>
  API.post("/borrow/pay/fine", { studentId });

export default API;
