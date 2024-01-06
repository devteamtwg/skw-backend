const express = require('express')
const router = express.Router()
const authController = require('../controllers/AuthController')


router.post('/login',authController.user_login)
router.post('/logout',authController.user_logout)
router.post('/forgetpassword',authController.forget_password)
router.post('/resetpassword',authController.reset_password)

module.exports = router