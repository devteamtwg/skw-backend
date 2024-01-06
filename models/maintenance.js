const mongoose = require('mongoose')


const maintenanceSchema = mongoose.Schema({    
    status:String
},
{
    timestamps:true
})

module.exports = mongoose.model('Maintenance',maintenanceSchema)