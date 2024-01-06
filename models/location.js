const mongoose = require('mongoose')


const locationSchema = mongoose.Schema({
    user_id:String,
    title:String,
    api:String,
    url:String,
    address:String,
    status:String
},
{
    timestamps:true
})

module.exports = mongoose.model('Location',locationSchema)