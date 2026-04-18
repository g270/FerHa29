const express = require('express');
const { body, validationResult } = require('express-validator');
const sellerController = require('../controllers/sellerController');
const reviewController = require('../controllers/reviewController');
const authentication = require('../middleware/authentication');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			message: 'Errores de validación',
			errors: errors.array()
		});
	}
	next();
};

const reviewValidations = [
	body('rating')
		.isInt({ min: 1, max: 5 })
		.withMessage('La calificación debe estar entre 1 y 5'),
	body('comment')
		.trim()
		.isLength({ min: 10, max: 1000 })
		.withMessage('El comentario debe tener entre 10 y 1000 caracteres')
];

router.get('/', sellerController.listSellers);
router.get('/:id', sellerController.getSellerById);
router.get('/:id/reviews', reviewController.listSellerReviews);
router.post('/', sellerController.createSeller);
router.put('/:id', authentication, sellerController.updateSeller);
router.post('/:id/reviews', authentication, reviewValidations, handleValidationErrors, reviewController.saveSellerReview);
router.get('/:id/products', sellerController.getSellerProducts);

module.exports = router;
