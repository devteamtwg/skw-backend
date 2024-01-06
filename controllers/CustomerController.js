const Customer = require('../models/customer')

const customer_all = (req,res) => {
    let id = req.params.id 
    
    run()
    async function run(){
        try{
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const customers = await Customer.find({'user_id':id}).sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)

            const totalCount = await Customer.find({'user_id':id}).countDocuments()

            
            res.status(200).json({data:customers,page:page,limit:limit,totalCount:totalCount})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const customer_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const customers = await Customer.findById(id)
            res.status(200).json({data:customers})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const customer_update = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const customers = await Customer.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:customers})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const customer_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run() {
        try{
            const customers = await Customer.deleteOne({'_id':id})
            res.status(200).json({data:customers})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }

}

module.exports = {
    customer_all,
    customer_detail,
    customer_update,
    customer_delete
}