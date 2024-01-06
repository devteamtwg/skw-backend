const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')


router.get('/',userController.user_all)
router.get('/:id',userController.user_detail)
router.post('/',userController.user_create)
router.patch('/:id',userController.user_update)
router.delete('/:id',userController.user_delete)

module.exports = router