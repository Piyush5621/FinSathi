import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import { supabase } from "../../lib/supabaseClient"; // Ensure this matches path
import { Github } from "lucide-react";
import logo from "../../assets/logo.png";
import illustration from "../../assets/business.svg";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessType: "",
    city: "",
    state: "",
    phone: "",
    termsAccepted: false,
  });

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handlers for social login
  const handleSocialLogin = async (provider) => {
    try {
      // Trigger Supabase Auth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      toast.error(`Failed to sign up with ${provider}`);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.termsAccepted) {
      toast.error("You must accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await API.post("/auth/register", form);
      if (res.status === 201) {
        // ✅ Auto-login after register
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("loggedIn", true);

        setLoading(false);
        setSuccess(true);
        toast.success("Account created successfully 🎉");
        setTimeout(() => navigate("/dashboard"), 3500);
      }
    } catch (err) {
      setLoading(false);
      const errorMsg =
        err.response?.data?.message ||
        (err.message.includes("Network")
          ? "Unable to connect to server. Please check your internet."
          : "Something went wrong. Please try again.");
      setMsg(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-6">
      {/* LEFT SECTION */}
      <motion.section
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center text-white p-12"
      >
        <div className="max-w-lg">
          <img src={logo} alt="FinSathi" className="w-36 mb-6" />
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Grow your business <br /> with{" "}
            <span className="text-white font-black">FinSathi.</span>
          </h1>
          <p className="text-primary-100 text-lg mb-10">
            Simplify billing, track inventory, and manage your accounts — all
            in one place.
          </p>
          <img
            src={illustration}
            alt="Business illustration"
            className="w-80 mx-auto drop-shadow-xl"
          />
        </div>
      </motion.section>

      {/* RIGHT SECTION */}
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9 }}
        className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-10 bg-card-light dark:bg-card-dark rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none border border-border-light dark:border-border-dark"
      >
        <div className="w-full max-w-md">
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-lg p-8 sm:p-10 relative min-h-[500px] flex flex-col justify-center border border-border-light dark:border-border-dark">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <ClipLoader size={80} color="#1e40af" />
                <p className="mt-6 text-primary-600 font-semibold text-lg animate-pulse">
                  Registering your business on FinSathi...
                </p>
              </div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center justify-center text-center"
              >
                <img src={logo} alt="FinSathi" className="w-20 mb-4" />
                <h2 className="text-2xl font-bold text-primary-600 mb-2">
                  Registration Successful 🎉
                </h2>
                <p className="text-gray-600 mb-4">
                  Welcome aboard! Redirecting you to the dashboard...
                </p>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"
                />
              </motion.div>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <img src={logo} alt="FinSathi Logo" className="w-20 h-auto" />
                </div>
                <h2 className="text-3xl font-bold text-center text-text-light dark:text-text-dark mb-2">
                  Create Account
                </h2>
                <p className="text-sm text-center text-gray-500 mb-6">
                  Start your journey with FinSathi today.
                </p>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                  <button
                    onClick={() => handleSocialLogin('github')}
                    className="flex items-center justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-gray-200"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    Github
                  </button>
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card-light dark:bg-card-dark text-gray-500">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="name"
                      placeholder="Full Name"
                      value={form.name}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                    <input
                      name="phone"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />

                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />

                  <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
                    <p className="text-xs text-gray-500 mb-3 uppercase font-semibold">Business Details</p>
                    <input
                      name="businessName"
                      placeholder="Business Name"
                      value={form.businessName}
                      onChange={handleChange}
                      className="input-field mb-4"
                      required
                    />

                    <div className="mb-4">
                      <select
                        name="businessType"
                        value={form.businessType}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="">Select Business Type</option>
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="service">Service</option>
                        <option value="manufacturing">Manufacturing</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input
                        name="city"
                        placeholder="City"
                        value={form.city}
                        onChange={handleChange}
                        className="input-field"
                      />
                      <input
                        name="state"
                        placeholder="State"
                        value={form.state}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>

                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={form.termsAccepted}
                      onChange={handleChange}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      I accept the{" "}
                      <Link to="/terms" className="text-primary-600 hover:underline">
                        Terms & Conditions
                      </Link>
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-3"
                  >
                    Register Business
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-primary-600 font-medium hover:underline"
                  >
                    Login here
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} FinSathi — Built with ❤️
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Register;
