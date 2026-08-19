import { ChartLineIcon, CircleDollarSignIcon, PlayCircleIcon, StarIcon, UserIcon, Download, Zap, RefreshCw, Layers } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import BlurCircle from '../../Components/BlurCircle';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { axios, token } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY || '$';

  const [DashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    avgTicketPrice: 0,
    activeShows: [],
    totalUser: 0,
    redisStatus: "Checking...",
  });

  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const activeToken = token || localStorage.getItem('token');
      if (!activeToken) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (data.success) {
        setDashboardData(data.dashboardData);
      } else {
        toast.error(data.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Handle Bookings CSV Export for Data Analysis
  const handleExportBookingsCSV = async () => {
    try {
      const activeToken = token || localStorage.getItem('token');
      const response = await axios.get('/api/admin/export-bookings', {
        headers: { Authorization: `Bearer ${activeToken}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `showtime_bookings_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('📊 Bookings CSV report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export Bookings CSV');
    }
  };

  // Handle Users CSV Export
  const handleExportUsersCSV = async () => {
    try {
      const activeToken = token || localStorage.getItem('token');
      const response = await axios.get('/api/admin/export-users', {
        headers: { Authorization: `Bearer ${activeToken}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `showtime_users_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('👥 Users CSV report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export Users CSV');
    }
  };

  // One-Click Redis Cache Flush
  const handleFlushRedisCache = async () => {
    try {
      setFlushing(true);
      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.post('/api/admin/flush-cache', {}, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        toast.success('⚡ Redis Cache Flushed! API & recommendation caches reset.');
        fetchDashboardData();
      }
    } catch (error) {
      toast.error('Failed to flush Redis cache');
    } finally {
      setFlushing(false);
    }
  };

  const dashboardCards = [
    {
      title: 'Total Bookings',
      value: DashboardData.totalBookings || '0',
      icon: ChartLineIcon,
      accent: 'border-blue-500/30 text-blue-400 bg-blue-950/20',
    },
    {
      title: 'Total Revenue',
      value: currency + (DashboardData.totalRevenue || 0).toLocaleString(),
      icon: CircleDollarSignIcon,
      accent: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    },
    {
      title: 'Active Shows',
      value: DashboardData.activeShows.length || '0',
      icon: PlayCircleIcon,
      accent: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
    },
    {
      title: 'Total Registered Users',
      value: DashboardData.totalUser || '0',
      icon: UserIcon,
      accent: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
    },
  ];

  return !loading ? (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Title text1="Admin" text2="Management Dashboard" />

        {/* System Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          <span>Redis Engine: {DashboardData.redisStatus}</span>
        </div>
      </div>

      {/* Admin Action Bar: CSV Data Export & System Cache Control */}
      <div className="p-5 rounded-2xl bg-gray-900/90 border border-gray-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Data Analytics & System Control Suite
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Export system datasets for Excel/Pandas analysis or manage live Redis memory caches.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportBookingsCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4" /> Export Bookings (CSV)
          </button>

          <button
            onClick={handleExportUsersCSV}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <UserIcon className="w-4 h-4" /> Export Users (CSV)
          </button>

          <button
            onClick={handleFlushRedisCache}
            disabled={flushing}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${flushing ? 'animate-spin' : ''}`} /> Flush Redis Cache
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <BlurCircle top="-50px" left="0px" />
        {dashboardCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`p-5 rounded-2xl border ${card.accent} flex items-center justify-between shadow-xl backdrop-blur-md hover:-translate-y-1 transition duration-300`}
            >
              <div>
                <p className="text-xs font-medium text-gray-400">{card.title}</p>
                <h2 className="text-2xl font-extrabold text-white mt-1">{card.value}</h2>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/80 border border-white/10">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Shows Grid */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> Active Screenings ({DashboardData.activeShows.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {DashboardData.activeShows.map((show) => {
            const movie = show.movie || {};

            return (
              <div
                key={show._id}
                className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition duration-300 shadow-xl flex flex-col justify-between"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-950">
                  <img
                    src={movie.poster || '/collection.jpg'}
                    alt={movie.title || 'Movie Poster'}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.src = '/collection.jpg')}
                  />
                  <div className="absolute top-2 right-2 bg-black/70 border border-white/10 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 text-amber-400">
                    <StarIcon className="w-3.5 h-3.5 fill-amber-400" />
                    {typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '8.5'}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-white text-base truncate">{movie.title || 'Untitled'}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/80">
                    <span className="text-emerald-400 font-extrabold text-sm">{currency}{show.showPrice}</span>
                    <span className="text-xs text-gray-400 font-medium">{dateFormate(show.showDateTime)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Dashboard;
