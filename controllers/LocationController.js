const Location = require('../models/location')
const Locationhl = require('../models/locationhl')

const location_all = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const locations = await Location.find({'user_id':id}).sort([['createdAt', 'descending']])
            
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const location_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const locations = await Location.findById(id)
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const location_create = (req,res) => {
    let body = req.body
    run()
    async function run(){
        try{
            const locations = await Location.create(body)
            locations.save

            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const location_update = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const locations = await Location.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const location_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run() {
        try{
            const locations = await Location.deleteOne({'_id':id})
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }


}

const hl_all = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const locationhls = await Locationhl.find({'user_id':id}).sort([['createdAt', 'descending']])
            
            res.status(200).json({data:locationhls})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const hl_data = (req,res) => {
    let body = req.body

    
    run()
    async function run(){
        try{

            for (const item of body.user_response.roles.locationIds) {

                const data = {
                    user_id:body.user_id,
                    hl_user_id:null,
                    hl_company_id:null,
                    hl_access_token:null,
                    hl_refresh_token:null,
                    hl_location_id:item,
                    hl_location_title:item,
                    hl_location_email:null,
                    hl_location_phone:null,
                    hl_location_address:null,
                    hl_location_city:null,
                    hl_location_country:null,
                    hl_location_calender_id:null,
                    custom_fields_trigger:null,
                    custom_fields_type:null,
                    custom_fields_data:null,

                }
                
                const findLocation = await Locationhl.findOne({'user_id':data.user_id,'hl_location_id':item})

                if(findLocation){
                    // 
                    
                }
                else{
                    const Locationhls = await Locationhl.create(data)
                    Locationhls.save
                }
                
            }

            const data = {
                hl_user_id:body.token_response.userId,
                hl_company_id:body.token_response.companyId,
                hl_access_token:body.token_response.access_token,
                hl_refresh_token:body.token_response.refresh_token,
                hl_location_id:body.token_response.locationId,
                hl_location_title:body.location_data.location.name,
                hl_location_email:body.location_data.location.email,
                hl_location_phone:body.location_data.location.phone,
                hl_location_address:body.location_data.location.address,
                hl_location_city:body.location_data.location.city,
                hl_location_country:body.location_data.location.country,
            }

            const Locationhls = await Locationhl.updateOne({'user_id':body.user_id,'hl_location_id':body.token_response.locationId},{$set:data})

            const customdata = {               
                custom_fields_trigger:body.custom_fields_trigger,
                custom_fields_type:body.custom_fields_type,
                custom_fields_data:body.custom_fields_data,
            }

            if(body.custom_fields_trigger){
                const CustomField = await Locationhl.updateOne({'user_id':body.user_id,'hl_location_id':body.token_response.locationId},{$set:customdata})
            }

            res.status(200).json({data:true})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const hl_data_cid = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const locations = await Locationhl.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}



module.exports = {
    location_all,
    location_detail,
    location_create,
    location_update,
    location_delete,
    hl_all,
    hl_data,
    hl_data_cid,
}