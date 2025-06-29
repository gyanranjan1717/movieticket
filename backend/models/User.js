import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema({
    _id:{type:String,required:true},
    name:{type:String,required:true},
    email:{type:String,required:true},
    Image:{type:String},
});

const User = mongoose.model('User',userSchema);

export default User;