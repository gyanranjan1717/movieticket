import React, { useEffect, useState } from 'react';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';

const ListBooking = () => {
  const { axios, getToken, user } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [booking, setBooking] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAllBooking = async () => {
    // setBooking(dummyBookingData)
    // setIsLoading(false);
    try {
      const { data } = await axios.get('/api/admin/all-bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setBooking(data.bookings);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // getAllBooking();
    if (user) {
      getAllBooking();
    }
  }, [user]);

  return !isLoading ? (
    <>
      <Title text1="List" text2="Booking" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">User Name</th>
              <th className="p-2 font-medium">Movie</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Seats</th>
              <th className="p-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {booking.map((item, index) => {
              const userName = item.user?.name || "N/A";
              const movieTitle = item.show?.movie?.title || "Untitled";
              const showDateTime = item.show?.showDateTime
                ? dateFormate(item.show.showDateTime)
                : "N/A";
              const seatList = item.bookedSeats?.join(', ') || "N/A";

              const amount = item.amount || 0;

              return (
                <tr
                  key={index}
                  className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
                >
                  <td className="p-2 min-w-45 pl-5">{userName}</td>
                  <td className="p-2">{movieTitle}</td>
                  <td className="p-2">{showDateTime}</td>
                  <td className="p-2">{seatList}</td>
                  <td className="p-2">
                    {currency} {amount}
                  </td>
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

export default ListBooking;
