import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import logo from "../assets/logo2.png";
import { FiEye, FiEyeOff } from "react-icons/fi";
import accountbg from "../assets/accountbg.png";

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/auth/signup", { fullName, role, email, password });
      setSuccess("Account created successfully!");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${accountbg})` }}
      />
      <div className="absolute top-0 left-0 h-full bg-teal-700/90" />

      {/* Logo in top-right */}
      <div className="absolute top-4 right-6 z-20">
        <img src={logo} alt="Logo" className="w-25" />
      </div>

      {/* Left Section (Tagline) */}
      <div className="relative z-10 w-full flex flex-col justify-center items-center text-white p-10" >
        {/* Title Group */}
        <div className="flex flex-col items-start text-left">
          <h1 className="text-xl font-bold mb-1 tracking-wide ml-1">
            NORTHLINK TECHNOLOGICAL COLLEGE
          </h1>
          <h2 className="text-8xl font-sans pr-20">LIBRARY SYSTEM</h2>
        </div>

        {/* Centered tagline */}
        <p className="text-lg text-justify max-w-md mt-2">
          Scan with ease, read <br />  with purpose— bridging digital <br />  and physical.
        </p>
      </div>

      {/* Right Section */}
      <div className="relative z-10 w-1/2 flex items-center justify-center bg-white">
        <div className="w-[350px]">
          <h2 className="text-2xl font-bold mb-6 text-teal-700">Sign Up</h2>

          {/* Error / Success messages */}
          {error && <p className="text-red-500 mb-2">{error}</p>}
          {success && <p className="text-green-500 mb-2">{success}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name */}
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First/Middle/Last/Suffix"
              className="rounded-lg px-3 py-2 outline-none w-full bg-teal-600 text-white placeholder-gray-200"
              required
            />

            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="rounded-lg px-3 py-2 outline-none w-full bg-teal-600 text-white placeholder-gray-200"
              required
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-lg px-3 py-2 outline-none w-full bg-teal-600 text-white pr-10 placeholder-gray-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-white"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Role */}
            <fieldset className="border-4 border-teal-500 rounded-lg px-3 py-2">
              <legend className="text-md text-teal-600">Role</legend>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="librarian"
                    checked={role === "librarian"}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                  <span className="text-teal-700">Librarian</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span className="text-teal-700">
                    Student Assistant (Staff)
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Submit */}
            <button
              type="submit"
              className="bg-teal-700 text-white py-2 rounded-lg hover:bg-teal-600 transition mt-4"
            >
              Create
            </button>

            {/* Back to login */}
            <p className="text-sm text-gray-500 text-right mt-2">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hover:underline text-teal-500"
              >
                Login
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
