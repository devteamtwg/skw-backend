const express = require('express')
const router = express.Router()
const reportController = require('../controllers/ReportController')


router.post('/report_all_clients/',reportController.report_all_clients)
router.post('/report_client_activity/',reportController.report_client_activity)
router.post('/report_quote_request/',reportController.report_quote_request)
router.post('/report_potential_revenue/',reportController.report_potential_revenue)
// router.post('/',reportController.report_create)
// router.patch('/:id',reportController.report_update)
// router.delete('/:id',reportController.report_delete)

module.exports = router