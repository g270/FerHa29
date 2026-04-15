const { Order, OrderItem, Product, Seller, sequelize } = require('../models');

const getEffectiveProductPrice = (product) => {
  const regularPrice = Number(product.price || 0);
  const promotionalPrice = Number(product.offerPrice || 0);

  if (promotionalPrice > 0 && promotionalPrice < regularPrice) {
    return promotionalPrice;
  }

  return regularPrice;
};

const buildOrderInclude = (sellerId) => {
  if (sellerId) {
    return [
      {
        model: OrderItem,
        as: 'items',
        required: true,
        include: [
          {
            model: Product,
            as: 'product',
            required: true,
            where: { sellerId }
          }
        ]
      }
    ];
  }

  return [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }];
};

const getSellerProfile = async (userId) => Seller.findOne({ where: { userId } });

exports.listOrders = async (req, res, next) => {
  try {
    let where = {};
    let include = buildOrderInclude();

    if (req.userType === 'client') {
      where.userId = req.userId;
    }

    if (req.userType === 'seller') {
      const sellerProfile = await getSellerProfile(req.userId);
      if (!sellerProfile) {
        return res.json([]);
      }
      include = buildOrderInclude(sellerProfile.id);
    }

    const orders = await Order.findAll({ where, include, order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    let where = { id: req.params.id };
    let include = buildOrderInclude();

    if (req.userType === 'client') {
      where.userId = req.userId;
    }

    if (req.userType === 'seller') {
      const sellerProfile = await getSellerProfile(req.userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
      include = buildOrderInclude(sellerProfile.id);
    }

    const order = await Order.findOne({ where, include });
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, items } = req.body;
    if (!req.userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Datos de orden inválidos' });
    }

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity)
    }));

    const hasInvalidItem = normalizedItems.some(
      (item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0
    );

    if (hasInvalidItem) {
      return res.status(400).json({ message: 'Los productos enviados no son válidos' });
    }

    const groupedQuantities = normalizedItems.reduce((accumulator, item) => {
      accumulator[item.productId] = (accumulator[item.productId] || 0) + item.quantity;
      return accumulator;
    }, {});

    const productIds = Object.keys(groupedQuantities);
    const products = await Product.findAll({ where: { id: productIds } });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'Uno o más productos ya no están disponibles' });
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const productId of productIds) {
      const product = productMap.get(productId);
      const requestedQuantity = groupedQuantities[productId];

      if (!product || product.isActive === false) {
        return res.status(400).json({ message: 'Uno o más productos no están disponibles para la venta' });
      }

      if ((product.itemType || 'producto') === 'servicio') {
        return res.status(400).json({ message: `El servicio ${product.name} debe coordinarse directamente con el proveedor y no puede comprarse desde el carrito` });
      }

      if (Number(product.stock || 0) < requestedQuantity) {
        return res.status(400).json({ message: `Stock insuficiente para ${product.name}` });
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const orderItemsPayload = normalizedItems.map((item) => {
        const product = productMap.get(item.productId);
        const unitPrice = getEffectiveProductPrice(product);

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity
        };
      });

      const totalAmount = orderItemsPayload.reduce((sum, item) => sum + item.subtotal, 0);

      const order = await Order.create(
        {
          userId: req.userId,
          shippingAddress: shippingAddress || 'Pendiente por confirmar',
          totalAmount
        },
        { transaction }
      );

      await OrderItem.bulkCreate(
        orderItemsPayload.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        { transaction }
      );

      for (const productId of productIds) {
        const product = productMap.get(productId);
        const requestedQuantity = groupedQuantities[productId];
        await product.update(
          { stock: Number(product.stock || 0) - requestedQuantity },
          { transaction }
        );
      }

      await transaction.commit();

      const orderWithItems = await Order.findByPk(order.id, {
        include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
      });

      res.status(201).json(orderWithItems);
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    let where = { id: req.params.id };
    let include = [];

    if (req.userType === 'seller') {
      const sellerProfile = await getSellerProfile(req.userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
      include = buildOrderInclude(sellerProfile.id);
    }

    if (req.userType === 'client') {
      return res.status(403).json({ message: 'No tienes permisos para actualizar el estado de la orden' });
    }

    const order = include.length > 0
      ? await Order.findOne({ where, include })
      : await Order.findOne({ where });

    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }
    await order.update({ status: req.body.status });
    res.json(order);
  } catch (error) {
    next(error);
  }
};
