import React, { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import NavBar from './Components/NavBar';
import Footer from './Components/Footer';
import Home from './Pages/Home';
import Movies from './Pages/Movies';
import MovieDetails from './Pages/MovieDetails';
import SeatLayout from './Pages/SeatLayout';
import MyBooking from './Pages/MyBooking';
import Favorites from './Pages/Favroites';
import { Toaster, toast } from 'react-hot-toast';
import { SignIn } from '@clerk/clerk-react';
import Layout from './Pages/Admin/Layout';
import Dashboard from './Pages/Admin/Dashboard';
import AddShow from './Pages/Admin/AddShow';
import ListShow from './Pages/Admin/ListShow';
import ListBooking from './Pages/Admin/ListBooking';
import { useAppContext } from './context/AppContext';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');

 const { user, isAdmin, isAdminLoading } = useAppContext();
  // 🔒 Redirect non-admins who try to access admin routes
  useEffect(() => {
    if (user && !isAdminLoading &&  !isAdmin && isAdminRoute) {
      toast.error('You are not authorized to access admin dashboard');
      navigate('/');
    }
  }, [user, isAdmin,isAdminLoading, isAdminRoute]);

  return (
    <>
      <Toaster position="top-center" />
      {!isAdminRoute && <NavBar />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/movies/:id/:date" element={<SeatLayout />} />
        <Route path="/mybooking" element={<MyBooking />} />
        <Route path="/favroites" element={<Favorites />} />

        {/* Admin routes */}
        <Route
          path="/admin/*"
  element={
    !user ? (
      <div className="min-h-screen flex justify-center items-center">
        <SignIn redirectUrl="/admin" />
      </div>
    ) : isAdminLoading ? (
      <div className="min-h-screen flex justify-center items-center">
        <p>Checking admin access...</p>
      </div>
    ) : isAdmin ? (
      <Layout />
    ) : (
      <></> // Will be redirected by useEffect
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
