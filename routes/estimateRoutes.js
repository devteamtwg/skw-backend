const express = require('express')
const router = express.Router()
const estimateController = require('../controllers/EstimateController')


router.get('/:id',estimateController.estimate_all)
router.get('/:id',estimateController.estimate_detail)
router.post('/',estimateController.estimate_create)
// router.patch('/:id',estimateController.estimate_update)
// router.delete('/:id',estimateController.estimate_delete)

module.exports = router