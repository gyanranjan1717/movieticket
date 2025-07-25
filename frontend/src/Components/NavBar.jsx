import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import {MenuIcon,SearchIcon, TicketPlus, XIcon} from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { useAppContext } from '../context/AppContext'
const NavBar = () => {

  const [IsOpen,setIsOpen] = useState(false)

  const {user} = useUser()
  const {openSignIn} = useClerk()
  const navigate = useNavigate()
  const {favoriteMovies} = useAppContext()
  return (
    <div className='fixed top-0 left-0 z-50 w-full flex items-center
    justify-between px-6 md:px-16 lg:px-36 py-5'>
      
     <Link to='/' className='max-md:flex-1'>
     <img 
    //  src={assets.logo}
    src='https://fonts.freepik.com/api/render?variantId=12358&fontSize=48&text=Show%20Time'
      alt="" 
     className='w-36 h-auto'
     />
      
     </Link>

     <div className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium
     max-md:text-lg z-50 flex flex-col md:flex-row items-center
     max-md:justify-center gap-8 min-md:px-8 py-3 max-md:h-screen 
     min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border
     broder-gray-300/20 overflow-hidden transiton-[width] duration-300  ${IsOpen ? 'max-md:w-full' :'max=md:w-0'}`}>
    {/* we will add menu item here  */}
    <XIcon className='md:hidden absolute top-6 right-6 w-6 h-6 cursor:pointer
    ' onClick={()=> setIsOpen(!IsOpen)}>

    </XIcon>


    <Link onClick={()=>{scrollTo(0,0);setIsOpen(false)} } to='/'>Home</Link>
    <Link onClick={()=>{scrollTo(0,0);setIsOpen(false)} } to='/Movies'>Movies</Link>
    <Link onClick={()=>{scrollTo(0,0);setIsOpen(false)} } to='/'>Theaters</Link>
    <Link onClick={()=>{scrollTo(0,0);setIsOpen(false)} } to='/'>releases</Link>
{favoriteMovies.length > 0 &&  
 <Link onClick={() => { scrollTo(0, 0); setIsOpen(false) }} to='/Favroites'>
   Favorites
 </Link>}

  {/* } 
    {/* whenever menuicon display on small screen we have to  display cross icon by using that we can hide the small menu 
    */}

     </div>

      {/* in this we will add userlogin button and  search icon */}
     <div className='flex items-center gap-8'>
      <SearchIcon className='max-md:hidden w-8 h-8 cursor-pointer' />
      {/* if the user is not logged in then this button will show login and if they are logined then show their profile photo
       */}
       {
        !user ? (
          <button onClick={openSignIn} className='px-4 py-1 sm:px sm:oy-2 bg-primary hover:bg-primary-dull transition 
       rounded-full font-medium cursor-pointer' >Login</button>
     ) : (
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Action label='My Booking' labelIcon={<TicketPlus width={15}/>} 
          onClick={() => {
            navigate('/MyBooking')
          }}/>
        </UserButton.MenuItems>
      </UserButton>   
      // with the hep of this we can add another my booking in the detail of the account 
     )
       }
       </div>

    <MenuIcon onClick={()=>{setIsOpen(!IsOpen)} } className ='max-md:ml-4 md:hidden w-8 h-8 cursor-pointer'/>

    </div>
  )
}

export default NavBar