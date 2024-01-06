const Client = require('../models/client')
const User = require('../models/user')
const Location = require('../models/location')
const Estimate = require('../models/estimate')
const Device = require('../models/device')
const Model = require('../models/model')


const dashboard_all = (req,res) => {
    let body = req.body
    
    run()
    async function run(){
        try{
            const clients = await Client.find().sort([['createdAt', 'descending']]).limit(5)         
            
            const clientLocationPromises = clients.map(async (client) => {
                const locations = await Location.find({'user_id':client.user_id})
                return {
                    ...client._doc,
                    location_count: locations.length
                };
            });
            const clientsWithLocations = await Promise.all(clientLocationPromises)

            const priceSum = await Estimate.aggregate([
                {
                  $addFields: {
                    priceNumeric: { $toDouble: '$price' }, 
                  },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$priceNumeric' },
                    count: { $sum: 1 } 
                  },
                },
              ]);

              const resultObject = priceSum.length > 0 ? priceSum[0] : { total: 0, count: 0 };

            res.status(200).json({data:clientsWithLocations,total_estimates:resultObject})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const dashboard_owner = (req,res) => {
    let id = req.params.id
    
    run()
    async function run(){
        try{
           
            const priceSum = await Estimate.aggregate([
                {
                    $match: {
                      user_id:id
                    },
                },
                {
                  $addFields: {
                    priceNumeric: { $toDouble: '$price' }, 
                  },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$priceNumeric' },
                    count: { $sum: 1 } 
                  },
                },
              ]);

              const resultObject = priceSum.length > 0 ? priceSum[0] : { total: 0, count: 0 };

            res.status(200).json({data:resultObject})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

module.exports = {
    dashboard_all,
    dashboard_owner
}