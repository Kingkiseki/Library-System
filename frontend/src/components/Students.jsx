//frontend/src/components/Students.jsx
import { useState, useEffect } from "react";
import { FiSearch, FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import api from "../api";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [studentForm, setStudentForm] = useState({
    fullName: "",
    year: "",
    adviser: "",
    contacts: {
      mobile: "",
      email: "",
      facebook: "",
    },
  });

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/students");
        setStudents(res.data);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, []);

  // Save or update student
  const saveStudent = async () => {
    try {
      // Flatten payload to match backend schema
      const payload = {
        fullName: studentForm.fullName,
        year: studentForm.year,
        adviser: studentForm.adviser,
        mobile: studentForm.contacts.mobile,
        email: studentForm.contacts.email,
        facebook: studentForm.contacts.facebook,
      };

      if (editing) {
        const res = await api.put(`/students/${editing._id}`, payload);
        setStudents((prev) =>
          prev.map((s) => (s._id === editing._id ? res.data : s))
        );
      } else {
        const res = await api.post("/students", payload);
        setStudents((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving student:", err.response?.data || err.message);
      alert("Failed to save student. Please check backend connection.");
    }
  };

  // Delete student
  const deleteStudent = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  // Edit student
  const editStudent = (student) => {
    setEditing(student);
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
    setModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditing(null);
    setStudentForm({
      fullName: "",
      year: "",
      adviser: "",
      contacts: {
        mobile: "",
        email: "",
        facebook: "",
      },
    });
  };

  // Filtered students
  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Students</h2>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
          onClick={() => setModalOpen(true)}
        >
          <FiPlus /> Add Student
        </button>
      </div>

      <div className="flex items-center border px-3 py-2 rounded mb-4">
        <FiSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-2 outline-none w-full"
        />
      </div>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Full Name</th>
            <th className="border p-2">Year</th>
            <th className="border p-2">Adviser</th>
            <th className="border p-2">Mobile</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Facebook</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s._id}>
              <td className="border p-2">{s.fullName}</td>
              <td className="border p-2">{s.year}</td>
              <td className="border p-2">{s.adviser}</td>
              <td className="border p-2">{s.mobile}</td>
              <td className="border p-2">{s.email}</td>
              <td className="border p-2">{s.facebook}</td>
              <td className="border p-2 flex gap-2">
                <button
                  className="text-blue-500"
                  onClick={() => editStudent(s)}
                >
                  <FiEdit />
                </button>
                <button
                  className="text-red-500"
                  onClick={() => deleteStudent(s._id)}
                >
                  <FiTrash2 />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">
              {editing ? "Edit Student" : "Add Student"}
            </h3>
            <input
              type="text"
              placeholder="Full Name"
              value={studentForm.fullName}
              onChange={(e) =>
                setStudentForm({ ...studentForm, fullName: e.target.value })
              }
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Year"
              value={studentForm.year}
              onChange={(e) =>
                setStudentForm({ ...studentForm, year: e.target.value })
              }
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Adviser"
              value={studentForm.adviser}
              onChange={(e) =>
                setStudentForm({ ...studentForm, adviser: e.target.value })
              }
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Mobile"
              value={studentForm.contacts.mobile}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  contacts: { ...studentForm.contacts, mobile: e.target.value },
                })
              }
              className="border w-full p-2 mb-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={studentForm.contacts.email}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  contacts: { ...studentForm.contacts, email: e.target.value },
                })
              }
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Facebook"
              value={studentForm.contacts.facebook}
              onChange={(e) =>
                setStudentForm({
                  ...studentForm,
                  contacts: { ...studentForm.contacts, facebook: e.target.value },
                })
              }
              className="border w-full p-2 mb-2"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={saveStudent}
              >
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
