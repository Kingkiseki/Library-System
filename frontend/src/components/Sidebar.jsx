import { useNavigate } from "react-router-dom";
import dashboardIcon from "../assets/dashboards.png";
import graduationIcon from "../assets/graduation.png";
import groupIcon from "../assets/group.png";
import libraryIcon from "../assets/library.png";
import logo from "../assets/logo.png";
import qrcodeIcon from "../assets/qr-code.png";

const Sidebar = ({ activePage, setActivePage }) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: "dashboard", icon: dashboardIcon, label: "Dashboard", path: "/dashboard" },
    { id: "bookshelf", icon: libraryIcon, label: "Bookshelf", path: "/bookshelf" },
    { id: "students", icon: graduationIcon, label: "Students", path: "/students" },
    { id: "faculty", icon: groupIcon, label: "Faculty", path: "/faculty" },
    { id: "qrcode", icon: qrcodeIcon, label: "QR-code", path: "/qrcode" },
  ];

  return (
    <div className="bg-teal-800 text-white flex sm:flex-col sm:w-45 sm:h-screen h-16 w-full fixed sm:relative bottom-0 sm:top-0 z-50">
      <div className="flex sm:flex-col justify-around sm:justify-start items-center w-full sm:mt-0 sm:flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActivePage(item.id);
              navigate(item.path);
            }}
            className={`flex flex-col items-center justify-center sm:w-full sm:p-8 transition
              ${activePage === item.id
                ? "bg-teal-600 sm:border-l-6 sm:border-orange-500 text-white"
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
      <div className="hidden sm:flex flex-col items-center justify-center border-t-2 border-white py-2">
        <img src={logo} alt="Logo" className="w-50 h-50 invert" />
      </div>
    </div>
  );
};

export default Sidebar;
