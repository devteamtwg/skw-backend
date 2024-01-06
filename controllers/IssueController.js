const Issueoriginal = require('../models/issueoriginal')
const Model = require('../models/model')
const Device = require('../models/device')
const Estimate = require('../models/estimate')

const issue_all = (req,res) => {
    let user_type = req.params.id

    run()
    async function run(){
        try{

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const issues = await Issueoriginal.find({'user_type':user_type}).sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)

            const totalCount = await Issueoriginal.find({'user_type':user_type}).countDocuments()

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
            
            const allDevices = await Device.find({'user_type':user_type,'status':'Enabled'})
            const allModels = await Model.find({'user_type':user_type,'status':'Enabled'})

            const catalogDevices = await Device.find({'user_type':'Admin','status':'Enabled'})
            const catalogModels = await Model.find({'user_type':'Admin','status':'Enabled'})
            const catalogIssues = await Issueoriginal.find({'user_type':'Admin','status':'Enabled'})
            
            const combinedDevices= allDevices.concat(catalogDevices);
            const combinedModels= allModels.concat(catalogModels);

            res.status(200).json({
                data:combine,
                devices:allDevices,
                models:allModels,
                catalogDevices:catalogDevices,
                catalogModels:catalogModels,
                catalogIssues:catalogIssues,
                combinedDevices:combinedDevices,
                combinedModels:combinedModels,
                page:page,
                limit:limit,
                totalCount:totalCount
            })
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
            const issues = await Issueoriginal.findById(id)
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
    if(req.file){
        body.image = req.file.key
    }
    else{
        body.image = 'defaultissue.png'
    }
    
    run()
    async function run(){
        try{
            console.log("doing")
            const issues = await Issueoriginal.create(body) 
            console.log(issues)
            res.status(200).json({data:issues})
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const issue_create_catalog = (req,res) => {
    let body = req.body
    console.log(body)
    
    run()
    async function run(){
        try{
            const issueOriginal = await Issueoriginal.findOne({'_id':body.issue_id})

            body.title = issueOriginal.title
            body.timeframe = issueOriginal.timeframe
            body.warrenty = issueOriginal.warrenty
            body.description = issueOriginal.description
            body.image = issueOriginal.image


            const issues = await Issueoriginal.create(body) 
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
    delete body.image 
    if(req.file){
        body.image = req.file.key
    }
    
    run()
    async function run(){
        try{
            const issues = await Issueoriginal.updateOne({'_id':id},{$set:body})
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
            const estimate = await Estimate.findOne({'model_id':id})
            if(estimate){ 
                res.status(500).json({error:'This record is already in use and cannot be deleted!!'})
            }
            else{
                const issues = await Issueoriginal.deleteOne({'_id':id})
                res.status(200).json({data:issues})
            }
            
        }
        catch(e){
            res.status(500).json({error:"Something went wrong!!",messege:e})
        }
    }
}

const bulk_edit = (req,res) => {
    let id = req.params.id
    let body = req.body   
    
    let data = JSON.parse(body.data)
    run()
    async function run(){
        try{
            console.log(data)
            for (const item of data) {
                const { rowIssueId, rowPrice } = item;
            
                //const issues = await Issueoriginal.updateOne({'_id':rowIssueId},{$set:rowPrice})
                try {
                  const result = await Issueoriginal.updateOne({'_id':rowIssueId}, {$set:{'price':rowPrice}});
                  console.log(`Updated document for rowIssueIdnew: ${rowPrice}`);
                } catch (error) {
                  console.error(`Error updating document for rowIssueId: ${rowIssueId}`);
                }
            }

            res.status(200).json({data:true})
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
    issue_create_catalog,
    issue_update,
    issue_delete,
    bulk_edit
}