const mongoose = require('mongoose')


const deviceSchema = mongoose.Schema({
    title:{
        type:String,
        unique:true
    },
    timeframe:String,
    warrenty:String,
    description:String,
    image:String,
    global_impact:String,
    user_type:String,
    status:String

},
{
    timestamps:true
})

module.exports = mongoose.model('Device',deviceSchema)