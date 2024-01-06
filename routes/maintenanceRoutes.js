const express = require('express')
const router = express.Router()
const maintenanceController = require('../controllers/MaintenanceController')


router.get('/',maintenanceController.maintenance_all)
router.patch('/:id',maintenanceController.maintenance_update)

module.exports = router