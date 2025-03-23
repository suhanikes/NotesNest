
import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { BACKEND_URL } from "../utils/utils";
function Buy() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [course, setCourse] = useState({});
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;  

  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!token) {
      console.log("No token found, redirecting to login...");
      navigate("/login");
      return;
    }

    const fetchBuyCourseData = async () => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${ BACKEND_URL }/course/buy/${courseId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        console.log("Course Data:", response.data);
        setCourse(response.data.course);
        setClientSecret(response.data.clientSecret);
      } catch (error) {
        console.log("Error Fetching Course:", error);
        if (error?.response?.status === 400) {
          setError("You have already purchased this course.");
          setTimeout(() => navigate("/purchases"), 3000);
        } else {
          setError(error?.response?.data?.errors || "Something went wrong.");
        }
      }
      setLoading(false);
    };
    fetchBuyCourseData();
  }, [courseId, token, navigate]);

  const handlePurchase = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const card = elements.getElement(CardElement);
    if (!card) {
      setLoading(false);
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });

    if (error) {
      setCardError(error.message);
      setLoading(false);
      return;
    }

    if (!clientSecret) {
      setCardError("No client secret found.");
      setLoading(false);
      return;
    }

    const { paymentIntent, error: confirmError } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: user?.user?.firstName,
            email: user?.user?.email,
          },
        },
      });

    if (confirmError) {
      setCardError(confirmError.message);
    } else if (paymentIntent.status === "succeeded") {
      const paymentInfo = {
        email: user?.user?.email,
        userId: user?.user?._id,
        courseId: courseId,
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      };

      try {
        await axios.post(`${ BACKEND_URL }/order`, paymentInfo, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        toast.success("Payment Successful");
        navigate("/purchases");
      } catch (error) {
        toast.error("Error in making payment");
      }
    }
    setLoading(false);
  };

  return (
    <>
      {error ? (
        <div className="flex justify-center items-center h-screen">
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg">
            <p className="text-lg font-semibold">{error}</p>
            <Link
              className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition duration-200 mt-3 flex items-center justify-center"
              to={"/purchases"}
            >
              Purchases
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row my-40 container mx-auto">
          <div className="w-full md:w-1/2">
            <h1 className="text-xl font-semibold underline">Order Details</h1>
            <div className="flex items-center text-center space-x-2 mt-4">
              <h2 className="text-gray-600 text-sm">Total Price</h2>
              <p className="text-red-500 font-bold">
                {course?.price ? `₹${course.price}` : "Price not available"}
              </p>
            </div>
            <div className="flex items-center text-center space-x-2">
              <h1 className="text-gray-600 text-sm">Course name</h1>
              <p className="text-red-500 font-bold">
                {course?.title || "Course title not available"}
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center items-center">
            <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4">
                Process your Payment!
              </h2>
              <form onSubmit={handlePurchase}>
                <CardElement
                  options={{
                    style: {
                      base: { fontSize: "16px", color: "#424770" },
                      invalid: { color: "#9e2146" },
                    },
                  }}
                />
                <button
                  type="submit"
                  disabled={!stripe || loading}
                  className="mt-8 w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 transition duration-200"
                >
                  {loading ? "Processing..." : "Pay"}
                </button>
              </form>
              {cardError && (
                <p className="text-red-500 font-semibold text-xs">{cardError}</p>
              )}
              <button className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition duration-200 mt-3 flex items-center justify-center">
                <span className="mr-2">🅿️</span> Other Payment Methods
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Buy;

