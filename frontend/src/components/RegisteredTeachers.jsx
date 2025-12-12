import { useState, useEffect, useRef } from "react";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import QRPopup from "./QRPopup";
import api from "../api";

const RegisteredTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // State
  const [selectedContacts, setSelectedContacts] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [editTeacherId, setEditTeacherId] = useState(null);

  // QR Scanner states
  const [qrData, setQrData] = useState(null);
  const [showQRPopup, setShowQRPopup] = useState(false);

  const [teacherForm, setTeacherForm] = useState({
    fullName: "",
    teachingLevel: "Senior High School (Faculty)",
    advisory: "",
    contacts: { mobile: "", email: "", facebook: "" },
  });

  // QR refs
  const qrRef = useRef(null);
  const teacherQRRef = useRef(null);

  // Load teachers on mount
  useEffect(() => {
    fetchTeachers();
  }, []);

  // Fetch all teachers
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate unique random ID
  const generateTeacherID = () => {
    return `TCH-${Math.floor(10000 + Math.random() * 90000)}`;
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('contacts.')) {
      const contactField = name.split('.')[1];
      setTeacherForm(prev => ({
        ...prev,
        contacts: { ...prev.contacts, [contactField]: value }
      }));
    } else {
      setTeacherForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle add teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!teacherForm.fullName.trim()) return;

    try {
      setLoading(true);
      await api.post('/teachers', teacherForm);
      await fetchTeachers(); // Refresh list
      setIsAddModalOpen(false);
      setTeacherForm({
        fullName: "",
        teachingLevel: "Senior High School (Faculty)",
        advisory: "",
        contacts: { mobile: "", email: "", facebook: "" },
      });
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Error adding teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit teacher
  const handleEditTeacher = async (e) => {
    e.preventDefault();
    if (!teacherForm.fullName.trim()) return;

    try {
      setLoading(true);
      await api.put(`/teachers/${editTeacherId}`, teacherForm);
      await fetchTeachers(); // Refresh list
      setIsEditModalOpen(false);
      setEditTeacherId(null);
      setTeacherForm({
        fullName: "",
        teachingLevel: "Senior High School (Faculty)",
        advisory: "",
        contacts: { mobile: "", email: "", facebook: "" },
      });
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Error updating teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (teacher) => {
    setTeacherForm({
      fullName: teacher.fullName,
      teachingLevel: teacher.teachingLevel,
      advisory: teacher.advisory || "",
      contacts: teacher.contacts || { mobile: "", email: "", facebook: "" },
    });
    setEditTeacherId(teacher._id);
    setIsEditModalOpen(true);
  };

  // Delete teacher
  const deleteTeacher = async (teacherId) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/teachers/${teacherId}`);
      await fetchTeachers(); // Refresh list
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Error deleting teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show contacts modal
  const showContacts = (contacts) => {
    setSelectedContacts(contacts);
    setIsContactModalOpen(true);
  };

  // Show QR code modal
  const showQRCode = (teacher) => {
    setSelectedTeacher(teacher);
    setIsQRModalOpen(true);
  };

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(search.toLowerCase()) ||
    teacher.teachingLevel.toLowerCase().includes(search.toLowerCase()) ||
    (teacher.advisory && teacher.advisory.toLowerCase().includes(search.toLowerCase()))
  );

  // Download QR as PNG
  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `${selectedTeacher?.fullName || "teacher"}-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-sans mb-2">Registered Teacher</h2>
            <p className="text-gray-600 mb-6">Teacher / Affiliated</p>

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
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500"
                        title="Add teacher"
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
                        onClick={() => {
                            if (selectedId) {
                                const teacher = teachers.find(t => t._id === selectedId);
                                if (teacher) openEditModal(teacher);
                            }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500"
                        title="Edit selected"
                    >
                        <FiEdit />
                    </button>

                    {showDelete && (
                        <button
                            onClick={() => {
                                if (selectedForDelete.length > 0 && confirm(`Delete ${selectedForDelete.length} teacher(s)?`)) {
                                    Promise.all(selectedForDelete.map(id => api.delete(`/teachers/${id}`)))
                                        .then(() => {
                                            fetchTeachers();
                                            setSelectedForDelete([]);
                                            setShowDelete(false);
                                        });
                                }
                            }}
                            className="px-4 py-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                            Delete ({selectedForDelete.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-orange-500 text-white">
                            <th className="px-4 py-2">ID</th>
                            <th className="px-4 py-2">Full Name</th>
                            <th className="px-4 py-2">Teaching level</th>
                            <th className="px-4 py-2">Advisory</th>
                            <th className="px-4 py-2">Contacts</th>
                            <th className="px-4 py-2">Actions</th>
                            {showDelete && <th className="px-4 py-2">Select</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={showDelete ? 7 : 6} className="text-center text-gray-400 py-10">
                                    Loading teachers...
                                </td>
                            </tr>
                        ) : filteredTeachers.length === 0 ? (
                            <tr>
                                <td colSpan={showDelete ? 7 : 6} className="text-center text-gray-400 py-10">
                                    No teachers found
                                </td>
                            </tr>
                        ) : (
                            filteredTeachers.map((teacher) => {
                                const isSelected = selectedId === teacher._id;
                                return (
                                    <tr
                                        key={teacher._id}
                                        className={`cursor-pointer hover:bg-gray-100 ${isSelected ? "bg-teal-500" : ""}`}
                                        onClick={() => setSelectedId(teacher._id)}
                                        onDoubleClick={() => openEditModal(teacher)}
                                    >
                                        <td className="px-4 py-2">{teacher._id.slice(0, 6)}</td>
                                        <td className="px-4 py-2">{teacher.fullName}</td>
                                        <td className="px-4 py-2">{teacher.teachingLevel}</td>
                                        <td className="px-4 py-2">{teacher.advisory || "N/A"}</td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showContacts(teacher.contacts);
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
                                                    showQRCode(teacher);
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
                                                    checked={selectedForDelete.includes(teacher._id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        if (e.target.checked) {
                                                            setSelectedForDelete([...selectedForDelete, teacher._id]);
                                                        } else {
                                                            setSelectedForDelete(selectedForDelete.filter(id => id !== teacher._id));
                                                        }
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

            {/* Add Teacher Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-orange-500 text-white rounded-lg shadow-2xl p-8 w-full max-w-3xl relative">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                        >
                            <FiX size={20} />
                        </button>

                        <h2 className="text-xl font-semibold mb-6">Teacher Registration</h2>

                        <form onSubmit={handleAddTeacher} className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Information</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="block text-sm">
                                        Full Name *
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={teacherForm.fullName}
                                            onChange={handleFormChange}
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                            required
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Advisory/Section
                                        <input
                                            type="text"
                                            name="advisory"
                                            value={teacherForm.advisory}
                                            onChange={handleFormChange}
                                            placeholder="e.g., Grade 7-A, STEM-12, etc."
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <div>
                                        <span className="text-sm block mb-2">Teaching Level *</span>
                                        <div className="flex items-center gap-6">
                                            {["Senior High School Teacher (Faculty)", "College Teacher (Faculty)"].map((level) => (
                                                <label key={level} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="teachingLevel"
                                                        value={level}
                                                        checked={teacherForm.teachingLevel === level}
                                                        onChange={handleFormChange}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">{level}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Contact Information</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="block text-sm">
                                        Mobile Number
                                        <input
                                            type="text"
                                            name="contacts.mobile"
                                            value={teacherForm.contacts.mobile}
                                            onChange={handleFormChange}
                                            placeholder="09xxxxxxxxx"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Email Address
                                        <input
                                            type="email"
                                            name="contacts.email"
                                            value={teacherForm.contacts.email}
                                            onChange={handleFormChange}
                                            placeholder="teacher@school.edu"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Facebook Profile
                                        <input
                                            type="text"
                                            name="contacts.facebook"
                                            value={teacherForm.contacts.facebook}
                                            onChange={handleFormChange}
                                            placeholder="Facebook username or profile link"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-6 py-2 border border-white text-white rounded-lg hover:bg-white hover:text-orange-600 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white text-orange-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                                >
                                    {loading ? "Saving..." : "Save Teacher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Teacher Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-orange-500 text-white rounded-lg shadow-2xl p-8 w-full max-w-3xl relative">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                        >
                            <FiX size={20} />
                        </button>

                        <h2 className="text-xl font-semibold mb-6">Edit Teacher</h2>

                        <form onSubmit={handleEditTeacher} className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Information</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="block text-sm">
                                        Full Name *
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={teacherForm.fullName}
                                            onChange={handleFormChange}
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                            required
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Advisory/Section
                                        <input
                                            type="text"
                                            name="advisory"
                                            value={teacherForm.advisory}
                                            onChange={handleFormChange}
                                            placeholder="e.g., Grade 7-A, STEM-12, etc."
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <div>
                                        <span className="text-sm block mb-2">Teaching Level *</span>
                                        <div className="flex items-center gap-6">
                                            {["Senior High School (Faculty)", "College (Faculty)"].map((level) => (
                                                <label key={level} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="teachingLevel"
                                                        value={level}
                                                        checked={teacherForm.teachingLevel === level}
                                                        onChange={handleFormChange}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">{level}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide">Contact Information</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="block text-sm">
                                        Mobile Number
                                        <input
                                            type="text"
                                            name="contacts.mobile"
                                            value={teacherForm.contacts.mobile}
                                            onChange={handleFormChange}
                                            placeholder="09xxxxxxxxx"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Email Address
                                        <input
                                            type="email"
                                            name="contacts.email"
                                            value={teacherForm.contacts.email}
                                            onChange={handleFormChange}
                                            placeholder="teacher@school.edu"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>

                                    <label className="block text-sm">
                                        Facebook Profile
                                        <input
                                            type="text"
                                            name="contacts.facebook"
                                            value={teacherForm.contacts.facebook}
                                            onChange={handleFormChange}
                                            placeholder="Facebook username or profile link"
                                            className="w-full mt-1 p-3 rounded-lg text-black outline-none border-2 bg-white"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-6 py-2 border border-white text-white rounded-lg hover:bg-white hover:text-orange-600 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white text-orange-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                                >
                                    {loading ? "Updating..." : "Update Teacher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Contacts Modal */}
            {isContactModalOpen && selectedContacts && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                            <button
                                onClick={() => setIsContactModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-semibold text-gray-600">Mobile:</label>
                                <p className="text-gray-900">{selectedContacts.mobile || "Not provided"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600">Email:</label>
                                <p className="text-gray-900">{selectedContacts.email || "Not provided"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-600">Facebook:</label>
                                <p className="text-gray-900">{selectedContacts.facebook || "Not provided"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {isQRModalOpen && selectedTeacher && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
                            <button
                                onClick={() => setIsQRModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <div ref={qrRef} className="mb-4">
                                <QRCodeCanvas
                                    value={JSON.stringify({
                                        type: "teacher",
                                        teacherId: selectedTeacher._id,
                                        fullName: selectedTeacher.fullName,
                                        teachingLevel: selectedTeacher.teachingLevel
                                    })}
                                    size={200}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-sm text-gray-600 text-center mb-4">
                                QR Code for {selectedTeacher.fullName}
                            </p>
                            <button
                                onClick={downloadQR}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition"
                            >
                                Download QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisteredTeachers;