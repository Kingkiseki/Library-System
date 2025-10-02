import noprofile1 from "../assets/noprofile1.png";
import noprofile2 from "../assets/noprofile2.png";
import bglibrarian from "../assets/bglibrarian.png"; // background image

const Faculty = () => {
  return (
    <div className="w-full h-full bg-gray-100">
      {/* Background Section */}
      <div
        className="relative w-full h-72 bg-cover bg-center rounded-lg"
        style={{ backgroundImage: `url(${bglibrarian})` }}
      >
        {/* Title (top-left text) */}
        <div className="absolute top-4 left-6 text-black">
          <h2 className="text-5xl font-sans">Staffs</h2>
          <p className="text-sm">Library Staff</p>
        </div>

        {/* Small profile pics (bottom-left) */}
        <div className="absolute -bottom-8 left-6 flex space-x-4">
          {[noprofile1, noprofile2].map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`Staff ${i + 1}`}
                className="w-16 h-16 rounded-full border-4 border-white shadow-md"
              />
              {/* Online dot */}
              <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
          ))}
        </div>

        {/* Main profile + name (bottom-right) */}
        <div className="absolute -bottom-14 right-10 flex items-center">
          {/* Name box */}
          <div className="bg-teal-600 bg-opacity-90 opacity-75 px-10 py-3 min-w-[300px] rounded-l-xl shadow-lg flex items-center justify-end">
            <h3 className="text-white text-xl font-semibold">Jane Gray, RL.</h3>
          </div>

          {/* Profile picture */}
          <div className="relative -ml-6">
            <img
              src={noprofile2}
              alt="Main Librarian"
              className="w-28 h-28 rounded-full border-4 border-white shadow-md"
            />
            {/* Online status dot */}
            <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
        </div>
      </div>

      {/* Vision & Mission Section */}
      <div className="px-10 py-16 space-y-10">
        {/* Vision */}
        <div className="bg-teal-700 text-white rounded-md shadow-md p-6 relative">
          <div className="absolute -top-4 left-6 bg-orange-500 px-4 py-1 text-sm font-bold rounded">
            VISION
          </div>
          <p>
            To be a modern and inclusive library that serves as a gateway to
            knowledge, connecting people with resources, technology, and
            opportunities for lifelong learning. We envision a space where
            traditional and digital tools come together to inspire curiosity,
            support education, and foster a culture of reading and discovery.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-teal-700 text-white rounded-md shadow-md p-6 relative">
          <div className="absolute -top-4 left-6 bg-orange-500 px-4 py-1 text-sm font-bold rounded">
            MISSION
          </div>
          <p>
            Our mission is to provide accessible and diverse collections that
            support education, research, and lifelong learning. We are dedicated
            to embracing both traditional and digital systems such as catalogs
            and QR codes to make knowledge more reachable. By creating an
            engaging environment that values curiosity, collaboration, and
            discovery, we strive to empower individuals to grow, innovate, and
            contribute positively to society.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Faculty;
