// frontend/src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Automatically attach token for every request
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem("token"); // Get token
    if (token) {
      req.headers.Authorization = `Bearer ${token}`; // Attach token
    }
    return req;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid, clear it and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const addStudent = (data) => API.post("/students", data);
export const getStudent = (id) => API.get(`/students/${id}`);
export const getStudents = () => API.get("/students");
export const payFine = (id) => API.patch(`/students/${id}/payfine`);

// Books API functions - now connected to inventory models
export const addBook = (data) => API.post("/books", data);
export const getBooks = (inventoryType) => API.get(`/books?inventoryType=${inventoryType || 'masterlist'}`);
export const getAllBooks = () => API.get("/books/all");

export const borrowBook = (studentId, bookId) =>
  API.post("/borrow/borrow", { studentId, bookId });

export const returnBook = (studentId, bookId) =>
  API.post("/borrow/return", { studentId, bookId });

export const getBorrowRecords = () => API.get("/borrow");

// QR Popup API
export const getStudentProfile = (studentId) =>
  API.post("/borrow/scan/student", { studentId });

export const getTeacherProfile = (teacherId) =>
  API.post("/borrow/scan/student", { teacherId, borrowerType: "teacher" });

export const borrowBookByQR = (borrowerId, bookId, borrowerType = "student") => {
  console.log("🌐 API: borrowBookByQR called with:", { borrowerId, bookId, borrowerType });
  console.log("🌐 API: bookId details:", {
    raw: JSON.stringify(bookId),
    type: typeof bookId,
    length: bookId?.length
  });
  
  const apiData = {
    action: "borrow",
    borrowerType: borrowerType
  };
  
  // Parse bookId if it's a JSON string with inventory info
  try {
    const bookData = JSON.parse(bookId);
    if (bookData.type === "inventory" && bookData.inventoryItemId && bookData.inventoryType) {
      apiData.inventoryItemId = bookData.inventoryItemId;
      apiData.inventoryType = bookData.inventoryType;
      console.log("✅ Extracted inventory data from QR:", { 
        inventoryItemId: bookData.inventoryItemId, 
        inventoryType: bookData.inventoryType 
      });
    } else {
      // Fallback to legacy format
      apiData.bookId = bookId;
    }
  } catch (e) {
    // Not JSON, use as is
    apiData.bookId = bookId;
  }
  
  if (borrowerType === "teacher") {
    apiData.teacherId = borrowerId;
  } else {
    apiData.studentId = borrowerId;
  }
  
  console.log("📤 Sending to backend:", apiData);
  return API.post("/borrow/scan/book", apiData);
};

export const returnBookByQR = (borrowId) =>
  API.post("/borrow/scan/book", { studentId: null, bookId: borrowId, action: "return" });

export const removeFine = (studentId) =>
  API.post("/borrow/pay/fine", { studentId });

export default API;
