// import React from 'react'
// import { dummyShowsData } from '../assets/assets'
// import MovieCard from '../Components/MovieCard'
// import BlurCircle from '../Components/BlurCircle'
// // import { useAppContext } from '../context/AppContext'
// const Favroites = () => {

//   // const {favoriteMovies} = useAppContext()
  
//   // if we use dummyfavoritedata the we have to use this in place of  favoritesMOvies
  

//   return  dummyShowsData.length > 0 ? 
//   (
//     <div  className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 
//     overflow-hidden min-h-[80vh]'>
//       <BlurCircle top='150px' left='0px' />
//       <BlurCircle bottom='50px' right='50px' />
//       <h1 className='text-lg  font-medium my-4'>Your Favroites</h1>
//       <div className='flex flex-wrap max-sm:justify-center gap-8'>
//         {dummyShowsData.map((movie) => (
//           <MovieCard movie={movie} key={movie._id}/>
//         ))}
//       </div>
//     </div>
//   ) : (
//     <div className='flex flex-col items-center justify-center h-screen'>
//       <h1 className='text-3xl font-bold text-center'>No Movies Available</h1>
//     </div>
//   )
// }

// export default Favroites

import React from 'react';
import MovieCard from '../Components/MovieCard';
import BlurCircle from '../Components/BlurCircle';
import { useAppContext } from '../context/AppContext';

const Favorites = () => {
  const { favoriteMovies } = useAppContext();

  return favoriteMovies.length > 0 ? (
    <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
      <BlurCircle top='150px' left='0px' />
      <BlurCircle bottom='50px' right='50px' />
      <h1 className='text-lg font-medium my-4'>Your Favorites</h1>
      <div className='flex flex-wrap max-sm:justify-center gap-8'>
        {favoriteMovies.map((movie) => (
          <MovieCard movie={movie} key={movie._id} />
        ))}
      </div>
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center h-screen'>
      <h1 className='text-3xl font-bold text-center'>No Favorites Found</h1>
    </div>
  );
};

export default Favorites;
