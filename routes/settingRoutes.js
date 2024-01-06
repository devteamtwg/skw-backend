const express = require('express')
const router = express.Router() 
const settingController = require('../controllers/SettingController')


router.get('/',settingController.setting_all)
router.patch('/:id',settingController.setting_update)

module.exports = router