const { Seller, Product, User } = require('../models');

const publicUserAttributes = ['id', 'email', 'firstName', 'lastName', 'phone', 'address', 'userType', 'createdAt', 'updatedAt'];

exports.listSellers = async (req, res, next) => {
  try {
    const sellers = await Seller.findAll({
      include: [{ model: User, as: 'user', attributes: publicUserAttributes }]
    });
    res.json(sellers);
  } catch (error) {
    next(error);
  }
};

exports.getSellerById = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: publicUserAttributes },
        { model: Product, as: 'products' }
      ]
    });
    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }
    res.json(seller);
  } catch (error) {
    next(error);
  }
};

exports.createSeller = async (req, res, next) => {
  try {
    const seller = await Seller.create(req.body);
    res.status(201).json(seller);
  } catch (error) {
    next(error);
  }
};

exports.updateSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.params.id);
    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }

    if (req.userType !== 'admin' && seller.userId !== req.userId) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar este perfil de negocio' });
    }

    await seller.update(req.body);
    res.json(seller);
  } catch (error) {
    next(error);
  }
};

exports.getSellerProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({ where: { sellerId: req.params.id } });
    res.json(products);
  } catch (error) {
    next(error);
  }
};
