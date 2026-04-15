const { Product, Category, Seller } = require('../models');

exports.listProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category' },
        { model: Seller, as: 'seller' }
      ]
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Seller, as: 'seller' }
      ]
    });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    if (!['seller', 'admin'].includes(req.userType)) {
      return res.status(403).json({ message: 'Solo los proveedores pueden crear productos' });
    }

    const sellerProfile = await Seller.findOne({ where: { userId: req.userId } });
    if (!sellerProfile) {
      return res.status(400).json({ message: 'No existe un perfil de vendedor asociado a esta cuenta' });
    }

    const product = await Product.create({
      ...req.body,
      sellerId: sellerProfile.id
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (!['seller', 'admin'].includes(req.userType)) {
      return res.status(403).json({ message: 'No tienes permisos para editar este producto' });
    }

    const sellerProfile = await Seller.findOne({ where: { userId: req.userId } });
    const isOwner = sellerProfile && product.sellerId === sellerProfile.id;
    if (req.userType !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'No puedes editar productos de otro proveedor' });
    }

    await product.update({
      ...req.body,
      sellerId: product.sellerId
    });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (!['seller', 'admin'].includes(req.userType)) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este producto' });
    }

    const sellerProfile = await Seller.findOne({ where: { userId: req.userId } });
    const isOwner = sellerProfile && product.sellerId === sellerProfile.id;
    if (req.userType !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'No puedes eliminar productos de otro proveedor' });
    }

    await product.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
