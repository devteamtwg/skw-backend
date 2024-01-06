const Maintenance = require('../models/maintenance')


const maintenance_all = (req,res) => {
    run()
    async function run(){
        try{
            const maintenance = await Maintenance.find()
            res.status(200).json({data:maintenance})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const maintenance_update = (req,res) => {
    let id = req.params.id
    let body = req.body    
    
    run()
    async function run(){
        try{
            const maintenance = await Maintenance.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:maintenance})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}


module.exports = {
    maintenance_all,
    maintenance_update
}