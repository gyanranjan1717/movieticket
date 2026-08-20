import React, { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import NavBar from './Components/NavBar';
import Footer from './Components/Footer';
import AuthModal from './Components/AuthModal';
import Home from './Pages/Home';
import Movies from './Pages/Movies';
import MovieDetails from './Pages/MovieDetails';
import SeatLayout from './Pages/SeatLayout';
import MyBooking from './Pages/MyBooking';
import Releases from './Pages/Releases';
import Theaters from './Pages/Theaters';
import Favorites from './Pages/Favroites';
import { Toaster, toast } from 'react-hot-toast';
import Layout from './Pages/Admin/Layout';
import Dashboard from './Pages/Admin/Dashboard';
import AddShow from './Pages/Admin/AddShow';
import ListShow from './Pages/Admin/ListShow';
import ListBooking from './Pages/Admin/ListBooking';
import { useAppContext } from './context/AppContext';
import Loading from './Components/Loading';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const { user, isAdmin, isAdminLoading, setIsAuthModalOpen } = useAppContext();

  // Redirect non-admins who try to access admin routes
  useEffect(() => {
    if (user && !isAdminLoading && !isAdmin && isAdminRoute) {
      toast.error('You are not authorized to access admin dashboard');
      navigate('/');
    }
  }, [user, isAdmin, isAdminLoading, isAdminRoute, navigate]);

  return (
    <>
      <Toaster position="top-center" />
      <AuthModal />
      {!isAdminRoute && <NavBar />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/Movies" element={<Movies />} />
        <Route path="/theaters" element={<Theaters />} />
        <Route path="/Theaters" element={<Theaters />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/Releases" element={<Releases />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/movies/:id/:date" element={<SeatLayout />} />
        <Route path="/mybooking" element={<MyBooking />} />
        <Route path="/MyBooking" element={<MyBooking />} />
        <Route path="/my-bookings" element={<MyBooking />} />
        <Route path="/loading/:nextUrl" element={<Loading />} />
        <Route path="/favroites" element={<Favorites />} />
        <Route path="/favorites" element={<Favorites />} />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            !user ? (
              <div className="min-h-screen flex flex-col justify-center items-center bg-gray-950 text-white gap-4">
                <p className="text-xl font-bold">Admin Authentication Required</p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 bg-primary rounded-full font-medium shadow-lg cursor-pointer"
                >
                  Log In as Admin
                </button>
              </div>
            ) : isAdminLoading ? (
              <div className="min-h-screen flex justify-center items-center bg-gray-950 text-white">
                <p>Checking admin access...</p>
              </div>
            ) : isAdmin ? (
              <Layout />
            ) : (
              <></>
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="addshow" element={<AddShow />} />
          <Route path="listshow" element={<ListShow />} />
          <Route path="listbooking" element={<ListBooking />} />
        </Route>
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
