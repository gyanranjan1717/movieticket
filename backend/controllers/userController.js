import { clerkClient } from "@clerk/express"
import Booking from "../models/bookingModel.js"
import Movie from "../models/movieModel.js"

//  API  controller function to get user bookings

export const getUserBookings = async (req, res) => {
    try {
        const user = req.auth().userId
        const bookings = await Booking.find({ user }).populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 })

        return res.status(200).json({ success: true, bookings })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Erro ao carregar reservas" })
    }
}


//API controller function to add favorite move in clerk user metadata

// export const updateFavorite = async (req, res) => {
//     try {
//         const { movieId } = req.body
//         const userId = req.auth().userId

//         const user = await clerkClient.users.getUser(userId)
//         if (!user.privateMetadata.favorites) {
//             user.privateMetadata.favorites = []
//         }

//         if (!user.privateMetadata.favorites.includes(movieId)) {
//             user.privateMetadata.favorites.push(movieId)
//         } else {
//             user.privateMetadata.favorites = user.privateMetadata.favorites.filter((item) => item !== movieId)
//         }

//        await clerkClient.users.updateUserMetadata(userId, {
//   privateMetadata: {
//     favorites: user.privateMetadata.favorites,
//   },
// });


//         return res.status(200).json({ success: true, message: "Favoritos atualizado com sucesso", favorites: user.privateMetadata.favorites })

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ success: false, message: "erro ao adicionar ao favoritos" })
//     }
// }

export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.auth().userId;

    const user = await clerkClient.users.getUser(userId);

    // Safely get favorites
    let favorites = user.privateMetadata.favorites || [];

    // Toggle favorite
    if (!favorites.includes(movieId)) {
      favorites.push(movieId);
    } else {
      favorites = favorites.filter((item) => item !== movieId);
    }

    // ✅ CORRECT WAY: wrap the favorites in an object
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { favorites },
    });

    return res.status(200).json({
      success: true,
      message: "Favorites updated successfully",
      favorites,
    });
  } catch (error) {
    console.log("❌ Error in updateFavorite:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating favorites" });
  }
};

export const getFavorites = async (req, res) => {
    try {
        const user = await clerkClient.users.getUser(req.auth().userId)
        const favorites = user.privateMetadata.favorites || []

// getting movies from the database based on the favorites array
        const movies = await Movie.find({ _id: { $in: favorites } })

        return res.status(200).json({ success: true, movies })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: "Erro ao buscar favoritos" })
    }
}