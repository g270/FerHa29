const express = require('express');
const sellerController = require('../controllers/sellerController');
const authentication = require('../middleware/authentication');

const router = express.Router();

router.get('/', sellerController.listSellers);
router.get('/:id', sellerController.getSellerById);
router.post('/', sellerController.createSeller);
router.put('/:id', authentication, sellerController.updateSeller);
router.get('/:id/products', sellerController.getSellerProducts);

module.exports = router;
