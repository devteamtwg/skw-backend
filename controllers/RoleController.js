const Role = require('../models/role')
const Permission = require('../models/permission')
const User = require('../models/user')


const role_all = (req,res) => {
    run()
    async function run(){
        try{
            const roles = await Role.find()

            const combinePromises = roles.map(async (role) => {
                const permissions = await Permission.findOne({'role_id':role._id})
                return {
                    ...role._doc,
                    all_permission: permissions.permissions,
                    permission_id: permissions._id
                };
            });
            const combineRoles = await Promise.all(combinePromises)

            res.status(200).json({data:combineRoles})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',messege:e})
        }
    }
}

const role_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const roles = await Role.findById(id)
            res.status(200).json({data:roles})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const role_create = (req,res) => {
    let body = req.body
    run()
    async function run(){
        try{
            const roles = await Role.create(body)
            roles.save

            const data = {
                role_id:roles._id,
                permissions:[
                    {
                        mod:"Devices:",
                        service:{
                            list:true,
                            view:true,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Models:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Issues:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Reports:",
                        service:{
                            list:true,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Users:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Roles:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Clients:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"System:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    },
                    {
                        mod:"Maintenance:",
                        service:{
                            list:false,
                            view:false,
                            add:false,
                            update:false,
                            delete:false,
                            menu:false
                        }                        
                    }
                ]
            }

            const permissions = await Permission.create(data)
            permissions.save

            res.status(200).json({data:roles})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const role_update = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const roles = await Role.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:roles})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const role_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run() {
        try{
            const user = await User.findOne({'role':id})
            
            if(user){ 
                res.status(500).json({error:'This record is already in use and cannot be deleted!!'})
            }
            else{
                const roles = await Role.deleteOne({'_id':id})
                const permissions = await Permission.deleteOne({'role_id':id})
                res.status(200).json({data:roles})
            }
            
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }


}

module.exports = {
    role_all,
    role_detail,
    role_create,
    role_update,
    role_delete
}