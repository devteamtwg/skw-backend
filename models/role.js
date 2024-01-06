const mongoose = require('mongoose')


const roleSchema = mongoose.Schema({
    title:{
        type:String,
        unique:true
    },
    status:String
},
{
    timestamps:true
})

module.exports = mongoose.model('Role',roleSchema)