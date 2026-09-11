import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'

const AdminNavBar = () => {
  return (
    <div className='flex items-center justify-between px-6 
    md:px-10 h-16 border-b border-gray-300/30
    '>
        <Link to="/">
          <img src={assets.logo} alt="ShowTime Logo" className="w-32 md:w-36 h-auto object-contain cursor-pointer transition-transform duration-200 hover:scale-105" />
        </Link>
    </div>
  )
}

export default AdminNavBar