
import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaDiscourse, FaDownload } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { IoLogIn, IoLogOut } from "react-icons/io5";
import { RiHome2Fill } from "react-icons/ri";
import { HiMenu, HiX } from "react-icons/hi";
import { Link, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../utils/utils";
function Purchases() {
  const [purchases, setPurchase] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      navigate("/login");
    }
  }, [token, navigate]);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await axios.get(`${ BACKEND_URL }/user/purchases`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setPurchase(response.data.courseData);
      } catch (error) {
        setErrorMessage("Failed to fetch purchase data");
      }
    };
    fetchPurchases();
  }, [token]);

  const handleLogout = async () => {
    try {
      const response = await axios.get(`${ BACKEND_URL }/user/logout`, {
        withCredentials: true,
      });
      toast.success(response.data.message);
      localStorage.removeItem("user");
      navigate("/login");
      setIsLoggedIn(false);
    } catch (error) {
      toast.error(error.response?.data?.errors || "Error in logging out");
    }
  };

  
  
  const handleDownload = (pdfUrl) => {
    console.log("PDF URL:", pdfUrl); // Debugging
    if (pdfUrl) {
      window.open(pdfUrl, "_blank"); // Opens PDF in new tab
    } else {
      toast.error("PDF not available");
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-gray-100 p-5 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 z-50`}>
        <nav>
          <ul className="mt-16 md:mt-0">
            <li><Link to="/" className="flex items-center"><RiHome2Fill className="mr-2" /> Home</Link></li>
            <li><Link to="/courses" className="flex items-center"><FaDiscourse className="mr-2" /> Courses</Link></li>
            <li><a href="#" className="flex items-center text-blue-500"><FaDownload className="mr-2" /> Purchases</a></li>
          
            <li>
              {isLoggedIn ? (
                <button onClick={handleLogout} className="flex items-center"><IoLogOut className="mr-2" /> Logout</button>
              ) : (
                <Link to="/login" className="flex items-center"><IoLogIn className="mr-2" /> Login</Link>
              )}
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-8 bg-gray-50 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-0"} md:ml-64`}>
        <h2 className="text-xl font-semibold mt-6 md:mt-0 mb-6">My Purchases</h2>
        {errorMessage && <div className="text-red-500 text-center mb-4">{errorMessage}</div>}
        {purchases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col items-center space-y-4">
                  <img className="rounded-lg w-full h-48 object-cover" src={purchase.image?.url || "https://via.placeholder.com/150"
 } alt={purchase.title} />
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{purchase.title}</h3>
                    <p className="text-gray-500">{purchase.description.length > 100 ? `${purchase.description.slice(0, 100)}...` : purchase.description}</p>
                    <span className="text-green-700 font-semibold text-sm">${purchase.price} only</span>
                    <button
                      onClick={() => handleDownload(purchase.pdf.url)}
                      className="mt-4 ml-6 bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                    >
                      <FaDownload className="mr-4" /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You have no purchases yet.</p>
        )}
      </div>
    </div>
  );
}

export default Purchases;
