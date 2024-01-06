const express = require('express')
const router = express.Router()
const roleController = require('../controllers/RoleController')


router.get('/',roleController.role_all)
router.get('/:id',roleController.role_detail)
router.post('/',roleController.role_create)
router.patch('/:id',roleController.role_update)
router.delete('/:id',roleController.role_delete)

module.exports = router