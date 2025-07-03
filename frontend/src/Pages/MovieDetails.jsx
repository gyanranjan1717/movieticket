import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dummyDateTimeData, dummyShowsData } from '../assets/assets'
import BlurCircle from '../Components/BlurCircle'
import { HeartIcon, PlayCircle, StarIcon } from 'lucide-react'
import timeformate from '../Lib/TimeFormate'
import DateSelect from '../Components/DateSelect'
import MovieCard from '../Components/MovieCard'
import Loading from '../Components/Loading'
// import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
const MovieDetails = () => {
   const {id} = useParams() // we are importing the id from the url
    const [show,setshows] = useState(null)
  const Navigate  = useNavigate()
  // a function which fetch the id ans store in state variable

  // const {shows,axios,getToken , user,fetchFavoritesMovies,favoriteMovies,image_base_url}  =  useAppContext()

  const getShow = async ()=>{
    const show = dummyShowsData.find(show => show._id === id)
    if(show){
      setshows({
      movie:show,
      dateTime:dummyDateTimeData
    })
    }
    // try{

    //     const {data} = await axios.get(`/api/show/${id}`)
    //     if(data.success){
    //       setshows(data)
    //     }

    // }catch(error){
    //   console.error("Error fetching show details:", error)
    // }

  }
  //execute the getshow function whenever the component gets execute

  const handleFavorite = async () => {
    try{
        if(!user)return toast.error("Please login to add to favorites")
          const {data} = await axios.post('/api/user/update-favorites',{movieId:id},{
            headers:{Authorization:`Bearer ${ await getToken()}` }})
          if(data.success){
            await fetchFavoritesMovies()
            toast.success("Added to favorites")
          }
          }catch(error){
      console.error("Error adding to favorites:", error)
    }
  
  }

    useEffect(()=>{
        getShow()

    },[id])
   return show ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>

        <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
            <img src={image_base_url + show.movie.poster_path} alt=""  className='max-md:max-auto rounded-2xl
            h-104 max-w-70 object-cover'/>

            <div className='relative flex flex-col gap-3'>
              <BlurCircle top='-100px' left='-100px' />
              <p className='text-primary'>ENGLISH</p>
                <h1 className='text-4xl font-semibold max-w-96 text-balance' 
                >{show.movie.title}</h1>
                <div className='flex items-center gap-2 text-gray-400'>
                    <StarIcon className='w-5 h-5 text-primary fill-primary'/>
                    {show.movie.vote_average.toFixed(1)} User Rating
                </div>
                <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'
                >{show.movie.overview}</p>
                  <p>
                  {timeformate(show.movie.runtime)} ·
                   {show.movie.genres.map(genre => genre.name).join(", ")} · 
                   {show.movie.release_date.split("-")[0]}
                </p>
                  <div className='flex items-center flex-wrap gap-4 mt-4'>
                    <button className='flex items-center gap-2 px-7 py-3 text-sm
                    bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium
                    cursor-pointer active:scale-95'>
                      <PlayCircle className='w-5 h-5'/>
                      Watch Trailer</button>
                    <a href="#dateSelect" className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer
                    active:scale-95'>Buy Tickets</a>
                    <button  onClick={handleFavorite} 
                    className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'>
                      <HeartIcon className={`w-5 h-5 ${favoriteMovies.find(movie => movie._id === id) ? 'fill-primary text-primary ' : " "}` } />
                    </button>

                  </div>
            </div>
        </div>
        <p className='text-lg font-medium mt-20'>Your Favroite Cast</p>
        <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
            <div className='flex items-center gap-4 w-max px-4'>
              {show.movie.casts.slice(0,12).map((cast,index)=>(
                <div key={index} className='flex flex-col items-center text-center'>
                  <img src={image_base_url + cast.profile_path} alt="" className='rounded-full
                  h-20 md:h-20 aspect-square object-cover' />
                  <p className='font-medium text-xs mt-3'>
                    {cast.name}
                  </p>
                </div>
                                ))}
            </div>
        </div>
                                <DateSelect dateTime={show.dateTime } id={id}/>

                                <p className='text-lg font-medium mt-20 mb-8'>You may also like </p>
                                <div className='flex flex-wrap max-sm:justify-center gap-8'>
                                {shows.slice(0,4).map((movie ,index) => (
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