const Issuewid = require('../models/issuewid')
const Model = require('../models/model')
const Device = require('../models/device')
const Issueoriginal = require('../models/issueoriginal')


const issue_all = (req,res) => {
    let id = req.params.id 

    
    run()
    async function run(){
        try{
            const issues = await Issuewid.find({'user_id':id}).sort([['createdAt', 'descending']])
            
            const combinePromises = issues.map(async (issue) => {
                const device = await Device.findById(issue.device_id)
                const model = await Model.findById(issue.model_id)

                return {
                    ...issue._doc,
                    device_title: device.title,
                    model_title: model.title
                };
            });
            const combine = await Promise.all(combinePromises)

            
            const allDevices = await Device.find({'status':'Enabled'})
            const allModels = await Model.find({'status':'Enabled'})
            const allIssuesOriginal = await Issueoriginal.find({'status':'Enabled'}) 

            res.status(200).json({data:combine,devices:allDevices,models:allModels,issues:allIssuesOriginal})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const issue_detail = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const issues = await Issuewid.findById(id)
            res.status(200).json({data:issues})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const issue_create = (req,res) => {
    let body = req.body
    delete body.image 
    run()
    async function run(){
        try{
            const issueOriginal = await Issueoriginal.findOne({'_id':body.issue_id})

            body.title = issueOriginal.title
            body.image = issueOriginal.image


            const issues = await Issuewid.create(body) 

            res.status(200).json({data:issues})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const issue_update = (req,res) => {
    let id = req.params.id
    let body = req.body   

    run()
    async function run(){
        try{
            const issues = await Issuewid.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:issues})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const issue_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run(){
        try{
            const issues = await Issuewid.deleteOne({'_id':id})
            res.status(200).json({data:issues})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

module.exports = {
    issue_all,
    issue_detail,
    issue_create,
    issue_update,
    issue_delete
}