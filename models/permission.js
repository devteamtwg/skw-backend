const mongoose = require("mongoose")

const permissionSchema = mongoose.Schema({
    role_id:String,
    permissions:Object
},
{
    timestamps:true
})

module.exports = mongoose.model('Permission',permissionSchema)