const mongoose = require('mongoose')
const { isEmail } = require('validator')
const bcrypt = require('bcrypt')


const clientSchema = mongoose.Schema({

    user_id:String,
    business_name:String,
    contact_person:String,
    email:{
        type:String,
        required:[true,'Please enter an email'],
        unique:true,
        lowercase:true,
        validate:[isEmail,'Please enter a valid email']
    },
    password:{
        type:String,
        required:[true,'Please enter a password minimum of 8 characters'],
        minLength:[8,'Please enter a password minimum of 8 characters']
    },
    phone:String,
    notes:String,
    status:String
},
{
    timestamps: true
})


module.exports = mongoose.model('Client', clientSchema)