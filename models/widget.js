const mongoose = require('mongoose')


const widgetSchema = mongoose.Schema({
    user_id:String,
    client_id:String,
    widget_status:String,
    hands_on_quote:String,
    skip_quote:String,
    quote_title:String,
    primary_color:String,
    thankyou_title:String,
    thankyou_subtitle:String,
    quote_box_text:String,
},
{
    timestamps:true
})

module.exports = mongoose.model('Widget',widgetSchema)