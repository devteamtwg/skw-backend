const Estimate = require('../models/estimate')
const Customer = require('../models/customer')
const Device = require('../models/device')
const Model = require('../models/model')
const IssueOriginal = require('../models/issueoriginal')
const Location = require('../models/location')
const Locationhl = require('../models/locationhl')


const estimate_all = (req,res) => {
    let id = req.params.id

    

    run()
    async function run(){
        try{
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const estimates = await Estimate.find({'user_id':id}).sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)
            
            const totalCount = await Estimate.find({'user_id':id}).countDocuments()

            
            const combinePromises = estimates.map(async (estimate) => {
                const devices = await Device.findById(estimate.device_id)
                const models = await Model.findById(estimate.model_id)
                
                
                let locationid = 0
                let location_name = ''
                
                if(estimate.location_id !== ''){
                    locationid = estimate.location_id
                    const locations = await Locationhl.findOne({'hl_location_id':locationid})
                    
                    
                    if(locations){
                        location_name = locations.hl_location_title
                    }
                }
                
               
                return {
                    ...estimate._doc,
                    device_name: devices.title,
                    model_name: models.title,
                    //issue_name: issues.title,
                    location_name: location_name

                };
            });
            const combineEstimates = await Promise.all(combinePromises) 

           
            
            res.status(200).json({data:combineEstimates,page:page,limit:limit,totalCount:totalCount})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const estimate_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const estimates = await Estimate.findById(id)
            res.status(200).json({data:estimates})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
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

// const estimate_update = (req,res) => {
//     let id = req.params.id
//     let body = req.body    

//     run()
//     async function run(){
//         try{
//             const estimates = await Estimate.updateOne({'_id':id},{$set:body})
//             res.status(200).json({data:estimates})
//         }
//         catch(e){
//             res.status(500).json({error:'Something went wrong!!',message:e})
//         }
//     }
// }

// const estimate_delete = (req,res) => {
//     let id = req.params.id

//     run()
//     async function run() {
//         try{
//             const estimates = await Estimate.deleteOne({'_id':id})
//             res.status(200).json({data:estimates})
//         }
//         catch(e){
//             res.status(500).json({error:'Something went wrong!!',message:e})
//         }
//     }


// }

module.exports = {
    estimate_all,
    estimate_detail,
    estimate_create,
    // estimate_update,
    // estimate_delete
}