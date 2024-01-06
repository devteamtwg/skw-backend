const express = require('express')
const router = express.Router()
const customerController = require('../controllers/CustomerController')


router.get('/:id',customerController.customer_all)
router.get('/:id',customerController.customer_detail)
router.patch('/:id',customerController.customer_update)
router.delete('/:id',customerController.customer_delete)

module.exports = router