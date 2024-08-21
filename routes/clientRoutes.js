const express = require('express')
const router = express.Router()
const clientController = require('../controllers/ClientController')


router.get('/',clientController.client_all)
router.get('/:id',clientController.client_detail)
router.post('/',clientController.client_create)
router.patch('/:id',clientController.client_update)
router.delete('/:id',clientController.client_delete)

module.exports = router