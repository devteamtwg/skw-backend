const mongoose = require('mongoose')
const { isEmail } = require('validator')
const bcrypt = require('bcrypt')


const userSchema = mongoose.Schema({

    name:String,
    email:{
        type:String,
        required:[true,'Please enter an email'],
        unique:true,
        lowercase:true,
        validate:[isEmail,'Please enter a valid email']
    },
    password:{
        type:String,
        required:[true,'Please enter a password minimum of 8 characters'],
        minLength:[8,'Please enter a password minimum of 8 characters']
    },
    role:String,
    img:String,
    status:String
},
{
    timestamps: true
})

userSchema.pre('save',async function(next){

    if(this.isNew){
        const salt = await bcrypt.genSalt()
        this.password = await bcrypt.hash(this.password,salt)
    }

    next()
})

userSchema.pre('updateOne',async function(next){

    const updates = this.getUpdate();
    
    if(updates.$set && updates.$set.password){
        const salt = await bcrypt.genSalt()
        updates.$set.password = await bcrypt.hash(updates.$set.password,salt)
    }

    next()
})

userSchema.statics.login = async function(email,password){
    const user = await this.findOne({email})
    
    if(user){
        if(user.status === "Enabled"){
            const auth = await bcrypt.compare(password,user.password)
            if(auth){
                return user
            }
            throw Error('Incorrect Password!!')
        }
        throw Error('Your account is not activated. Please contact admin.')
    }
    throw Error("Incorrect Email!!")
}

module.exports = mongoose.model('User', userSchema)