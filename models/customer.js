const mongoose = require('mongoose')
const { isEmail } = require('validator')
const bcrypt = require('bcrypt')


const customerSchema = mongoose.Schema({

    user_id:String,
    name:String,
    email:{
        type:String,
        required:[true,'Please enter an email'],
        unique:true,
        lowercase:true,
        validate:[isEmail,'Please enter a valid email']
    },   
    phone:String,
    notes:String,
    status:String
},
{
    timestamps: true
})


module.exports = mongoose.model('Customer', customerSchema)