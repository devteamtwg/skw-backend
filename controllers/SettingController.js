const Setting = require('../models/setting')


const setting_all = (req,res) => {
    run()
    async function run(){
        try{
            const setting = await Setting.find()
            res.status(200).json({data:setting})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const setting_update = (req,res) =>{
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const setting = await Setting.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:setting})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

module.exports = {
    setting_all,
    setting_update
}