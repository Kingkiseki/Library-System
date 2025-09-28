import noprofile1 from "../assets/noprofile1.png";
import noprofile2 from "../assets/noprofile2.png";

const Faculty = () => {
  return (
    <div className="p-6">
      {/* Title */}
      <h2 className="text-3xl font-sans mb-2">Staffs</h2>
      <p className="text-gray-600 mb-10">Library Staff</p>

      {/* Profiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:justify-center lg:gap-32 mb-10">
        {/* Profile 1 */}
        <div className="flex flex-col items-center text-center mb-8 lg:mb-0">
          <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-teal-600 shadow-md">
            <img
              src={noprofile1}
              alt="Rennala"
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="mt-4 text-xl font-semibold">Rennala</h3>
          <p className="text-sm text-gray-500">Queen of the Full Moon</p>
        </div>

        {/* Profile 2 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-teal-600 shadow-md">
            <img
              src={noprofile2}
              alt="Radagon"
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="mt-4 text-xl font-semibold">Radagon</h3>
          <p className="text-sm text-gray-500">the Golden Order</p>
        </div>
      </div>

      {/* Mission / Description */}
      <p className="max-w-2xl mx-auto text-center text-teal-600 leading-relaxed">
        The library staff is committed to providing efficient and professional
        services that support learning and research. We aim to ensure organized
        and accessible resources, foster a welcoming environment, and promote
        lifelong learning through continuous improvement and collaboration.
      </p>
    </div>
  );
};

export default Faculty;
