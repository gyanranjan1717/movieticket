import { ChartLineIcon, CircleDollarSignIcon, PlayCircleIcon, StarIcon, UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
// import { dummyDashboardData } from '../../assets/assets';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import BlurCircle from '../../Components/BlurCircle';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { axios, getToken, user } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY;

  const [DashboardData, setDashboardData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    activeShows: [],
    totalUser: 0,
  });

  const [loading, setLoading] = useState(true);

  const dashboardCards = [
    {
      title: 'Total Bookings',
      value: DashboardData.totalBookings || '0',
      icon: ChartLineIcon,
    },
    {
      title: 'Total Revenue',
      value: currency + DashboardData.totalRevenue || '0',
      icon: CircleDollarSignIcon,
    },
    {
      title: 'Active Shows',
      value: DashboardData.activeShows.length || '0',
      icon: PlayCircleIcon,
    },
    {
      title: 'Total User',
      value: DashboardData.totalUser || '0',
      icon: UserIcon,
    },
  ];

  const fetchDashboardData = async () => {
    // setDashboardData(dummyDashboardData);
    // setLoading(false);
    try {
      const { data } = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setDashboardData(data.dashboardData); // fixed key from DashboardData to dashboardData
        setLoading(false);
      } else {
        toast.error(data.message || 'Failed to fetch dashboard data');
        setLoading(false); // ensure loading stops
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
      setLoading(false); // ensure loading stops
    }
  };

  useEffect(() => {
    // Fetch the dashboard data when the component mounts
    // fetchDashboardData(); with dummydata
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return !loading ? (
    <>
      <Title text1="Admin" text2="Dashboard" />

      <div className="relative flex flex-wrap gap-4 mt-6">
        <BlurCircle top="-100px" left="0px" />
        <div className="flex flex-wrap gap-4 w-full">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 
              bg-primary/10 border border-primary/20 rounded-md max-w-50 w-full"
              >
                <div>
                  <h1 className="text-sm">{card.title}</h1>
                  <p className="text-xl font-medium mt-1">{card.value}</p>
                </div>
                <Icon className="w-6 h-6" />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-10 text-lg font-medium"> Active Shows</p>

      <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
        <BlurCircle top="100px" left="-10%" />

        {DashboardData.activeShows.map((show) => {
          const movie = show.movie || {}; // fallback if movie is missing

          return (
            <div
              key={show._id}
              className="w-55 rounded-lg overflow-hidden
              h-full pb-3 bg-primary/10 border border-primary/20 
              hover:-translate-y-1 transition duration-300"
            >
              <img
                src={
                  //image_base_url + show.
                  movie.poster || '/collection.jpg'
                }
                alt={movie.title || 'Movie Poster'}
                className="h-60 w-full object-cover"
                onError={(e) => (e.target.src = '/collection.jpg')}
              />

              <p className="font-medium p-2 truncate">
                {
                  //show.
                  movie.title || 'untitled'
                }
              </p>

              <div className="flex items-center justify-between px-2">
                <p className="text-lg font-medium">
                  {currency} {show.showPrice}
                </p>
                <p
                  className="flex items-center gap-1 text-sm
                    text-gray-400 mt-1 pr-1"
                >
                  <StarIcon className="w-4 h-4 text-primary fill-primary" />
                  {typeof movie.vote_average === 'number'
                    ? movie.vote_average.toFixed(1)
                    : 'N/A'}
                </p>
              </div>

              <p className="px-2 pt-2 text-sm text-gray-500">
                {dateFormate(show.showDateTime)}
              </p>
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default Dashboard;
