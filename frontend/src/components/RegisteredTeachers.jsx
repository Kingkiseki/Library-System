import React, { useState, useRef } from "react";
import { FiSearch, FiPlus, FiX, FiEdit } from "react-icons/fi";
import QRCode from "react-qr-code";

const RegisteredTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teacherData, setTeacherData] = useState({
        id: "",
        name: "",
        advisory: "",
        teachingLevel: "",
        cell: "",
        email: "",
        facebook: "",
    });

    const qrRef = useRef(null);

    // Generate unique random ID
    const generateTeacherID = () => {
        return `TCH-${Math.floor(10000 + Math.random() * 90000)}`;
    };

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setTeacherData({ ...teacherData, [name]: value });
    };

    // Handle add teacher
    const handleAddTeacher = (e) => {
        e.preventDefault();
        if (!teacherData.name) return;

        const newTeacher = {
            ...teacherData,
            id: generateTeacherID(),
        };

        setTeachers([...teachers, newTeacher]);
        setIsModalOpen(false);
        setTeacherData({
            id: "",
            name: "",
            advisory: "",
            teachingLevel: "",
            cell: "",
            email: "",
            facebook: "",
        });
    };

    // Download QR as PNG
    const downloadQR = () => {
        const svg = qrRef.current.querySelector("svg");
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `${teacherData.id || "qr-code"}.png`;
            link.href = pngFile;
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <div className="p-8 text-gray-900">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-sans">Registered Teacher</h1>
                <p className="text-sm text-gray-600">Teacher / Affiliated</p>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center border border-gray-400 rounded-full px-3 py-1 w-80">
                    <FiSearch className="text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-transparent outline-none px-2 text-gray-800"
                    />
                </div>
                <div className="flex space-x-3 text-teal-700 text-xl">
                    <button
                        className="hover:scale-110 transition"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <FiPlus />
                    </button>
                    <button className="hover:scale-110 transition">
                        <FiEdit />
                    </button>
                    <button className="hover:scale-110 transition">
                        <FiX />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-teal-700 text-white">
                        <tr>
                            <th className="py-3 px-4">ID</th>
                            <th className="py-3 px-4">Full name</th>
                            <th className="py-3 px-4">Teaching level</th>
                            <th className="py-3 px-4">Advisory</th>
                            <th className="py-3 px-4">Contacts</th>
                            <th className="py-3 px-4">Records</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teachers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="6"
                                    className="text-center py-6 text-gray-500 italic"
                                >
                                    No teachers registered
                                </td>
                            </tr>
                        ) : (
                            teachers.map((t, index) => (
                                <tr key={index} className="border-b hover:bg-gray-100">
                                    <td className="py-3 px-4">{t.id}</td>
                                    <td className="py-3 px-4">{t.name}</td>
                                    <td className="py-3 px-4">{t.teachingLevel}</td>
                                    <td className="py-3 px-4">{t.advisory}</td>
                                    <td className="py-3 px-4">
                                        <button className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-1 rounded-full shadow-md transition">
                                            See all...
                                        </button>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-1 rounded-full shadow-md transition">
                                            See Records
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Teacher Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-teal-700 text-white rounded-lg shadow-2xl p-8 w-full max-w-4xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                        >
                            <FiX size={20} />
                        </button>

                        <h2 className="text-lg font-semibold mb-4">
                            Teacher Registration
                        </h2>

                        <form
                            onSubmit={handleAddTeacher}
                            className="grid grid-cols-2 gap-8"
                        >
                            {/* Left section */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">INFORMATION</h3>

                                <label className="block mt-2 text-sm">
                                    Name
                                    <input
                                        type="text"
                                        name="name"
                                        value={teacherData.name}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 rounded-full text-black outline-none border-2 bg-white"
                                        required
                                    />
                                </label>

                                <label className="block mt-3 text-sm">
                                    Advisory
                                    <input
                                        type="text"
                                        name="advisory"
                                        value={teacherData.advisory}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 rounded-full text-black outline-none border-2 bg-white"
                                    />
                                </label>

                                <div className="mt-4">
                                    <span className="text-sm">Teaching Level:</span>
                                    <div className="flex items-center gap-4 mt-1">
                                        {["Tertiary", "Secondary", "Both"].map((level) => (
                                            <label key={level} className="flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    name="teachingLevel"
                                                    value={level}
                                                    checked={teacherData.teachingLevel === level}
                                                    onChange={handleChange}
                                                />
                                                <span className="text-sm">{level}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold mt-6 mb-2">CONTACTS</h3>

                                <label className="block text-sm">
                                    Cell No.
                                    <input
                                        type="text"
                                        name="cell"
                                        value={teacherData.cell}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 rounded-full text-black outline-none border-2 bg-white"
                                    />
                                </label>

                                <label className="block mt-3 text-sm">
                                    Email
                                    <input
                                        type="email"
                                        name="email"
                                        value={teacherData.email}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 rounded-full text-black outline-none border-2 bg-white"
                                    />
                                </label>

                                <label className="block mt-3 text-sm">
                                    Facebook
                                    <input
                                        type="text"
                                        name="facebook"
                                        value={teacherData.facebook}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 rounded-full text-black outline-none border-2 bg-white"
                                    />
                                </label>
                            </div>

                            {/* Right section: QR Code */}
                            <div className="flex flex-col items-center justify-center">
                                <div ref={qrRef} className="bg-white p-4 rounded-lg">
                                    <QRCode
                                        value={teacherData.id || generateTeacherID()}
                                        size={150}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadQR}
                                    className="mt-3 text-sm underline hover:text-gray-200"
                                >
                                    Download / Print
                                </button>
                            </div>
                        </form>

                        <div className="flex justify-end mt-6">
                            <button
                                type="submit"
                                onClick={handleAddTeacher}
                                className="bg-white text-teal-700 font-semibold px-5 py-2 rounded-full hover:bg-gray-100 transition"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisteredTeachers;
