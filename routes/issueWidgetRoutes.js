const express = require('express')
const router = express.Router()
const issueWidgetController = require('../controllers/IssueWidgetController')



router.get('/:id',issueWidgetController.issue_all)
router.get('/:id',issueWidgetController.issue_detail)
router.post('/',issueWidgetController.issue_create)
router.patch('/:id',issueWidgetController.issue_update)
router.delete('/:id',issueWidgetController.issue_delete)


module.exports = router 