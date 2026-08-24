import React, { useState } from "react";
import {
  X,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Lock,
  User,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, axios, login, fetchIsAdmin } = useAppContext();

  // Active Tab: "login" | "signup" | "admin"
  const [activeTab, setActiveTab] = useState("login");
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1: Enter Email, 2: Enter OTP

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setOtp("");
    setAdminKey("");
    setShowAdminKey(false);
    setOtpStep(1);
    setUseOtpLogin(false);
    setActiveTab("login");
    setIsAuthModalOpen(false);
  };

  // 1. Password-based Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/login-password", {
        email: email.trim().toLowerCase(),
        password,
      });

      if (data.success) {
        login(data.token, data.user);
        toast.success(data.message || "Welcome back to ShowTime!");
        resetForm();
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // 2. Password-based Sign Up (Registration)
  const handlePasswordSignUp = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register-password", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (data.success) {
        login(data.token, data.user);
        toast.success(data.message || "Account created successfully!");
        resetForm();
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // 3. Admin Direct Login with Master Key
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid admin email");
      return;
    }
    if (!adminKey.trim()) {
      toast.error("Master Admin Secret Key is required");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/admin-login", {
        email: email.trim().toLowerCase(),
        adminKey: adminKey.trim(),
        name: name.trim() || undefined,
        password: password || undefined,
      });

      if (data.success) {
        login(data.token, data.user);
        await fetchIsAdmin();
        toast.success("Admin Portal access granted! 🛡️");
        resetForm();
      } else {
        toast.error(data.message || "Admin login failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid Admin credentials");
    } finally {
      setLoading(false);
    }
  };

  // 4. OTP-based Flow (Fallback)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === "admin" ? "/api/auth/send-admin-otp" : "/api/auth/send-otp";
      const payload = activeTab === "admin" ? { email: email.trim().toLowerCase(), adminKey: adminKey.trim(), name } : { email: email.trim().toLowerCase() };

      const { data } = await axios.post(endpoint, payload);
      if (data.success) {
        toast.success(data.message);
        setOtpStep(2);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === "admin" ? "/api/auth/verify-admin-otp" : "/api/auth/verify-otp";
      const payload =
        activeTab === "admin"
          ? { email: email.trim().toLowerCase(), otp, adminKey: adminKey.trim(), name }
          : { email: email.trim().toLowerCase(), otp, name };

      const { data } = await axios.post(endpoint, payload);
      if (data.success) {
        login(data.token, data.user);
        if (activeTab === "admin") {
          await fetchIsAdmin();
          toast.success("Admin role activated!");
        } else {
          toast.success("Login successful!");
        }
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await axios.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });
      if (data.success) {
        login(data.token, data.user);
        toast.success("Google Sign-In successful!");
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Google Authentication failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gray-900/95 border border-gray-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Navigation Tabs: Sign In | Sign Up | Admin Portal */}
        <div className="flex bg-gray-950/80 p-1.5 rounded-2xl mb-6 border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setUseOtpLogin(false);
              setOtpStep(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === "login"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setUseOtpLogin(false);
              setOtpStep(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === "signup"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setUseOtpLogin(false);
              setOtpStep(1);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === "admin"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-800/80 border border-gray-700/60 mb-3 shadow-inner">
            {activeTab === "admin" ? (
              <ShieldCheck className="w-6 h-6 text-amber-500" />
            ) : (
              <Sparkles className="w-6 h-6 text-primary" />
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            {activeTab === "login"
              ? "Welcome Back to ShowTime"
              : activeTab === "signup"
              ? "Create Your ShowTime Account"
              : "Administrator Portal"}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === "login"
              ? "Sign in with your email and password or Google"
              : activeTab === "signup"
              ? "Join ShowTime for instant movie bookings & VIP perks"
              : "Enter admin credentials & master secret key"}
          </p>
        </div>

        {/* ================= USER SIGN IN (LOGIN) ================= */}
        {activeTab === "login" && !useOtpLogin && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/30 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setUseOtpLogin(true)}
                className="text-gray-400 hover:text-primary transition underline cursor-pointer"
              >
                Sign in with OTP code instead
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Create new account
              </button>
            </div>

            {/* Google OAuth Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-800 w-full" />
              <span className="bg-gray-900 px-3 text-[11px] text-gray-500 uppercase tracking-widest">
                OR
              </span>
              <div className="border-t border-gray-800 w-full" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google Login Failed")}
                theme="filled_black"
                shape="pill"
                text="signin_with"
                width="100%"
              />
            </div>
          </form>
        )}

        {/* ================= USER SIGN UP (REGISTER) ================= */}
        {activeTab === "signup" && (
          <form onSubmit={handlePasswordSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Gyan Ranjan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/30 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs pt-1">
              <span className="text-gray-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Sign in here
              </button>
            </div>

            {/* Google OAuth Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-800 w-full" />
              <span className="bg-gray-900 px-3 text-[11px] text-gray-500 uppercase tracking-widest">
                OR
              </span>
              <div className="border-t border-gray-800 w-full" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google Login Failed")}
                theme="filled_black"
                shape="pill"
                text="signup_with"
                width="100%"
              />
            </div>
          </form>
        )}

        {/* ================= ADMIN PORTAL ================= */}
        {activeTab === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@showtime.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-400 mb-1.5">
                Master Admin Secret Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <input
                  type={showAdminKey ? "text" : "password"}
                  required
                  placeholder="Enter your confidential Admin Secret Key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="w-full bg-gray-950 border border-amber-500/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition"
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Admin Name / Password (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? "Authenticating Admin..." : "Access Admin Control Center"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ================= OPTIONAL OTP LOGIN ================= */}
        {useOtpLogin && activeTab === "login" && (
          <div>
            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Enter Email for OTP
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? "Sending Code..." : "Send Verification Code"}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setUseOtpLogin(false)}
                    className="text-xs text-gray-400 hover:text-primary transition underline cursor-pointer"
                  >
                    ← Back to Password Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 text-center">
                    Enter 6-Digit Code sent to <span className="text-white font-semibold">{email}</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-gray-950 border border-primary rounded-xl py-3 text-center text-2xl font-mono tracking-widest text-white focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpStep(1)}
                    className="text-xs text-gray-400 hover:text-primary transition underline cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthModal;
