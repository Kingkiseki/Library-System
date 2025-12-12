// frontend/src/components/Students.jsx
import { useState, useEffect, useRef } from "react";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import QRPopup from "./QRPopup";
import api from "../api";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // State
  const [selectedContacts, setSelectedContacts] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);

  // QR Scanner states
  const [qrData, setQrData] = useState(null);
  const [showQRPopup, setShowQRPopup] = useState(false);

  const [studentForm, setStudentForm] = useState({
    fullName: "",
    year: "",
    adviser: "",
    contacts: { mobile: "", email: "", facebook: "" },
  });

  // QR ref
  const qrRef = useRef(null);
  const studentQRRef = useRef(null);

  // Fetch from backend
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/students");
        console.log("Fetched students data:", res.data);
        setStudents(res.data);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, []);

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
        if (buffer.trim() !== "" && buffer.length > 10) { // Increased minimum length
          const trimmedBuffer = buffer.trim();
          console.log("QR Scanner - Raw input:", trimmedBuffer);
          console.log("QR Scanner - Length:", trimmedBuffer.length);
          
          // Only proceed if it looks like valid QR data
          if (!trimmedBuffer.includes('student') && !trimmedBuffer.includes('book') && !trimmedBuffer.includes('2025-') && !trimmedBuffer.startsWith('{')) {
            console.log("QR Scanner - Invalid QR format, ignoring:", trimmedBuffer);
            buffer = "";
            return;
          }
          
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

  // Helpers
  const resetForm = () => {
    setStudentForm({
      fullName: "",
      year: "",
      adviser: "",
      contacts: { mobile: "", email: "", facebook: "" },
    });
    setEditStudentId(null);
  };

  const isFormComplete = () =>
    studentForm.fullName.trim() &&
    studentForm.year.trim() &&
    studentForm.adviser.trim() &&
    studentForm.contacts.mobile.trim() &&
    studentForm.contacts.email.trim() &&
    studentForm.contacts.facebook.trim();

  // Download QR
  const handleDownloadQR = () => {
    if (!isFormComplete()) {
      alert("Fill in all fields before downloading QR code.");
      return;
    }
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${studentForm.fullName}-qr.png`;
    link.click();
  };

  // Download Individual Student QR
  const handleDownloadStudentQR = () => {
    const canvas = studentQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedStudent.fullName}-${selectedStudent.studentNumber}-qr.png`;
    link.click();
  };

  // Print Individual Student QR
  const handlePrintStudentQR = () => {
    const canvas = studentQRRef.current?.querySelector("canvas");
    if (!canvas) return alert("QR not found!");
    
    const printWindow = window.open('', '_blank');
    const url = canvas.toDataURL("image/png");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Student QR Code - ${selectedStudent.fullName}</title>
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
            .student-info { 
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
            <h1>Student QR Code</h1>
            <h2>${selectedStudent.fullName}</h2>
          </div>
          <div class="qr-container">
            <img src="${url}" alt="Student QR Code" style="width: 200px; height: 200px;">
          </div>
          <div class="student-info">
            <p><strong>Student ID:</strong> ${selectedStudent.studentNumber}</p>
            <p><strong>Name:</strong> ${selectedStudent.fullName}</p>
            <p><strong>Year:</strong> ${selectedStudent.year}</p>
            <p><strong>Adviser:</strong> ${selectedStudent.adviser}</p>
            <p style="margin-top: 15px; font-size: 12px;">
              Scan this QR code to access student information for library borrowing
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

  // Form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["mobile", "email", "facebook"].includes(name)) {
      setStudentForm((prev) => ({
        ...prev,
        contacts: { ...prev.contacts, [name]: value },
      }));
    } else {
      setStudentForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Show individual student QR code
  const handleShowQRCode = (student) => {
    setSelectedStudent(student);
    setIsQRModalOpen(true);
  };

  // Add student (backend)
  const handleAddStudent = async () => {
    try {
      const payload = {
        fullName: studentForm.fullName,
        year: studentForm.year,
        adviser: studentForm.adviser,
        contacts: {
          mobile: studentForm.contacts.mobile,
          email: studentForm.contacts.email,
          facebook: studentForm.contacts.facebook,
        }
      };
      console.log("Adding student with payload:", payload);
      const res = await api.post("/students", payload);
      console.log("Student added successfully:", res.data);
      setStudents((prev) => [...prev, res.data]);
      resetForm();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding student:", err);
      alert("Failed to add student.");
    }
  };

  // Edit student (open modal)
  const openEditForSelected = () => {
    if (!selectedId) return alert("Select a student row first.");
    const student = students.find((s) => s._id === selectedId);
    if (!student) return;
    setEditStudentId(student._id);
    setStudentForm({
      fullName: student.fullName,
      year: student.year,
      adviser: student.adviser,
      contacts: {
        mobile: student.mobile || "",
        email: student.email || "",
        facebook: student.facebook || "",
      },
    });
    setIsEditModalOpen(true);
  };

  // Update student (backend)
  const handleUpdateStudent = async () => {
    try {
      const payload = {
        fullName: studentForm.fullName,
        year: studentForm.year,
        adviser: studentForm.adviser,
        contacts: {
          mobile: studentForm.contacts.mobile,
          email: studentForm.contacts.email,
          facebook: studentForm.contacts.facebook,
        }
      };
      console.log("Updating student with payload:", payload);
      const res = await api.put(`/students/${editStudentId}`, payload);
      console.log("Student updated successfully:", res.data);
      setStudents((prev) =>
        prev.map((s) => (s._id === editStudentId ? res.data : s))
      );
      resetForm();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Error updating student:", err);
      alert("Failed to update student.");
    }
  };

  // Delete multiple (backend)
  const handleDeleteSelected = async () => {
    if (selectedForDelete.length === 0) {
      return alert("No students selected.");
    }
    if (!window.confirm("Delete selected students?")) return;
    try {
      await Promise.all(
        selectedForDelete.map((id) => api.delete(`/students/${id}`))
      );
      setStudents((prev) => prev.filter((s) => !selectedForDelete.includes(s._id)));
      setSelectedForDelete([]);
    } catch (err) {
      console.error("Error deleting students:", err);
    }
  };

  const toggleSelectForDelete = (id) => {
    setSelectedForDelete((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Filter
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.year.toLowerCase().includes(search.toLowerCase()) ||
      s._id.includes(search)
  );

  return (
    <div className="p-8">
      <h2 className="text-3xl font-sans mb-2">Registered Students</h2>
      <p className="text-gray-600 mb-6">Students / Affiliated</p>

      {/* Search + Buttons */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center bg-white border-2 border-orange-500 rounded-full px-3 py-1 w-72 shadow-sm">
          <FiSearch className="text-orange-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent text-gray-700 outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500"
            title="Add student"
          >
            <FiPlus />
          </button>

          <button
            onClick={() => setShowDelete(!showDelete)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-red-500"
            title="Toggle delete mode"
          >
            <FiX />
          </button>

          <button
            onClick={openEditForSelected}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500"
            title="Edit selected"
          >
            <FiEdit />
          </button>

          {showDelete && (
            <button
              onClick={handleDeleteSelected}
              className="ml-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-500"
            >
              Delete Selected
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto bg-white rounded-lg"
        style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.4)" }}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-orange-500 text-white">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Full Name</th>
              <th className="px-4 py-2">Year/Grade</th>
              <th className="px-4 py-2">Adviser</th>
              <th className="px-4 py-2">Contacts</th>
              <th className="px-4 py-2">Actions</th>
              {showDelete && <th className="px-4 py-2">Select</th>}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={showDelete ? 7 : 6}
                  className="text-center text-gray-400 py-10 border"
                >
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedId === student._id;
                return (
                  <tr
                    key={student._id}
                    className={`cursor-pointer ${isSelected ? "bg-teal-500" : ""}`}
                    onClick={() => setSelectedId(student._id)}
                  >
                    <td className="px-4 py-2">{student._id}</td>
                    <td className="px-4 py-2">{student.fullName}</td>
                    <td className="px-4 py-2">{student.year}</td>
                    <td className="px-4 py-2">{student.adviser}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const contacts = {
                            mobile: student.contacts?.mobile || 'N/A',
                            email: student.contacts?.email || 'N/A',
                            facebook: student.contacts?.facebook || 'N/A',
                          };
                          setSelectedContacts(contacts);
                          setIsContactModalOpen(true);
                        }}
                        className="px-3 py-1 bg-teal-600 text-white rounded-full shadow hover:bg-teal-500"
                      >
                        See All...
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowQRCode(student);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                        title="Show QR Code"
                      >
                        📱
                      </button>
                    </td>
                    {showDelete && (
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedForDelete.includes(student._id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectForDelete(student._id);
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal with QR */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-orange-500 text-white p-8 rounded-lg shadow-lg w-[800px] flex justify-between">
            {/* Left form */}
            <div className="w-1/2 pr-6">
              <h3 className="text-lg font-bold mb-4">
                {isAddModalOpen ? "Student Registration" : "Edit Student"}
              </h3>

              {/* Full Name */}
              <div className="flex items-center mb-2">
                <label className="w-28 text-sm">Full Name</label>
                <input
                  name="fullName"
                  value={studentForm.fullName}
                  onChange={handleChange}
                  className="flex-1 p-2 text-black rounded border-2 bg-white"
                />
              </div>

              {/* Year/Grade */}
        <div className="flex items-center mb-2">
          <label className="w-28 text-sm">Year/Grade</label>
          <select
            name="year"
            value={studentForm.year}
            onChange={handleChange}
            className="flex-1 p-2 text-black rounded border-2 bg-white"
          >
            <option value="">Select Year/Grade</option>
            <optgroup label="Senior High School Department">
              <option value="Grade 11 - STEM">Grade 11 - STEM</option>
              <option value="Grade 11 - ABM">Grade 11 - ABM</option>
              <option value="Grade 11 - HUMSS">Grade 11 - HUMSS</option>
              <option value="Grade 11 - GAS">Grade 11 - GAS</option>
              <option value="Grade 11 - TVL">Grade 11 - TVL</option>
              <option value="Grade 12 - STEM">Grade 12 - STEM</option>
              <option value="Grade 12 - ABM">Grade 12 - ABM</option>
              <option value="Grade 12 - HUMSS">Grade 12 - HUMSS</option>
              <option value="Grade 12 - GAS">Grade 12 - GAS</option>
              <option value="Grade 12 - TVL">Grade 12 - TVL</option>
            </optgroup>
            <optgroup label="College Department">
              <option value="BSIS1">BSIS-1</option>
              <option value="BSIS2">BSIS-2</option>
              <option value="BSIS3">BSIS-3</option>
              <option value="BSIS4">BSIS-4</option>
              <option value="DIT1">DIT-1</option>
              <option value="DIT2">DIT-2</option>
              <option value="DIT3">DIT-3</option>
              <option value="DHRT1">DHRT-1</option>
              <option value="DHRT2">DHRT-2</option>
              <option value="DHRT3">DHRT-3</option>
              <option value="ACT1">ACT-1</option>
              <option value="ACT2">ACT-2</option>
            </optgroup>
          </select>
        </div>

              {/* Adviser */}
              <div className="flex items-center mb-2">
                <label className="w-28 text-sm">Adviser</label>
                <input
                  name="adviser"
                  value={studentForm.adviser}
                  onChange={handleChange}
                  className="flex-1 p-2 text-black rounded border-2 bg-white"
                />
              </div>

              {/* Contacts */}
              <h4 className="font-semibold mt-4 mb-2">CONTACTS</h4>
              <div className="flex items-center mb-2">
                <label className="w-28 text-sm">Cell No.</label>
                <input
                  name="mobile"
                  value={studentForm.contacts.mobile}
                  onChange={handleChange}
                  className="flex-1 p-2 text-black rounded border-2 bg-white"
                />
              </div>
              <div className="flex items-center mb-2">
                <label className="w-28 text-sm">Email</label>
                <input
                  name="email"
                  value={studentForm.contacts.email}
                  onChange={handleChange}
                  className="flex-1 p-2 text-black rounded border-2 bg-white"
                />
              </div>
              <div className="flex items-center mb-2">
                <label className="w-28 text-sm">Facebook</label>
                <input
                  name="facebook"
                  value={studentForm.contacts.facebook}
                  onChange={handleChange}
                  className="flex-1 p-2 text-black rounded border-2 bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-red-600"
                >
                  Cancel
                </button>
                {isAddModalOpen ? (
                  <button
                    onClick={handleAddStudent}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-teal-600"
                  >
                    Add
                  </button>
                ) : (
                  <button
                    onClick={handleUpdateStudent}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                  >
                    Update
                  </button>
                )}
              </div>
            </div>

            {/* Right QR */}
            <div className="flex items-center justify-center w-1/2">
              <div className="bg-white p-4 rounded-lg" ref={qrRef}>
                <QRCodeCanvas
                  value={JSON.stringify(studentForm)}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
                <p className="text-center text-black mt-2 text-sm">
                  Download/Print
                </p>
                <button
                  onClick={handleDownloadQR}
                  disabled={!isFormComplete()}
                  className={`ml-10 mt-2 px-3 py-1 rounded text-white ${
                    isFormComplete()
                      ? "bg-teal-600 hover:bg-teal-500"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Modal */}
      {isContactModalOpen && selectedContacts && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-bold mb-4">Contacts</h3>
            <p>Mobile: {selectedContacts.mobile}</p>
            <p>Email: {selectedContacts.email}</p>
            <p>Facebook: {selectedContacts.facebook}</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQRModalOpen && selectedStudent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4 text-center text-gray-800">
              QR Code for "{selectedStudent.fullName}"
            </h2>
            <div className="flex flex-col items-center">
              <div ref={studentQRRef}>
                <QRCodeCanvas
                  value={JSON.stringify({
                    type: "student",
                    studentId: selectedStudent._id,
                    studentNumber: selectedStudent.studentNumber,
                    fullName: selectedStudent.fullName
                  })}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Scan this QR code to access student information for borrowing
              </p>
              <div className="text-xs text-gray-500 mt-2 text-center">
                <p><strong>Student ID:</strong> {selectedStudent.studentNumber}</p>
                <p><strong>Name:</strong> {selectedStudent.fullName}</p>
                <p><strong>Year:</strong> {selectedStudent.year}</p>
                <p><strong>Adviser:</strong> {selectedStudent.adviser}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleDownloadStudentQR}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                📥 Download
              </button>
              <button
                onClick={handlePrintStudentQR}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => {
                  setIsQRModalOpen(false);
                  setSelectedStudent(null);
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
    </div>
  );
};

export default Students;
