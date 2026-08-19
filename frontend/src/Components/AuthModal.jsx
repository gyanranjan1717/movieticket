import React, { useState } from "react";
import { X, Mail, KeyRound, ArrowRight, ShieldCheck, Lock, User, ShieldAlert } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, axios, login, fetchIsAdmin } = useAppContext();
  const [authMode, setAuthMode] = useState("user"); // "user" | "admin"
  const [step, setStep] = useState(1); // Step 1: Email & Keys, Step 2: OTP
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (authMode === "admin" && !adminKey.trim()) {
      toast.error("Admin Secret Key is required");
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === "admin" ? "/api/auth/send-admin-otp" : "/api/auth/send-otp";
      const payload = authMode === "admin" ? { email, adminKey: adminKey.trim(), name } : { email };

      const { data } = await axios.post(endpoint, payload);
      if (data.success) {
        toast.success(data.message);
        setStep(2);
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
      const endpoint = authMode === "admin" ? "/api/auth/verify-admin-otp" : "/api/auth/verify-otp";
      const payload =
        authMode === "admin"
          ? { email, otp, adminKey: adminKey.trim(), name }
          : { email, otp, name };

      const { data } = await axios.post(endpoint, payload);
      if (data.success) {
        login(data.token, data.user);
        if (authMode === "admin") {
          await fetchIsAdmin();
          toast.success("Admin role activated!");
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await axios.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });
      if (data.success) {
        login(data.token, data.user);
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Google Authentication failed");
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail("");
    setOtp("");
    setName("");
    setAdminKey("");
    setAuthMode("user");
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Auth Mode Switcher */}
        <div className="flex bg-gray-800/80 p-1 rounded-xl mb-6 border border-gray-700/50">
          <button
            type="button"
            onClick={() => {
              setAuthMode("user");
              setStep(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              authMode === "user"
                ? "bg-primary text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            User Login
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("admin");
              setStep(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              authMode === "admin"
                ? "bg-amber-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin Portal
          </button>
        </div>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              authMode === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">
            {authMode === "admin" ? "Admin Access & Registration" : "Welcome to ShowTime"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {step === 1
              ? authMode === "admin"
                ? "Enter email & secret Admin Key for authorized access"
                : "Sign in or register with Email or Google"
              : `Enter the 6-digit verification code sent to ${email}`}
          </p>
        </div>

        {/* Step 1: Input Form */}
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder={authMode === "admin" ? "admin@showtime.com" : "user@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
                />
              </div>
            </div>

            {authMode === "admin" && (
              <div>
                <label className="block text-xs font-medium text-amber-300 mb-1">
                  Master Admin Secret Key
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-amber-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter Admin API / Secret Key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full bg-gray-800/80 border border-amber-600/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Your Name {authMode === "user" && "(Optional)"}
              </label>
              <input
                type="text"
                required={authMode === "admin"}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                authMode === "admin"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              {loading ? "Verifying & Sending Code..." : `Continue with ${authMode === "admin" ? "Admin Key" : "Email"}`}
              <ArrowRight className="w-4 h-4" />
            </button>

            {authMode === "user" && (
              <>
                {/* Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-gray-800 w-full" />
                  <span className="bg-gray-900 px-3 text-xs text-gray-500 uppercase">Or</span>
                  <div className="border-t border-gray-800 w-full" />
                </div>

                {/* Google Sign In */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google Sign-In Failed")}
                    theme="filled_black"
                    shape="pill"
                  />
                </div>
              </>
            )}
          </form>
        ) : (
          /* Step 2: OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                6-Digit {authMode === "admin" ? "Admin Security" : "Verification"} Code
              </label>
              <div className="relative">
                <KeyRound
                  className={`absolute left-3 top-3 w-5 h-5 ${
                    authMode === "admin" ? "text-amber-500" : "text-gray-500"
                  }`}
                />
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`w-full bg-gray-800/80 border rounded-xl pl-10 pr-4 py-2.5 text-white text-center tracking-widest text-lg font-mono placeholder-gray-500 focus:outline-none transition ${
                    authMode === "admin"
                      ? "border-amber-600/60 focus:border-amber-500"
                      : "border-gray-700 focus:border-primary"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-xl transition cursor-pointer disabled:opacity-50 ${
                authMode === "admin"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              {loading ? "Verifying..." : `Verify & ${authMode === "admin" ? "Activate Admin" : "Sign In"}`}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 hover:text-primary underline cursor-pointer"
              >
                Change Email / Resend Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
