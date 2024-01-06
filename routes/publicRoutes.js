const express = require('express')
const router = express.Router()
const publicController = require('../controllers/PublicController')


router.get('/:id',publicController.widget_all)
router.post('/',publicController.estimate_create)
router.patch('/hldata/reftoken/:id',publicController.hl_data_reftoken)

module.exports = router 