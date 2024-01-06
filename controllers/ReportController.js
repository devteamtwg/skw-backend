const Client = require('../models/client')
const User = require('../models/user')
const Location = require('../models/location')
const Locationhl = require('../models/locationhl')
const Estimate = require('../models/estimate')
const Device = require('../models/device')
const Model = require('../models/model')


const report_all_clients = (req,res) => {
    let body = req.body
    
    
    run()
    async function run(){
        try{
            const clients = await Client.find(
                {
                    createdAt: {
                        $gte: body.from_date,
                        $lte: body.to_date
                    }
                }
                ).sort([['createdAt', 'descending']])         
            
            const clientLocationPromises = clients.map(async (client) => {
                const locations = await Locationhl.find({'user_id':client.user_id})
                return {
                    ...client._doc,
                    location_count: locations.length
                };
            });
            const clientsWithLocations = await Promise.all(clientLocationPromises)

            res.status(200).json({data:clientsWithLocations})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const report_client_activity = (req,res) => {
    let body = req.body
    
    
    run()
    async function run(){
        try{
            const clients = await Client.find().sort([['createdAt', 'descending']])         
            
            const clientEstimatePromises = clients.map(async (client) => {
                const Estimates = await Estimate.find(
                    {
                        'user_id':client.user_id,
                        createdAt: {
                            $gte: body.from_date,
                            $lte: body.to_date
                        }
                    }
                )
                return {
                    ...client._doc,
                    estimate_count: Estimates.length
                };
            });
            const clientsWithEstimates = await Promise.all(clientEstimatePromises)

            res.status(200).json({data:clientsWithEstimates})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const report_quote_request = (req,res) => {
    let body = req.body
    
    
    run()
    async function run(){
        try{
            let estimates = null

            if(body.delivery_option === "All"){
                estimates = await Estimate.find(
                    {
                        'user_id':body.user_id,
                        createdAt: {
                            $gte: body.from_date,
                            $lte: body.to_date
                        }
                    }
                    ).sort([['createdAt', 'descending']])   
            }
            else{
                estimates = await Estimate.find(
                    {
                        'user_id':body.user_id,
                        'delivery_option':body.delivery_option,
                        createdAt: {
                            $gte: body.from_date,
                            $lte: body.to_date
                        }
                    }
                    ).sort([['createdAt', 'descending']])   
            }
            

           
                const combinePromises = estimates.map(async (estimate) => {
                    const devices = await Device.findById(estimate.device_id)
                    const models = await Model.findById(estimate.model_id)

                    let locationid = 0
                    let location_name = ''

                    if(estimate.location_id !== ''){
                        locationid = estimate.location_id
                        const locations = await Locationhl.findOne({'hl_location_id':locationid})
    
                        
                        if(locations){
                            location_name = locations.hl_location_title
                        }
                    }

                    
                    return {
                        ...estimate._doc,
                        device_name: devices.title,
                        model_name: models.title,
                        location_name: location_name,
    
                    };
                });
                const combineEstimates = await Promise.all(combinePromises) 

                

            res.status(200).json({data:combineEstimates})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

const report_potential_revenue = (req,res) => {
    let body = req.body
    
    
    run()
    async function run(){
        try{
            let estimates = null
            let result = null
            let dates = []
            const priceSums = [];
           
            estimates = await Estimate.find(
                {
                    'user_id':body.user_id,
                    createdAt: {
                        $gte: body.from_date,
                        $lte: body.to_date
                    }
                }
            ).sort([['createdAt', 'descending']])   

            if(estimates){
                estimates.forEach((estimate) => {
                    const date = new Date(estimate.createdAt);
                    const formattedDate = date.toISOString().split('T')[0];

                    if (!dates.includes(formattedDate)) {
                        dates.push(formattedDate)
                     }
                });
            }

            for (const date of dates) {
                const startDate = new Date(date + 'T00:00:00.000Z');
                const endDate = new Date(date + 'T23:59:59.999Z');
                //endDate.setDate(endDate.getDate() + 1);
                
                
                const priceSum = await Estimate.aggregate([
                  {
                    $match: {
                      user_id:body.user_id,
                      createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                      },
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
                
                
                const sumObj = {
                    date: date,
                    sum: priceSum.length > 0 ? priceSum[0].total : 0,
                    count: priceSum.length > 0 ? priceSum[0].count : 0,
                };
              
                priceSums.push(sumObj);
    
              }
                

                
            res.status(200).json({data:priceSums})
        }
        catch(e){
            res.status(500).json({erro:'Something went wrong!!',message:e})
        }
    }
}

module.exports = {
    report_all_clients,
    report_client_activity,
    report_quote_request,
    report_potential_revenue
}