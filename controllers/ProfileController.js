const User = require('../models/user')
const Role = require('../models/role')
const Client = require('../models/client')
const Permission = require('../models/permission')


const profile_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const users = await User.findById(id)
            res.status(200).json({data:users})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}


const profile_update = (req,res) => {
    let id = req.params.id
    let body = req.body   
    delete body.img 
    if(req.file){
        body.img = req.file.key
    }
    
    
    run()
    async function run(){
        try{
            const users = await User.updateOne({'_id':id},{$set:body})
            
            const theuser = await User.findById(id)
           
            const role = await Role.findById(theuser.role)

            if(role.title === "Business"){
                const new_data = {
                    business_name:body.name,
                    email:body.email,
                }
                const clients = await Client.updateOne({'user_id':theuser._id},{$set:new_data})
            }

             

            const permissions = await Permission.findOne({'role_id':theuser.role})     

            
            const usersObject = theuser.toObject();
            usersObject.role_name = role.title
            usersObject.permissions = permissions

            res.status(200).json({data:usersObject})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}


module.exports = {
    profile_detail,
    profile_update,
}