const Client = require('../models/client')
const User = require('../models/user')
const Location = require('../models/location')
const Locationhl = require('../models/locationhl')


const client_all = (req,res) => {
    run()
    async function run(){
        try{
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const clients = await Client.find().sort([['createdAt', 'descending']]).skip(skip)
            .limit(limit)         

            const totalCount = await Client.find().countDocuments()

            
            const clientLocationPromises = clients.map(async (client) => {
                const locations = await Locationhl.find({'user_id':client.user_id})
                return {
                    ...client._doc,
                    locations: locations
                };
            });
            const clientsWithLocations = await Promise.all(clientLocationPromises)

            res.status(200).json({data:clientsWithLocations,page:page,limit:limit,totalCount:totalCount})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const client_detail = (req,res) => {
    let id = req.params.id
    run()
    async function run(){
        try{
            const clients = await Client.findById(id)
            res.status(200).json({data:clients})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const client_create = (req,res) => {
    let body = req.body
    
    run()
    async function run(){
        try{
           
            const new_user = {
                name:body.business_name,
                email:body.email,
                password:body.password,
                status:body.status,
                img:"default.jpg",
                role:"651178a81c9af8ca1fcc8f6f"
            }
            const users = await User.create(new_user)
            users.save 

            body.user_id = users._id

            const clients = await Client.create(body)
            clients.save

            res.status(200).json({data:clients})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const client_update = (req,res) => {
    let id = req.params.id
    let body = req.body    
    
    run()
    async function run(){
        try{
            const theclient = await Client.findById(id)

            const new_user = {
                name:body.business_name,
                email:body.email,
                status:body.status,
            }
            const users = await User.updateOne({'_id':theclient.user_id},{$set:new_user})
            
            const clients = await Client.updateOne({'_id':id},{$set:body})

            res.status(200).json({data:clients})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }
}

const client_delete = (req,res) => {
    let id = req.params.id

    run()
    async function run() {
        try{
            const theclient = await Client.findById(id)

            const users = await User.deleteOne({'_id':theclient.user_id})
            const clients = await Client.deleteOne({'_id':id})
            res.status(200).json({data:clients})
        }
        catch(e){
            res.status(500).json({error:'Something went wrong!!',message:e})
        }
    }

}

module.exports = {
    client_all,
    client_detail,
    client_create,
    client_update,
    client_delete,
}