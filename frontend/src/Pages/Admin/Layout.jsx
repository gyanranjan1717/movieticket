import React from 'react'
import AdminNavBar from '../../Components/Admin/AdminNavBar'
import AdminSideBar from '../../Components/Admin/AdminSideBar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useEffect } from 'react'
import Loading from '../../Components/Loading'

const Layout = () => {

  const {isAdmin,fetchIsAdmin} = useAppContext()

  useEffect(()=>{
    fetchIsAdmin()

  },[])

  return isAdmin ?(
    <>
    <AdminNavBar/>
    <div className='flex'>
        <AdminSideBar/>
        <div className='flex-1 px-4 py-10 md:px-10 h=[calc(100vh-64px)] overflow-y-auto'>
            <Outlet/>
        </div>
    </div>
    </>
  ) : <Loading/>
}

export default Layout