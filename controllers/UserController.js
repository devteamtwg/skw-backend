const User = require('../models/user')
const Role = require('../models/role')


const user_all = (req,res) => {
    run()
    async function run(){
        try{
            const users = await User.find({ role: { $ne: "651178a81c9af8ca1fcc8f6f" } })
            
            const userRolePromises = users.map(async (user) => {
                const role = await Role.findById(user.role)
                return {
                    ...user._doc,
                    role_name: role.title
                };
            });
            const usersWithRoles = await Promise.all(userRolePromises)
            
            const allRoles = await Role.find({
                'status':'Enabled',
                'title': { $nin: ['Admin', 'Business'] }
            })
            
            res.status(200).json({data:usersWithRoles,roles:allRoles})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const user_detail = (req,res) => {
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

const user_create = (req,res) => {
    let body = req.body
    run()
    async function run(){
        try{
            const users = await User.create(body)
            users.save

            res.status(200).json({data:users})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const user_update = (req,res) => {
    let id = req.params.id
    let body = req.body    

    run()
    async function run(){
        try{
            const users = await User.updateOne({'_id':id},{$set:body})
            res.status(200).json({data:users})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const user_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run() {
        try{
            const users = await User.deleteOne({'_id':id})
            res.status(200).json({data:users})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }


}

module.exports = {
    user_all,
    user_detail,
    user_create,
    user_update,
    user_delete,
}