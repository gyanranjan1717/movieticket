import { useState } from "react";
import { useContext } from "react";
import { createContext } from "react";
import axios from "axios"
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useEffect } from "react";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

export const AppContext = createContext()

export const AppProvider = ({children}) => {

    const [isAdmin,setIsAdmin] = useState(false)
    const [shows,setShows] = useState([])
    const [favoriteMovies,setFavoriteMovies] = useState([])
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    // const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;
    const {user} = useUser()
    const {getToken} = useAuth()
    const location = useLocation()
    const navigate  = useNavigate()

    const fetchIsAdmin = async () =>{
        try{
            const {data} = await axios.get('/api/admin/is-admin',{
                headers:{Authorization:`Bearer ${await getToken()}`}
            })
            setIsAdmin(data.isAdmin)

            // if(!data.isAdmin && location.pathname.startsWith('/admin')){
            //     navigate('/')
            //     toast.error('You are not authorized to access admin dashboard')
            // }

        }catch(error){
            console.log(error)
            setIsAdmin(false)
        }finally{
            setIsAdminLoading(false)
        }
    }

   const fetchShows = async () => {
  try {
    const { data } = await axios.get('/api/show/all'); // ✅ Relative path
    console.log("✅ API Response for /api/show/all:", data);

    if (data.success) {
      console.log("✅ Shows received:", data.shows);
      setShows(data.shows);
    } else {
      console.warn("⚠️ API responded with success = false");
      toast.error(data.message);
    }
  } catch (error) {
    console.error("❌ Error fetching shows:", error);
    toast.error("Error loading shows.");
  }
};


    const fetchFavoriteMovies = async ()=>{
        try{
            const {data} = await axios.get('/api/user/favorites',{
                headers:{Authorization:`Bearer ${await getToken()}`,},});

                if(data.success){
                    setFavoriteMovies(data.favorites);
                }else{
                    toast.error(data.message)
                }

        }catch(error){
            console.log(error)
        }
    }

    useEffect(()=>{
        fetchShows()
    },[])

    useEffect(()=>{
            if(user){
                fetchIsAdmin()
                fetchFavoriteMovies()
            }
    },[user])

    const value = {
        axios,
        fetchIsAdmin,
        user,getToken,navigate,isAdmin,shows,
        favoriteMovies,fetchFavoriteMovies,
        isAdminLoading

    }
    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = () => useContext(AppContext)



