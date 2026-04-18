const { Sequelize, SellerReview, Seller, User, OrderItem, Order, Product, ServiceRequest, sequelize } = require('../models');

const { Op } = Sequelize;

const reviewerAttributes = ['id', 'firstName', 'lastName'];

const normalizeRating = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const refreshSellerRating = async (sellerId) => {
  const averageRating = await SellerReview.aggregate('rating', 'avg', {
    where: { sellerId }
  });

  const normalizedAverage = Number(Number(averageRating || 0).toFixed(2));
  await Seller.update(
    { rating: normalizedAverage },
    { where: { id: sellerId } }
  );

  return normalizedAverage;
};

const hasVerifiedTransaction = async (userId, sellerId) => {
  const deliveredOrder = await OrderItem.findOne({
    attributes: ['id'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          userId,
          status: 'delivered'
        }
      },
      {
        model: Product,
        as: 'product',
        attributes: [],
        where: { sellerId }
      }
    ]
  });

  if (deliveredOrder) {
    return true;
  }

  const completedServiceRequest = await ServiceRequest.findOne({
    attributes: ['id'],
    where: {
      clientUserId: userId,
      sellerId,
      [Op.or]: [
        { fulfillmentStatus: 'completed' },
        { status: 'closed' }
      ]
    }
  });

  return Boolean(completedServiceRequest);
};

exports.listSellerReviews = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.params.id, {
      attributes: ['id', 'rating']
    });

    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }

    const reviews = await SellerReview.findAll({
      where: { sellerId: seller.id },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: reviewerAttributes
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      items: reviews,
      summary: {
        averageRating: normalizeRating(seller.rating),
        totalReviews: reviews.length,
        verifiedReviews: reviews.filter((review) => review.isVerifiedTransaction).length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.saveSellerReview = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.params.id);
    if (!seller) {
      return res.status(404).json({ message: 'Vendedor no encontrado' });
    }

    if (seller.userId === req.userId) {
      return res.status(403).json({ message: 'No puedes reseñar tu propio negocio' });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    const verifiedTransaction = await hasVerifiedTransaction(req.userId, seller.id);

    const existingReview = await SellerReview.findOne({
      where: {
        sellerId: seller.id,
        userId: req.userId
      }
    });

    let review;
    let created = false;

    if (existingReview) {
      review = await existingReview.update({
        rating,
        comment,
        isVerifiedTransaction: verifiedTransaction
      });
    } else {
      review = await SellerReview.create({
        sellerId: seller.id,
        userId: req.userId,
        rating,
        comment,
        isVerifiedTransaction: verifiedTransaction
      });
      created = true;
    }

    const averageRating = await refreshSellerRating(seller.id);

    const storedReview = await SellerReview.findByPk(review.id, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: reviewerAttributes
        }
      ]
    });

    const totalReviews = await SellerReview.count({ where: { sellerId: seller.id } });
    const verifiedReviews = await SellerReview.count({ where: { sellerId: seller.id, isVerifiedTransaction: true } });

    res.status(created ? 201 : 200).json({
      message: created ? 'Reseña creada correctamente' : 'Reseña actualizada correctamente',
      review: storedReview,
      summary: {
        averageRating,
        totalReviews,
        verifiedReviews
      }
    });
  } catch (error) {
    next(error);
  }
};