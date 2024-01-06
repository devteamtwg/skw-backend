const express = require("express")
const router = express.Router()

const permissionController = require('../controllers/PermissionController')


router.get('/:id',permissionController.permission_detail)
router.patch('/:id',permissionController.permission_update)

module.exports = router