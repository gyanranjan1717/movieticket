import React, { useState, useEffect, useContext, createContext } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3001";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem("showtime_user_city");
    return saved ? JSON.parse(saved) : { name: "Bengaluru", state: "Karnataka" };
  });

  const changeCity = (cityObj) => {
    setSelectedCity(cityObj);
    localStorage.setItem("showtime_user_city", JSON.stringify(cityObj));
    toast.success(`📍 Location updated to ${cityObj.name}, ${cityObj.state}`);
  };

  // Attach token header to Axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  // Login handler
  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setIsAuthModalOpen(false);
    toast.success(`Welcome back, ${userData.name || "User"}!`);
  };

  // Logout handler
  const logout = () => {
    setToken("");
    setUser(null);
    setIsAdmin(false);
    setFavoriteMovies([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    toast.success("Logged out successfully");
    navigate("/");
  };

  const fetchIsAdmin = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/admin/is-admin");
      setIsAdmin(data.isAdmin);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data.success) {
        setShows(data.shows);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching shows:", error);
      toast.error("Error loading shows.");
    }
  };

  const fetchFavoriteMovies = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/user/favorites");
      if (data.success) {
        setFavoriteMovies(data.movies);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/auth/me");
      if (data.success) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch (error) {
      // If token is invalid or expired
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  }, [token]);

  const getToken = async () => token || localStorage.getItem("token") || "";

  const value = {
    axios,
    token,
    getToken,
    user,
    setUser,
    login,
    logout,
    navigate,
    isAdmin,
    shows,
    favoriteMovies,
    fetchFavoriteMovies,
    fetchIsAdmin,
    isAdminLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    selectedCity,
    changeCity,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
