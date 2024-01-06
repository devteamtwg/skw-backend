const mongoose = require('mongoose')


const issueoriginalSchema = mongoose.Schema({
    device_id:String,
    model_id:String,
    title:String,
    price:String,
    timeframe:String,
    warrenty:String,
    description:String,
    user_type:String,
    image:String,
    status:String

},
{
    timestamps:true
})

module.exports = mongoose.model('Issueoriginal',issueoriginalSchema)