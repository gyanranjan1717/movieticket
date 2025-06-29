import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dummyDateTimeData, dummyShowsData } from '../assets/assets'
import BlurCircle from '../Components/BlurCircle'
import { HeartIcon, PlayCircle, StarIcon } from 'lucide-react'
import timeformate from '../Lib/TimeFormate'
import DateSelect from '../Components/DateSelect'
import MovieCard from '../Components/MovieCard'
import Loading from '../Components/Loading'
const MovieDetails = () => {
   const {id} = useParams() // we are importing the id from the url
    const [shows,setshows] = useState(null)
  const Navigate  = useNavigate()
  // a function which fetch the id ans store in state variable
  const getShow = async ()=>{
    const show = dummyShowsData.find(show => show._id === id)
    if(show){
      setshows({
      movie:show,
      dateTime:dummyDateTimeData
    })
    }
    
  }
  //execute the getshow function whenever the component gets execute

    useEffect(()=>{
        getShow()

    },[id])
   return shows ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>

        <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
            <img src={shows.movie.poster_path} alt=""  className='max-md:max-auto rounded-2xl
            h-104 max-w-70 object-cover'/>

            <div className='relative flex flex-col gap-3'>
              <BlurCircle top='-100px' left='-100px' />
              <p className='text-primary'>ENGLISH</p>
                <h1 className='text-4xl font-semibold max-w-96 text-balance' 
                >{shows.movie.title}</h1>
                <div className='flex items-center gap-2 text-gray-400'>
                    <StarIcon className='w-5 h-5 text-primary fill-primary'/>
                    {shows.movie.vote_average.toFixed(1)} User Rating
                </div>
                <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'
                >{shows.movie.overview}</p>
                  <p>
                  {timeformate(shows.movie.runtime)} ·
                   {shows.movie.genres.map(genre => genre.name).join(", ")} · 
                   {shows.movie.release_date.split("-")[0]}
                </p>
                  <div className='flex items-center flex-wrap gap-4 mt-4'>
                    <button className='flex items-center gap-2 px-7 py-3 text-sm
                    bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium
                    cursor-pointer active:scale-95'>
                      <PlayCircle className='w-5 h-5'/>
                      Watch Trailer</button>
                    <a href="#dateSelect" className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer
                    active:scale-95'>Buy Tickets</a>
                    <button className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'>
                      <HeartIcon className='w-5 h-5' />
                    </button>

                  </div>
            </div>
        </div>
        <p className='text-lg font-medium mt-20'>Your Favroite Cast</p>
        <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
            <div className='flex items-center gap-4 w-max px-4'>
              {shows.movie.casts.slice(0,12).map((cast,index)=>(
                <div key={index} className='flex flex-col items-center text-center'>
                  <img src={cast.profile_path} alt="" className='rounded-full
                  h-20 md:h-20 aspect-square object-cover' />
                  <p className='font-medium text-xs mt-3'>
                    {cast.name}
                  </p>
                </div>
                                ))}
            </div>
        </div>
                                <DateSelect dateTime={shows.dateTime } id={id}/>

                                <p className='text-lg font-medium mt-20 mb-8'>You may also like </p>
                                <div className='flex flex-wrap max-sm:justify-center gap-8'>
                                {dummyShowsData.slice(0,4).map((movie ,index) => (
                                  <MovieCard  key={index} movie={movie}/>
                                ))}
                                </div>

                                <div className='flex justify-center mt-20'>
                                  <button onClick={ () =>{Navigate('/Movies');scrollTo(0,0)}}
                                   className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull
                                  transition rounded-md font-medium cursor-pointer' 
                                  >Show More</button>
                                </div>
    </div>
  ) : (
   <Loading/>
  )
}

export default MovieDetails