const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const tokenSchema = mongoose.Schema({
    userId:String,
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600,// this is the expiry time in seconds
    },
},
{
    timestamps:true
})

module.exports = mongoose.model('Token',tokenSchema)