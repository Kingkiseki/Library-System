import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiUser, FiKey } from "react-icons/fi";
import api from "../api"; // axios instance
import logo from "../assets/logo2.png";
import accountbg from "../assets/accountbg.png";
import bgmark from "../assets/bgmark.png";

const LoginPage = ({ setToken }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  // Close popup if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ Login handler with backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const token = res.data.token;

      localStorage.setItem("token", token); // save token
      setToken(token);
      navigate("/dashboard"); // redirect
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${accountbg})` }}
      />

      {/* Overlay (teal tint) */}
      <div className="absolute top-0 left-0 h-full bg-teal-700/90" />

      {/* Logo in top-right */}
      <div className="absolute top-4 right-6 z-20">
        <img src={logo} alt="Logo" className="w-25" />
      </div>

      {/* Left Section (Tagline) */}
      <div className="relative z-10 w-full flex flex-col justify-center items-center text-white p-10">
        {/* Title Group */}
        <div className="flex flex-col items-start text-left">
          <h1 className="text-xl font-bold mb-1 tracking-wide ml-1">
            NORTHLINK TECHNOLOGICAL COLLEGE
          </h1>
          <h2 className="text-8xl font-bold pr-20">LIBRARY SYSTEM</h2>
        </div>

        {/* Centered tagline */}
        <p className="text-lg text-justify max-w-md mt-2">
          Scan with ease, read <br />  with purpose— bridging digital <br />  and physical.
        </p>
      </div>




      {/* Right Section (Login Form) */}
      <div className="relative z-10 w-1/2 flex items-center justify-center bg-white">
        <div className="w-[350px]">
          <h2 className="text-3xl font-bold mb-6 text-teal-600">Login</h2>

          {error && <p className="text-red-500 mb-2">{error}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex items-center rounded-lg px-3 py-2 bg-teal-600">
              <FiUser className="mr-2 text-white text-lg" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 outline-none text-white placeholder-gray-200"
                required
              />
            </div>

            {/* Password Field */}
            <div className="flex items-center bg-teal-600 rounded-lg px-3 py-2 relative">
              <FiKey className="mr-2 text-white text-lg" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 outline-none text-white placeholder-gray-200 pr-8"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-300 hover:text-white"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Buttons Section */}
            <div className="flex items-center justify-between mt-2 relative">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-md text-teal-400 hover:underline"
                >
                  Sign up
                </button>

                {/* Info Popup Button */}
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="w-5 h-5 flex items-center justify-center border border-teal-600 rounded-full text-xs text-teal-600 hover:bg-teal-100"
                >
                  ?
                </button>
              </div>

              <button
                type="submit"
                className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition"
              >
                Login
              </button>

              {/* Info Card Popup */}
              {showInfo && (
                <div
                  ref={popupRef}
                  className="absolute left-0 top-8 mt-3 w-[260px] z-20"
                >
                  <div className="relative">
                    <img
                      src={bgmark}
                      alt="Info"
                      className="w-full h-auto rounded-full"
                      style={{
                        boxShadow: "8px 8px 20px rgba(0,0,0,0.4)",
                      }}
                    />
                    <p className="absolute inset-0 flex items-center justify-center text-md text-gray-800 px-4 text-center">
                      Only librarians and staff can create accounts in the
                      system.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
