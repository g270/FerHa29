const express = require('express');
const authenticate = require('../middleware/authentication');
const serviceRequestController = require('../controllers/serviceRequestController');

const router = express.Router();

router.get('/', authenticate, serviceRequestController.listServiceRequests);
router.post('/', authenticate, serviceRequestController.createServiceRequest);
router.put('/:id/status', authenticate, serviceRequestController.updateServiceRequestStatus);

module.exports = router;