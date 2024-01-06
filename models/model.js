const mongoose = require('mongoose')


const modelSchema = mongoose.Schema({
    device_id:String,
    title:{
        type:String,
        unique:true
    },
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

module.exports = mongoose.model('Model',modelSchema)