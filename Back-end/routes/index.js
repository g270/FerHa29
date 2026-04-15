const express = require('express');
const productsRouter = require('./products');
const sellersRouter = require('./sellers');
const categoriesRouter = require('./categories');
const ordersRouter = require('./orders');
const usersRouter = require('./users');

const router = express.Router();

router.use('/products', productsRouter);
router.use('/sellers', sellersRouter);
router.use('/categories', categoriesRouter);
router.use('/orders', ordersRouter);
router.use('/users', usersRouter);

module.exports = router;
