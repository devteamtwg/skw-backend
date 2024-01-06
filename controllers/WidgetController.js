const Widget = require('../models/widget')
const Client = require('../models/client')
// const Issuewid = require('../models/issuewid')
const Issueoriginal = require('../models/issueoriginal')
const Device = require('../models/device')
const Model = require('../models/model')
const Location = require('../models/location')


const widget_all = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const client = await Client.findOne({'user_id':id})
            
            const exist = await Widget.findOne({'user_id':id})

            if(!exist){
                const newData = {
                    user_id:id,
                    client_id:client._id,
                    widget_status:"Disabled",
                    hands_on_quote:"Disabled",
                    skip_quote:"Disabled",
                    quote_title:"Your hands on quote title",
                    primary_color:"#563d7c",
                    thankyou_title:"Thank you for choosing us",
                    thankyou_subtitle:"Your Request Has Been Received Successfully and is being processed by our team. we will be in touch shortly!",
                    quote_box_text:"#"
                }
                const widget = await Widget.create(newData) 
            }

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
            const all_locations = await Location.find({'user_id':id})
            
            res.status(200).json({data:widgets,selected_issues:selected_issues,selected_devices:selected_devices,selected_models:selected_models,all_locations:all_locations})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const widget_update = (req,res) =>{
    let id = req.params.id
    let body = req.body    
    
    run()
    async function run(){
        try{
            const widget = await Widget.updateOne({'_id':id},{$set:body})

            const exist = await Widget.findOne({'_id':id})
            //console.log(exist)
            res.status(200).json({data:widget})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

module.exports = {
    widget_all,
    widget_update
}