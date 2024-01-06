const User = require('../models/user')
const Role = require('../models/role')
const Permission = require('../models/permission')
const Token = require('../models/token')
const bcrypt = require('bcrypt')
const crypto = require("crypto")
const sendEmail = require("../utils/email/sendEmail")

const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()

const Maintenance = require('../models/maintenance')

const user_login = (req,res) => {
    let { email, password } = req.body 
    
    run()
    async function run(){
        try{            
            const maintenance = await Maintenance.findOne()
            
           
           
                const users = await User.login(email,password)

                if(users.status !== "Enabled"){
                    res.status(500).json({error:'Your account has been disabled. Please contact admin!',message:'Your account has been disabled. Please contact admin!!'})
                }
                else{

                    if(maintenance.status !== "Live" && users.role !== "65114858a02af251afef7205"){
                        res.status(500).json({error:'The portal is in maintenance mode. Please try later!',message:'The portal is in maintenance mode. Please try later!!!'})
                    }
                    else{
                        const role = await Role.findById(users.role)     

                        const permissions = await Permission.findOne({'role_id':users.role})     
            
                        
                        const usersObject = users.toObject();
                        usersObject.role_name = role.title
                        usersObject.permissions = permissions
            
                        
            
                        const token = createToken(users._id)
                        res.cookie('jwt',token,{maxAge:maxAge*1000})
            
                        res.status(200).json({data:usersObject,token:token,error:''})
                    }
                    
                }
            
        }
        catch(e){
            console.log(e.message)
            res.status(500).json({error:'Something went wrong!!',message:e.message})
        }
    }
}

const user_logout = (req,res) => {
    res.cookie('jwt','',{maxAge:1})
    res.status(200).json({})
}

const forget_password = (req,res) => {
    let { email } = req.body 

    
    run()
    async function run(){
        try{            
            const user = await User.findOne({'email':email})
            
            if(user){
                let token = await Token.findOne({ userId: user._id })
                if(token){
                    await Token.deleteOne()
                }
                    
                let resetToken = crypto.randomBytes(32).toString("hex")
                
                const bcryptSalt = await bcrypt.genSalt()
                const hash = await bcrypt.hash(resetToken, Number(bcryptSalt))
                
                const tokenData = {
                        userId: user._id,
                        token: hash,
                        createdAt: Date.now(),
                }

                const tokenss = await Token.create(tokenData) 

                const clientURL = process.env.FRONT_URL
                const link = `${clientURL}/reset_password?token=${resetToken}&id=${user._id}`
                
                const respo = sendEmail(user.email,"Password Reset Request",{name: user.name,link: link,},"../template/requestResetPassword.handlebars")
                
                res.status(200).json({data:link,error:''})
            }
            else{
                res.status(200).json({data:null,error:'Something went wrong, Please try again!!'})
            }
           
            //res.status(200).json({data:null,error:'Something went wrong, Please try again!!'})
            
        }
        catch(e){
            console.log(e.message)
            res.status(500).json({error:'Something went wrong!!',message:e.message})
        }
    }
}

const reset_password = (req,res) => {
    let { password,userid,token } = req.body 

    
    run()
    async function run(){
        try{            
            let passwordResetToken = await Token.findOne({ userId: userid })
            if(passwordResetToken){
                const isValid = await bcrypt.compare(token, passwordResetToken.token)
                if(isValid){
                    
                    await User.updateOne(
                        { _id: userid },
                        { $set: { password: password } },
                        { new: true }
                    )

                    const user = await User.findById({ _id: userid });
                    sendEmail(
                        user.email,
                        "Password Reset Successfully",
                        {
                        name: user.name,
                        },
                        "../template/resetPassword.handlebars"
                    );
                    await passwordResetToken.deleteOne()
                    res.status(200).json({data:true,error:''})
                }
                else{
                    res.status(200).json({data:null,error:'Your password reset token is not valid!!'})
                }
            }
            else{
                res.status(200).json({data:null,error:'Your password reset token has been expired!!'})
            }
           
            //res.status(200).json({data:null,error:'Something went wrong, Please try again!!'})
            
        }
        catch(e){
            console.log(e.message)
            res.status(500).json({error:'Something went wrong!!',message:e.message})
        }
    }
}


const maxAge = 3*24*60*60
const createToken = (id) => {
    return jwt.sign({id},process.env.SIGNATURE,{
        expiresIn:maxAge
    })
}

module.exports = {
    user_login,
    user_logout,
    forget_password,
    reset_password
}