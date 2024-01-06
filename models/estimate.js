const mongoose = require('mongoose')


const estimateSchema = mongoose.Schema({
    user_id:String,
    client_id:String,
    device_id:String,
    model_id:String,
    issue_id:String,
    issue_array:Array,
    full_name:String,
    email:String,
    phone:String,
    delivery_option:String,
    description:String,
    price:String,
    location_id:String,

},
{
    timestamps:true
})

module.exports = mongoose.model('Estimate',estimateSchema)