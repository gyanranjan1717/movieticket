import React, { useEffect } from 'react';
import AdminNavBar from '../../Components/Admin/AdminNavBar';
import AdminSideBar from '../../Components/Admin/AdminSideBar';
import { Outlet, Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Loading from '../../Components/Loading';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

const Layout = () => {
  const { isAdmin, fetchIsAdmin, isAdminLoading, setIsAuthModalOpen, token } = useAppContext();

  useEffect(() => {
    fetchIsAdmin();
  }, [token]);

  if (isAdminLoading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-gray-400 text-sm mb-6">
            You need administrator privileges to access the ShowTime management portal. Please log in or register with your Admin Secret Key.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign in as Admin
            </button>
            <Link
              to="/"
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminNavBar />
      <div className="flex">
        <AdminSideBar />
        <div className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default Layout;