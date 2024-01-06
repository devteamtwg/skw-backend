const Permission = require('../models/permission')
const User = require('../models/user')
const Role = require('../models/role')


const permission_detail = (req,res) => {
    let id = req.params.id 

    run()
    async function run(){
        try{
            const permissions = await Permission.findOne({role_id:id})
            const roles = await Role.findById(id)
            
            res.status(200).json({data:permissions,role_name:roles.title})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const permission_update = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const permissions = await Permission.updateOne({'_id':id},{$set:body})

            res.status(200).json({data:permissions})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}


module.exports = {
    permission_detail,
    permission_update
}