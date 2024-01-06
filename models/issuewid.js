const mongoose = require('mongoose')


const issuewidSchema = mongoose.Schema({
    user_id:String,
    device_id:String,
    model_id:String,
    issue_id:String,
    title:String,
    price:String,
    timeframe:String,
    warrenty:String,
    description:String,
    image:String,
    status:String

},
{
    timestamps:true
})

module.exports = mongoose.model('Issuewid',issuewidSchema)