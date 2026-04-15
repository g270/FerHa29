const { Product, Seller, ServiceRequest, User } = require('../models');

const clientAttributes = ['id', 'email', 'firstName', 'lastName', 'phone', 'address', 'userType', 'createdAt', 'updatedAt'];
const sellerAttributes = ['id', 'businessName', 'description', 'logoUrl', 'hasHomeDelivery', 'hasPhysicalStore', 'businessAddress', 'businessHours', 'businessNotes', 'rating', 'isVerified'];
const validStatuses = ['pending', 'contacted', 'quoted', 'closed', 'cancelled'];

const buildInclude = () => ([
  {
    model: Product,
    as: 'product',
    include: [{ model: Seller, as: 'seller', attributes: sellerAttributes }]
  },
  { model: Seller, as: 'seller', attributes: sellerAttributes },
  { model: User, as: 'client', attributes: clientAttributes }
]);

const getSellerProfile = async (userId) => Seller.findOne({ where: { userId } });

exports.listServiceRequests = async (req, res, next) => {
  try {
    const where = {};

    if (req.userType === 'client') {
      where.clientUserId = req.userId;
    }

    if (req.userType === 'seller') {
      const sellerProfile = await getSellerProfile(req.userId);
      if (!sellerProfile) {
        return res.json([]);
      }

      where.sellerId = sellerProfile.id;
    }

    const serviceRequests = await ServiceRequest.findAll({
      where,
      include: buildInclude(),
      order: [['createdAt', 'DESC']]
    });

    res.json(serviceRequests);
  } catch (error) {
    next(error);
  }
};

exports.createServiceRequest = async (req, res, next) => {
  try {
    if (!['client', 'admin'].includes(req.userType)) {
      return res.status(403).json({ message: 'Solo los clientes pueden solicitar servicios' });
    }

    const { productId, message, preferredSchedule } = req.body;

    if (!productId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Debes indicar el servicio y una descripción de la solicitud' });
    }

    const product = await Product.findByPk(productId, {
      include: [{ model: Seller, as: 'seller', attributes: sellerAttributes }]
    });

    if (!product || product.isActive === false) {
      return res.status(404).json({ message: 'El servicio solicitado ya no está disponible' });
    }

    if ((product.itemType || 'producto') !== 'servicio') {
      return res.status(400).json({ message: 'Solo puedes crear solicitudes sobre publicaciones de tipo servicio' });
    }

    const serviceRequest = await ServiceRequest.create({
      clientUserId: req.userId,
      sellerId: product.sellerId,
      productId: product.id,
      message: message.trim(),
      preferredSchedule: preferredSchedule?.trim() || null,
      status: 'pending'
    });

    const createdRequest = await ServiceRequest.findByPk(serviceRequest.id, {
      include: buildInclude()
    });

    res.status(201).json(createdRequest);
  } catch (error) {
    next(error);
  }
};

exports.updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { status, providerResponse, quotedPrice } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'El estado de la solicitud no es válido' });
    }

    const parsedQuotedPrice = quotedPrice === undefined || quotedPrice === null || quotedPrice === ''
      ? null
      : Number(quotedPrice);

    if (parsedQuotedPrice !== null && (Number.isNaN(parsedQuotedPrice) || parsedQuotedPrice < 0)) {
      return res.status(400).json({ message: 'El monto cotizado no es válido' });
    }

    const serviceRequest = await ServiceRequest.findByPk(req.params.id, {
      include: buildInclude()
    });

    if (!serviceRequest) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (req.userType === 'seller') {
      const sellerProfile = await getSellerProfile(req.userId);
      if (!sellerProfile || serviceRequest.sellerId !== sellerProfile.id) {
        return res.status(403).json({ message: 'No puedes actualizar solicitudes de otro proveedor' });
      }

      if (status === 'quoted' && parsedQuotedPrice === null) {
        return res.status(400).json({ message: 'Debes indicar un monto cotizado para marcar la solicitud como cotizada' });
      }
    } else if (req.userType === 'client') {
      if (serviceRequest.clientUserId !== req.userId || status !== 'cancelled') {
        return res.status(403).json({ message: 'Solo puedes cancelar tus propias solicitudes' });
      }
    } else if (req.userType !== 'admin') {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta solicitud' });
    }

    const updatePayload = { status };

    if (req.userType === 'seller') {
      updatePayload.providerResponse = providerResponse?.trim() || null;
      updatePayload.quotedPrice = parsedQuotedPrice;
    }

    await serviceRequest.update(updatePayload);
    res.json(serviceRequest);
  } catch (error) {
    next(error);
  }
};