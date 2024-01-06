const express = require('express')
const router = express.Router()
const locationController = require('../controllers/LocationController')


router.get('/:id',locationController.location_all)
router.get('/:id',locationController.location_detail)
router.post('/',locationController.location_create)
router.patch('/:id',locationController.location_update)
router.delete('/:id',locationController.location_delete)

router.get('/hldata/:id',locationController.hl_all)
router.post('/hldata/',locationController.hl_data)
router.patch('/hldata/cid/:id',locationController.hl_data_cid)


module.exports = router