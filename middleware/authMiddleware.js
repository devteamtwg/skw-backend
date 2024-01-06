const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()


const requireAuth = (req,res,next) => {

    const authHeader = req.headers.authorization
    let token = ""

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
    }
    
    
    
    if(token){
        jwt.verify(token, process.env.SIGNATURE, (err, decodedToken) => {
            if(err){
                console.log(err)
                res.status(500).json({error:'Something went wrong.Please provide the valid authentication token!!'})
            }
            else{
                console.log(decodedToken)
                next()
            }
        })
    }
    else{
        res.status(500).json({error:'Something went wrong.Please provide the valide authentication token!!'})
    }
}

module.exports = { requireAuth }