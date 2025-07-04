// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { assets, dummyDateTimeData, dummyShowsData } from '../assets/assets';
// import Loading from '../Components/Loading';
// import { ArrowRightIcon, Clock10Icon, Search } from 'lucide-react';
// import isoTimeFormate from '../Lib/isoTimeFormate';
// import BlurCircle from '../Components/BlurCircle';
// import toast from 'react-hot-toast';

// const SeatLayout = () => {

//   const groupRows = [["A","B"],["C","D"],["E","F"],["G","H"],["I","J"]]

//   const { id, date } = useParams();
//   const [selectedSeat, setSelectedSeat] = useState([]);
//   const [selectedTime, setSelectedTime] = useState(null);
//   const [Show, setShow] = useState(null);

//   const Navigate = useNavigate();

//   const getShow = async () => {
//     const show = dummyShowsData.find(show => show._id === id);
//     if (show) {
//       setShow({
//         movie: show,
//         dateTime: dummyDateTimeData
//       });
//     }
//   };

// const handleSeatClick = (seatId) => {
//   if (!selectedTime) {
//     toast("Please select the time first");
//     return;
//   }

//   if (!selectedSeat.includes(seatId) && selectedSeat.length >= 5) {
//     toast("You can only select 5 seats");
//     return;
//   }

//   setSelectedSeat((prev) =>
//     prev.includes(seatId)
//       ? prev.filter((seat) => seat !== seatId)
//       : [...prev, seatId]
//   );
// };


// const renderSeats = (row, count = 9) => {
//   return (
//     <div key={row} className='flex gap-2 mt-2'>
//       <div className='flex flex-wrap items-center justify-center gap-2'>
//         {Array.from({ length: count }, (_, i) => {
//           const seatId = `${row}${i + 1}`;
//           return (
//             <button
//               key={seatId}
//               onClick={() => handleSeatClick(seatId)}
//               className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${
//                 selectedSeat.includes(seatId) ? "bg-primary text-white" :""
//               }`}
//             >
//               {seatId}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// };


//   useEffect(() => {
//     getShow();
//   }, [id]);

//   return Show ? (
//     <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>
      
//       {/* Available Timing */}
//       <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
//         <p className='text-lg font-semibold px-6'>Available Timing</p>
//         <div className='mt-5 space-y-1'>
//           {Show.dateTime[date]?.map((item) => (
//             <div
//               key={item.time}
//               onClick={() => setSelectedTime(item)}
//               className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
//                 selectedTime?.time === item.time
//                   ? 'bg-primary text-white'
//                   : 'hover:bg-primary/20'
//               }`}
//             >
//               <Clock10Icon className='w-4 h-4' />
//               <p className='text-sm'>{isoTimeFormate(item.time)}</p>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Seat Layout (add your seat layout here) */}
//       <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
//         <BlurCircle top='-100px' left='-100px'/>
//         <BlurCircle bottom='0' right='0'/>
//        <h1 className='text-2xl font-semibold mb-4'>Select Your Seat</h1>
        
//         <img src={assets.screenImage} alt="screen" />
//         <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>
          
//           <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>
//             <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
//               {groupRows[0].map(row => renderSeats(row))}
//             </div>
//               <div className='grid grid-cols-2 gap-11'>
//                 {groupRows.slice(1).map((group, idx) => (
//                   <div key={idx}>
//                     {group.map(row => renderSeats(row))}
//                   </div>
//                 ))}
//               </div>
//           </div>
//           <button onClick={() => Navigate('/MyBooking')}
//            className='flex items-center gap-1 mt-20 px-10 py-3 text-smbg-primary
//            hover:bg-primary-dull transition rounded-full font-medium
//            cursor-pointer active:scale-95
//            '
//           >Proceed to check out
//             <ArrowRightIcon strokeWidth={3} className='w-4 h-4'/>
//           </button>
       



//       </div>
//     </div>
//   ) : (
//     <Loading />
//   );
// };

// export default SeatLayout;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../assets/assets';
import Loading from '../Components/Loading';
import { ArrowRightIcon, Clock10Icon } from 'lucide-react';
import isoTimeFormate from '../Lib/isoTimeFormate';
import BlurCircle from '../Components/BlurCircle';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { set } from 'mongoose';

const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];
  const { id, date } = useParams();
  const Navigate = useNavigate();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]); // To store occupied seats  
  const { axios,getToken,user } = useAppContext();
 const [isBooking, setIsBooking] = useState(false);

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      } else {
        toast.error("Show not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch show details");
    }
  };


  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast("Please select the time first");
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) return toast("You can only select 5 seats");
      
    if( occupiedSeats.includes(seatId)) {
      return toast.error("This seat is already occupied");
    }
      setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  const renderSeats = (row, count = 9) => (
      <div key={row} className='flex gap-2 mt-2'>
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${
                selectedSeats.includes(seatId) ? "bg-primary text-white" : ""
              }
              ${occupiedSeats.includes(seatId) ? "bg-gray-400 opacity-50 cursor-not-allowed" : ""}`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
      </div>
    );
  
 const getOccupiedSeats = async () => {
    try {
      const {data} = await axios.get(`/api/booking/seats/${selectedTime.showId}`);
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats);
      }else{
        toast.error("Failed to fetch occupied seats");
      }
    }
    catch (error) {
      console.error("Error fetching occupied seats:", error);   
    }
  }

  const bookTickets = async () => {
    try{
      if(!user) return toast.error('please login to book tickets');
      if(!selectedTime || selectedSeats.length == 0) return toast.error("Please select a time and at least one seat");
      setIsBooking(true); // start loader 
      const {data}  =  await axios.post('/api/booking/create',{
        showId: selectedTime.showId,
        selectedSeats},
        {
          headers: {Authorization: `Bearer ${await getToken()}` }
      })
      if(data.success){
        toast.success("Tickets booked successfully!");
        Navigate('/MyBooking');
      }else {
        toast.error("Failed to book tickets");
      }
    }catch(error) {
      console.error("Error booking tickets:", error);
      toast.error("Failed to book tickets");
    }
    finally{
      setIsBooking(false); // stop loader
    }
  }

  useEffect(() => {
    getShow();
  }, []);

  useEffect(()=>{
    if(selectedTime){
      getOccupiedSeats();
    }
  },[selectedTime]);

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>
      {/* Timing Section */}
      <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6'>Available Timing</p>
<div className='mt-5 space-y-1'>
  {show.dateTime[date]?.map((item,index) => (
    <div
      key={`${item.time}-${index}`}
      onClick={() => setSelectedTime(item)}
      className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
        selectedTime?.time === item.time
          ? 'bg-primary text-white'
          : 'hover:bg-primary/20'
      }`}
    >
      <Clock10Icon className='w-4 h-4' />
      <p className='text-sm'>{isoTimeFormate(item.time)}</p>
    </div>
  )) || <p className='px-6 text-sm text-gray-400'>No timings available</p>}
</div>

      </div>

      {/* Seat Selection Section */}
      <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle bottom='0' right='0' />
        <h1 className='text-2xl font-semibold mb-4'>Select Your Seat</h1>

        <img src={assets.screenImage} alt="screen" />
        <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>

        <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>
          <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
            {groupRows[0].map(row => renderSeats(row))}
          </div>
          <div className='grid grid-cols-2 gap-11'>
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map(row => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

       <button
  onClick={bookTickets}

  className={`flex items-center gap-2 mt-20 px-10 py-3 text-sm transition rounded-full font-medium active:scale-95
    ${isBooking ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dull cursor-pointer'}`}
>
  {isBooking ? 'Booking...' : 'Proceed to checkout'}
  {!isBooking && <ArrowRightIcon strokeWidth={3} className='w-4 h-4' />}
</button>


      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
