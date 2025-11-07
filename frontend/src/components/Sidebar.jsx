// frontend/src/components/Sidebar.jsx
import { useNavigate } from "react-router-dom";
import dashboardIcon from "../assets/dashboards.png";
import graduationIcon from "../assets/graduation.png";
import groupIcon from "../assets/group.png";
import libraryIcon from "../assets/library.png";
import checklists from "../assets/inventory2.png"
import logo from "../assets/logo1.png"; // using logo1 from 2nd code

const Sidebar = ({ activePage, setActivePage }) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: "dashboard", icon: dashboardIcon, label: "Dashboard", path: "/dashboard" },
    { id: "bookshelf", icon: libraryIcon, label: "Bookshelf", path: "/bookshelf" },
    { id: "students", icon: graduationIcon, label: "Students", path: "/students" },
    { id: "faculty", icon: groupIcon, label: "Faculty", path: "/faculty" },
    { id: "library", icon: checklists, label: "Inventory", path: "/library" },
  ];

  return (
    <div className="bg-teal-800 text-white flex sm:flex-col sm:w-45 h-16 sm:h-screen w-full fixed sm:relative bottom-0 sm:top-0 z-50" style={{ boxShadow: "8px 8px 20px rgba(0,0,0,0.4)" }}>
      {/* Menu */}
      <div className="flex sm:flex-col justify-around sm:justify-start items-center w-full sm:mt-0 sm:flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActivePage(item.id);
              navigate(item.path);
            }}
            className={`flex flex-col items-center justify-center sm:w-full sm:p-5 transition
              ${activePage === item.id
                ? "bg-teal-600 sm:border-l-4 sm:border-orange-500 text-white"
                : "hover:bg-teal-700"
              }`}
          >
            <img
              src={item.icon}
              alt={item.id}
              className="w-6 h-6 sm:w-8 sm:h-8 filter invert brightness-0 saturate-100"
            />
            <span className="hidden sm:block text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Logo */}
      <div className="hidden sm:flex flex-col items-center justify-center border-t border-gray-200 py-3">
        <img src={logo} alt="Logo" className="w-28 h-28 invert" />
      </div>
    </div>
  );
};

export default Sidebar;
