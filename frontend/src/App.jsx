import React from 'react'
import NavBar from './Components/NavBar'
import {Route,Routes, useLocation} from 'react-router-dom'
import Home from './Pages/Home'
import Movies from './Pages/Movies'
import MoviesDetails from './Pages/MovieDetails'
import SeatLayout from './Pages/SeatLayout'
import MyBooking from './Pages/MyBooking'
import Favroites from './Pages/Favroites'
import {Toaster} from 'react-hot-toast'
import Footer from './Components/Footer'
import { SignedIn, SignedOut, SignIn, SignInButton, UserButton } from '@clerk/clerk-react';
import Layout from './Pages/Admin/Layout'
import Dashboard from './Pages/Admin/Dashboard'
import AddShow from './Pages/Admin/AddShow'
import ListShow from './Pages/Admin/ListShow'
import ListBooking from './Pages/Admin/ListBooking'
import { useAppContext } from './context/AppContext'
const App = () => {

  const isAdminRoute = useLocation().pathname.startsWith('/admin') 
  /* this will help us to check that whether we are admin or user  */
  
  const {user} = useAppContext()
  
  return (

   <>
   <Toaster/>
   {!isAdminRoute &&  <NavBar/> } {/*this will display navbar only when user is present */}
   
   <Routes>
    <Route path='/' element={<Home/>}/>
    <Route path='/Movies' element={<Movies/>}/>
    <Route path='/Movies/:id' element={<MoviesDetails/>}/>
    <Route path='/Movies/:id/:date' element = {<SeatLayout/>}/>
    <Route path='/MyBooking' element={<MyBooking/>}/>
    <Route path='/Favroites' element={<Favroites/>}/>
    <Route path='/admin/*' element={user ? <Layout/> :(
      <div className='min-h-screen flex justify-center items-center'>
        <SignIn fallbackRedirectUrl={'/admin'}/>
      </div>
    )}>
      <Route index element={<Dashboard/>}/>
      <Route path='AddShow' element={<AddShow/>}/>
      <Route path='ListShow' element={<ListShow/>}/>
      <Route path='ListBooking' element={<ListBooking/>}/>
    </Route>
   </Routes>
   
   {/* footer is display on all pages except for admin pages due to this we add after Routes
    */}
    {!isAdminRoute && <Footer/>}
   </>
  )
}

export default App