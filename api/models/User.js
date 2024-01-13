const mongoose=require('mongoose');

const UserSchema= new mongoose.Schema({
    username: {type: String, unique:true},//accepts unique names no duplicate ones
    password:String,

},{timestamps:true});//gives created at time stamp

 const UserModel=mongoose.model('User',UserSchema);
 module.exports=UserModel;