const Widget = require('../models/widget')
const Client = require('../models/client')
// const Issuewid = require('../models/issuewid')
const Issueoriginal = require('../models/issueoriginal')
const Device = require('../models/device')
const Model = require('../models/model')
const Estimate = require('../models/estimate')
const Customer = require('../models/customer')
const Location = require('../models/location')
const Locationhl = require('../models/locationhl')

const widget_all = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const client = await Client.findOne({'user_id':id})

            const widgets = await Widget.findOne({'user_id':id})

            /////Getting All Issues For Widget
            const selected_issues = await Issueoriginal.find({'user_type':id})

            const uniqueDeviceIds = [];
            const uniqueModelIds = [];
            for (const item of selected_issues) {
                const deviceId = item.device_id;              
                const modelId = item.model_id;  
                if (!uniqueDeviceIds.includes(deviceId)) {
                  uniqueDeviceIds.push(deviceId);
                }
                if (!uniqueModelIds.includes(modelId)) {
                    uniqueModelIds.push(modelId);
                }
            }
            
            /////Getting Device Data
            const query_device = { _id: { $in: uniqueDeviceIds } };
            const selected_devices = await Device.find(query_device)

            /////Getting Model Data
            const query_model = { _id: { $in: uniqueModelIds } };
            const selected_models = await Model.find(query_model)

             //Getting Location Data
             const all_locations = await Locationhl.find({'user_id':id})
            
            res.status(200).json({data:widgets,selected_issues:selected_issues,selected_devices:selected_devices,selected_models:selected_models,all_locations:all_locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}


const estimate_create = (req,res) => {
    let body = req.body

    
    run()
    async function run(){
        try{
            const estimates = await Estimate.create(body)
            estimates.save

            const newData = {
                user_id:body.user_id,
                name:body.full_name,
                email:body.email,
                phone:body.phone,
                notes:"",
                status:"Enabled",
            }

            const exist = await Customer.findOne({'email':body.email})
            if(!exist){
                const customers = await Customer.create(newData)
                customers.save
            }

            res.status(200).json({data:estimates})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const hl_data_reftoken = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const locations = await Locationhl.updateOne({'hl_location_id':id},{$set:body})
            res.status(200).json({data:locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

module.exports = {
    widget_all,
    estimate_create,
    hl_data_reftoken
}