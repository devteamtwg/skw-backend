const mongoose = require('mongoose')


const locationhlSchema = mongoose.Schema({
    user_id:String,
    hl_user_id:String,
    hl_company_id:String,
    hl_access_token:String,
    hl_refresh_token:String,
    hl_location_id:String,
    hl_location_title:String,
    hl_location_email:String,
    hl_location_phone:String,
    hl_location_address:String,
    hl_location_city:String,
    hl_location_country:String,
    hl_location_calender_id:String,
    custom_fields_trigger:Object,
    custom_fields_type:Object,
    custom_fields_data:Object,

    status:String
},
{
    timestamps:true
})

module.exports = mongoose.model('Locationhl',locationhlSchema)