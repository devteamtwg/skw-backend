const Device = require('../models/device')
const Model = require('../models/model')
const Estimate = require('../models/estimate')

const device_all = (req,res) => {
    let user_type = req.params.id
    
    run()
    async function run(){
        try{
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

           
            const devices = await Device.find({'user_type':user_type}).sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)

            const totalCount = await Device.find({'user_type':user_type}).countDocuments()

            res.status(200).json({data:devices,page:page,limit:limit,totalCount:totalCount})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const device_detail = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const devices = await Device.findById(id)
            res.status(200).json({data:devices})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const device_create = (req,res) => {
    let body = req.body
    delete body.image 
    if(req.file){
        body.image = req.file.key
    }
    else{
        body.image = 'defaultdevice.png'
    }
    console.log(body)
    run()
    async function run(){
        try{
            const devices = await Device.create(body) 
            res.status(200).json({data:devices})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const device_update = (req,res) => {
    let id = req.params.id
    let body = req.body   
    delete body.image 
    if(req.file){
        body.image = req.file.key
    }

    run()
    async function run(){
        try{
            const devices = await Device.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:devices})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const device_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const model = await Model.findOne({'device_id':id})
            const estimate = await Estimate.findOne({'device_id':id})
            if(model || estimate){ 
                res.status(500).json({error:'This record is already in use and cannot be deleted!!'})
            }
            else{
                const devices = await Device.deleteOne({'_id':id})
                res.status(200).json({data:devices})
            }
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

module.exports = {
    device_all,
    device_detail,
    device_create,
    device_update,
    device_delete
}