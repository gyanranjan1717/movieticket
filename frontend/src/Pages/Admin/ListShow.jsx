import React, { useEffect, useState } from 'react';
import { dummyShowsData } from '../../assets/assets';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';

const ListShow = () => {
  const { axios, getToken, user } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY;
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllShows = async () => {
    try {
      // setShows([{
      //   movie: dummyShowsData[0],
      //   showDateTime: "2025-06-30T02:30:00.000Z",
      //   showPrice: 59,
      //   occupiedSeats: {
      //     A1: "user-1",
      //     B1: "user_2",
      //     C1: "user_3"
      //   }
      // }]);

      const { data } = await axios.get('/api/admin/all-shows', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      if (data.success) {
        setShows(data.shows);
      }
    } catch (err) {
      console.error("Error fetching shows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // getAllShows(); for testing with dummy data
    if (user) {
      getAllShows();
    }
  }, [user]);

  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows.map((show, index) => {
              const movieTitle = show.movie?.title || 'Untitled';
              const showTime = dateFormate(show.showDateTime);
              const totalBookings = Object.keys(show.occupiedSeats || {}).length;
              const earnings = totalBookings * (show.showPrice || 0);

              return (
                <tr
                  key={index}
                  className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
                >
                  <td className="p-2 min-w-45 pl-5">{movieTitle}</td>
                  <td className="p-2">{showTime}</td>
                  <td className="p-2">{totalBookings}</td>
                  <td className="p-2">{currency}{earnings}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListShow;
