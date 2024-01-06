const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/DashboardController')


router.get('/',dashboardController.dashboard_all)
router.get('/owner/:id',dashboardController.dashboard_owner)


module.exports = router