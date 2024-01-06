const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv').config()
const cookieParser = require('cookie-parser')
const { requireAuth } = require('./middleware/authMiddleware')
const cors = require('cors')
const app = express()

const path = require('path')
const uploadDirectory = path.join(__dirname, 'uploads')

//Connection 
main()
async function main() {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING) 
        console.log("Connected to Mongo Successfully");
    } catch (error) {
        console.log(error.message);
    }
}

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log("Connection established at port 3000.")
})


//Middleware
app.use(express.static('public'))
app.use(express.json())
app.use(cookieParser())
app.use(cors())
app.use('/uploads', express.static(uploadDirectory))

//Routes
const authRoutes = require('./routes/authRoutes')
const publicRoutes = require('./routes/publicRoutes')

const userRoutes = require('./routes/userRoutes')
const profileRoutes = require('./routes/profileRoutes')
const roleRoutes = require('./routes/roleRoutes')
const permissionRoutes = require('./routes/permissionRoutes')
const settingRoutes = require('./routes/settingRoutes')
const maintenanceRoutes = require('./routes/maintenanceRoutes')
const clientRoutes = require('./routes/clientRoutes')
const deviceRoutes = require('./routes/deviceRoutes')
const modelRoutes = require('./routes/modelRoutes')
const issueRoutes = require('./routes/issueRoutes')
const locationRoutes = require('./routes/locationRoutes')
const customerRoutes = require('./routes/customerRoutes')
const issueWidgetRoutes = require('./routes/issueWidgetRoutes')
const widgetRoutes = require('./routes/widgetRoutes')
const estimateRoutes = require('./routes/estimateRoutes')
const reportRoutes = require('./routes/reportRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')


app.use('/v1/',authRoutes)
app.use('/v1/widgetspublic',publicRoutes)

app.use('/v1/users',requireAuth,userRoutes)
app.use('/v1/profile',requireAuth,profileRoutes)
app.use('/v1/roles',requireAuth,roleRoutes)
app.use('/v1/permissions',requireAuth,permissionRoutes)
app.use('/v1/settings',requireAuth,settingRoutes)
app.use('/v1/maintenance',requireAuth,maintenanceRoutes)
app.use('/v1/clients',requireAuth,clientRoutes)
app.use('/v1/devices',requireAuth,deviceRoutes)
app.use('/v1/models',requireAuth,modelRoutes)
app.use('/v1/issues',requireAuth,issueRoutes)
app.use('/v1/locations',requireAuth,locationRoutes)
app.use('/v1/customers',requireAuth,customerRoutes)
app.use('/v1/issueswidget',requireAuth,issueWidgetRoutes)
app.use('/v1/widgets',requireAuth,widgetRoutes)
app.use('/v1/estimates',requireAuth,estimateRoutes)
app.use('/v1/reports',requireAuth,reportRoutes)
app.use('/v1/dashboard',requireAuth,dashboardRoutes)

