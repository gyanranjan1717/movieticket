import express from "express"
import {getFavorites, getUserBookings, updateFavorite}  from "../controllers/userController.js"
// import { requireAuth } from "@clerk/express";
// Middleware to protect user routes
const userRouter = express.Router()

userRouter.get("/bookings",
    // requireAuth,
    getUserBookings)
userRouter.post("/update-favorite",
    // requireAuth,
    updateFavorite)
userRouter.get("/favorites",
    // requireAuth,
    getFavorites)

export default userRouter

//i am using requireAuth middleware to protect user routes, this will ensure that only authenticated users can access these routes. and i done this by chatgpt not by teacher 
