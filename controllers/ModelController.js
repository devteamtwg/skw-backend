const Model = require('../models/model')
const Device = require('../models/device')
const Issueoriginal = require('../models/issueoriginal')
const Estimate = require('../models/estimate')

const model_all = (req,res) => {
    let user_type = req.params.id
    
    run()
    async function run(){
        try{
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const models = await Model.find({'user_type':user_type}).sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)

            const totalCount = await Model.find({'user_type':user_type}).countDocuments()
            
            const modelDevicePromises = models.map(async (model) => {
                const device = await Device.findById(model.device_id)
                return {
                    ...model._doc,
                    device_title: device.title
                };
            });
            const modelsWithDevices = await Promise.all(modelDevicePromises)
            
            const allDevices = await Device.find({'user_type':user_type,'status':'Enabled'})
            
            res.status(200).json({data:modelsWithDevices,devices:allDevices,page:page,limit:limit,totalCount:totalCount})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const model_detail = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const models = await Model.findById(id)
            res.status(200).json({data:models})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const model_create = (req,res) => {
    let body = req.body
    delete body.image 
    if(req.file){
        body.image = req.file.key
    }
    else{
        body.image = 'defaultmodel.png'
    }

    run()
    async function run(){
        try{
            const models = await Model.create(body) 
            res.status(200).json({data:models})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const model_update = (req,res) => {
    let id = req.params.id
    let body = req.body   
    delete body.image 
    if(req.file){
        body.image = req.file.key
    }

    run()
    async function run(){
        try{
            const models = await Model.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:models})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const model_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const issue = await Issueoriginal.findOne({'model_id':id})
            const estimate = await Estimate.findOne({'model_id':id})
            if(issue || estimate){ 
                res.status(500).json({error:'This record is already in use and cannot be deleted!!'})
            }
            else{
                const models = await Model.deleteOne({'_id':id})
                res.status(200).json({data:models})
            }
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

module.exports = {
    model_all,
    model_detail,
    model_create,
    model_update,
    model_delete
}