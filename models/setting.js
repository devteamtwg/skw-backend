const mongoose = require('mongoose')


const settingSchema = mongoose.Schema({
    business_name:String,
    email:String,
    phone:String,
    address:String,
    logo:Array,
    currency:String,
    date_format:String,
    global_handonquote_label_status:String,
    global_handonquote_label:String,
    invoice_title:String,
    invoice_prefix:String,
    invoice_header:String,
    invoice_footer:String,
    payment_gateway:String,
    stripe_public_key_live:String,
    stripe_private_key_live:String,
    stripe_public_key_test:String,
    stripe_private_key_test:String,
    payment_terms:String,
    tax_status:String,
    tax_title:String,
    tax_rate:String,

},
{
    timestamps:true
})

module.exports = mongoose.model('Setting',settingSchema)