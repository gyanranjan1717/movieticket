// import React, { useEffect, useState } from 'react'
// import { dummyBookingData } from '../assets/assets'
// import Loading from '../Components/Loading'
// import BlurCircle from '../Components/BlurCircle'
// import timeformate from '../Lib/TimeFormate'
// import { dateFormate } from '../Lib/dateFormate'
// // import { useAppContext } from '../context/AppContext'

// const MyBooking = () => {
//   const currency = import.meta.env.VITE_CURRENCY
 

//   // const {axios,getToken , user,image_base_url}  =  useAppContext()
  
//   const [booking,setBookings] = useState([])
//   const [isLoading,setIsLoading] = useState(true)
//   const getMybooking = async ()=>{
//     setBookings(dummyBookingData)
//     setIsLoading(false)
   

//     // try{
//     //     const {data} = await axios.get('/api/bookings',{ 
//     //     headers:{Authorization:`Bearer ${ await getToken()}` }})
//     //     if(data.success){
//     //       setBookings(data.bookings)
         
//     //     }
//     // }catch(error){
//     //   console.error("Error fetching bookings:", error)
//     // }
//     //  setIsLoading(false)
//   }
// useEffect(()=>{
//       // if(!user) {
//         getMybooking()
//       // }
//     },[
//       // user

//     ])


//   return !isLoading ? (
//     <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
//       <BlurCircle top='100px' left='100px'/>
//       <div>
//         <BlurCircle bottom='0px' left='600px' />

//       </div>
//       <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>
//       {booking.map((item,index)=>(
//         <div key={index} className='flex flex-col md:flex-row justify-between
//         bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'>
//           <div className='flex flex-col md:flex-row'>
//             <img src ={ //image_base_url + 
//             item.show.movie.poster_path} alt="" 
//             className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded'/>
        


//             <div className='flex flex-col p-4'>
//               <p className='text-lg font-semibold'>{item.show.movie.title}</p>
//               <p className='text-gray-400 text-sm'>{timeformate(item.show.movie.runtime)}</p>
//               <p className='text-gray-400 text-sm mt-auto'>{dateFormate(item.show.showDateTime)}</p>

//             </div>
//           </div>
//           <div className='flex flex-col md:items-end md:text-right justify-between p-4'>
//               <div className='flex items-center gap-4'>
//                   <p className='text-2xl font-semibold mb-3'
//                   >{currency}{item.amount}</p>
//                   {!item.isPaid && <button className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'
//                   >Pay Now</button>}
//               </div>
//               <div className='text-sm'>
//                     <p>
//                       <span className='text-gray-400'
//                       >Total Tickets:</span>
//                       {item.bookedSeats.length}
//                     </p>
//                     <p>
//                       <span className='text-gray-400'
//                       >Seat Number:</span>
//                       {item.bookedSeats.join(", ")}
//                     </p>
//               </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   ):<Loading/>
// }

// export default MyBooking
import React, { useEffect, useState } from 'react';
import Loading from '../Components/Loading';
import BlurCircle from '../Components/BlurCircle';
import timeformate from '../Lib/TimeFormate';
import { dateFormate } from '../Lib/dateFormate';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const MyBooking = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const { axios, getToken, user, navigate } = useAppContext();

  const [booking, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMybooking = async () => {
    try {
      const token = await getToken();
      console.log("🔐 Retrieved token:", token);

      if (!token) {
        console.error("❌ No token found. User might not be logged in.");
        setIsLoading(false);
        toast.error("You are not logged in");
        navigate("/sign-in");
        return;
      }

      const { data } = await axios.get('/api/user/bookings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📦 Booking API response:", data);

      if (data.success) {
        setBookings(data.bookings);
      } else {
        console.warn("⚠️ API success false:", data.message);
        toast.error(data.message || "Could not load bookings");
      }
    } catch (error) {
      console.error("🔥 Error in getMybooking:", error.response?.data || error.message);
      toast.error("Failed to fetch bookings");
      if (error.response?.status === 401) {
        navigate("/sign-in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (user) {
    console.log("👤 User in MyBooking:", user);
    getMybooking();
  }
}, [user]);


  return !isLoading ? (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top='100px' left='100px' />
      <BlurCircle bottom='0px' left='600px' />
      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {booking.length > 0 ? (
        booking.map((item, index) => {
          const movie = item?.show?.movie;
          const showDateTime = item?.show?.showDateTime;

          if (!movie || !showDateTime) {
            console.warn("⛔ Incomplete booking data:", item);
            return (
              <div
                key={`missing-${index}`}
                className='bg-red-100 text-red-700 px-4 py-2 rounded mt-4'
              >
                <strong>Warning:</strong> Incomplete booking data for entry #{index + 1}.
              </div>
            );
          }

          return (
            <div
              key={item._id || index}
              className='flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'
            >
              <div className='flex flex-col md:flex-row'>
                <img
                  src={movie.poster || movie.poster_path || "/collection.jpg"}
                  alt={movie.title}
                  className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded'
                />
                <div className='flex flex-col p-4'>
                  <p className='text-lg font-semibold'>{movie.title}</p>
                  <p className='text-gray-400 text-sm'>{timeformate(movie.runtime)}</p>
                  <p className='text-gray-400 text-sm mt-auto'>
                    {dateFormate(showDateTime)}
                  </p>
                </div>
              </div>

              <div className='flex flex-col md:items-end md:text-right justify-between p-4'>
                <div className='flex items-center gap-4'>
                  <p className='text-2xl font-semibold mb-3'>
                    {currency}
                    {item.amount}
                  </p>
                  {!item.isPaid && (
                    <Link to={item.paymentLink} 
                    className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'>
                      Pay Now
                    </Link>
                  )}
                </div>
                <div className='text-sm'>
                  <p>
                    <span className='text-gray-400'>Total Tickets:</span>{' '}
                    {item.bookedSeats?.length || 'N/A'}
                  </p>
                  <p>
                    <span className='text-gray-400'>Seat Number:</span>{' '}
                    {item.bookedSeats?.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className='text-gray-400 mt-8'>No bookings found.</p>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default MyBooking;
