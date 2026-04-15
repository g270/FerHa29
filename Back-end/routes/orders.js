const express = require('express');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/authentication');

const router = express.Router();

router.get('/', authenticate, orderController.listOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.post('/', authenticate, orderController.createOrder);
router.put('/:id/status', authenticate, orderController.updateOrderStatus);

module.exports = router;
