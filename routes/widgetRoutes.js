const express = require('express')
const router = express.Router() 
const widgetController = require('../controllers/WidgetController')


router.get('/:id',widgetController.widget_all)
router.patch('/:id',widgetController.widget_update)

module.exports = router