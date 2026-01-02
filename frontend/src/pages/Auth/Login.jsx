import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ClipLoader from "react-spinners/ClipLoader";
import toast from "react-hot-toast";
import API from "../../services/apiClient";
import { supabase } from "../../lib/supabaseClient";
import { Github } from "lucide-react";
import logo from "../../assets/logo.png";
import illustration from "../../assets/business.svg";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handlers for social login
  const handleSocialLogin = async (provider) => {
    try {
      // This would ideally talk to Supabase Auth. 
      // Since we are using a custom backend, this is a simulated step or would require Backend Integration.
      // For now we trigger the Supabase flow which handles the redirect.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      toast.error(`Failed to sign in with ${provider}`);
    }
  };

  // ✅ Auto redirect if already logged in
  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    if (loggedIn) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", form);
      setLoading(false);
      setSuccess(true);

      // ✅ Save session
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("loggedIn", true);

      // ✅ Success Toast
      toast.success("Welcome back to FinSathi! 🎉");

      // ✅ Redirect after animation
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (err) {
      setLoading(false);
      const errorMsg =
        err.response?.data?.message ||
        (err.message.includes("Network")
          ? "Unable to connect to server. Please check your internet."
          : "Login failed");

      setMsg(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-card-light dark:bg-card-dark rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col lg:flex-row overflow-hidden border border-border-light dark:border-border-dark"
      >
        {/* LEFT Illustration + Text */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center items-center text-white bg-gradient-to-br from-primary-600 to-primary-800 p-10">
          <img src={logo} alt="FinSathi" className="w-36 mb-8" />
          <h1 className="text-4xl font-bold leading-snug mb-4">
            Your business. Your growth. <br />
            <span className="font-extrabold">Your FinSathi.</span>
          </h1>
          <p className="text-primary-100 text-lg mb-8">
            Smart billing, inventory & insights — made simple for small
            businesses.
          </p>
          <img
            src={illustration}
            alt="Business Illustration"
            className="w-72 drop-shadow-2xl"
          />
        </div>

        {/* RIGHT Login Form / Loading / Success */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-10">
          <div className="w-full max-w-md bg-card-light dark:bg-card-dark p-6 sm:p-10 rounded-2xl shadow-lg min-h-[450px] flex flex-col justify-center relative border border-border-light dark:border-border-dark">
            {/* 🌀 Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <ClipLoader size={80} color="#1e40af" />
                <p className="mt-6 text-primary-600 font-semibold text-lg animate-pulse">
                  Logging in securely to FinSathi...
                </p>
              </div>
            ) : success ? (
              // ✅ Success Animation
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                className="flex flex-col items-center justify-center text-center"
              >
                <img src={logo} alt="FinSathi Logo" className="w-20 mb-4" />
                <h2 className="text-2xl font-bold text-primary-600 mb-2">
                  Welcome back to FinSathi! 🎉
                </h2>
                <p className="text-gray-600 mb-4">
                  Loading your dashboard...
                </p>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"
                />
              </motion.div>
            ) : (
              // 🧾 Login Form (Default)
              <>
                <div className="flex justify-center mb-6">
                  <img src={logo} alt="FinSathi Logo" className="w-24 h-auto" />
                </div>

                <h2 className="text-3xl font-bold text-center text-text-light dark:text-text-dark mb-2">
                  Welcome back
                </h2>
                <p className="text-sm text-center text-gray-500 mb-6">
                  Login to continue managing your business
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
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-border-light dark:border-border-dark rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark"
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full border border-border-light dark:border-border-dark rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg py-3 transition"
                  >
                    Login
                  </button>
                </form>

                {msg && (
                  <p className="text-center text-sm text-red-500 mt-4">{msg}</p>
                )}

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don’t have an account?{" "}
                  <Link
                    to="/register"
                    className="text-primary-600 font-medium hover:underline"
                  >
                    Register here
                  </Link>
                </p>

                <div className="mt-6 text-center text-xs text-gray-400">
                  © {new Date().getFullYear()} FinSathi — Built with ❤️
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
