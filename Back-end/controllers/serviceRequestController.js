const { Notification, Product, Seller, ServiceRequest, User } = require('../models');

const clientAttributes = ['id', 'email', 'firstName', 'lastName', 'phone', 'address', 'userType', 'createdAt', 'updatedAt'];
const sellerAttributes = ['id', 'businessName', 'description', 'logoUrl', 'hasHomeDelivery', 'hasPhysicalStore', 'businessAddress', 'businessHours', 'businessNotes', 'rating', 'isVerified'];
const validStatuses = ['pending', 'contacted', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled'];
const serviceRequestLink = '/service-requests';

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

const getUserLabel = (user) => {
  if (!user) {
    return 'Un usuario';
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || 'Un usuario';
};

const getServiceLabel = (serviceRequest) => serviceRequest.product?.name || 'tu servicio';

const createNotification = async ({ userId, title, message }) => {
  if (!userId) {
    return;
  }

  await Notification.create({
    userId,
    title,
    message,
    link: serviceRequestLink
  });
};

const notifySellerAboutNewRequest = async (serviceRequest) => {
  const seller = await Seller.findByPk(serviceRequest.sellerId);

  await createNotification({
    userId: seller?.userId,
    title: 'Nueva solicitud de servicio',
    message: `${getUserLabel(serviceRequest.client)} te envió una solicitud sobre ${getServiceLabel(serviceRequest)}.`
  });
};

const notifyClientAboutSellerUpdate = async (serviceRequest, previousStatus) => {
  const sellerName = serviceRequest.seller?.businessName || 'El proveedor';
  const serviceLabel = getServiceLabel(serviceRequest);
  const statusChanged = previousStatus !== serviceRequest.status;

  let title = 'Actualización en tu solicitud';
  let message = `${sellerName} actualizó tu solicitud de ${serviceLabel}.`;

  if (serviceRequest.status === 'quoted') {
    title = 'Cotización disponible';
    message = `${sellerName} cotizó tu solicitud de ${serviceLabel}${serviceRequest.quotedPrice != null ? ` por $ ${Number(serviceRequest.quotedPrice).toFixed(2)}` : ''}.`;
  } else if (serviceRequest.status === 'contacted') {
    title = 'Proveedor en contacto';
    message = `${sellerName} respondió tu solicitud de ${serviceLabel}.`;
  } else if (serviceRequest.status === 'closed') {
    title = 'Solicitud cerrada';
    message = `${sellerName} cerró la solicitud de ${serviceLabel}.`;
  } else if (serviceRequest.status === 'cancelled') {
    title = 'Solicitud cancelada';
    message = `${sellerName} canceló la solicitud de ${serviceLabel}.`;
  } else if (!statusChanged) {
    title = 'Nueva respuesta del proveedor';
    message = `${sellerName} actualizó la respuesta de tu solicitud de ${serviceLabel}.`;
  }

  await createNotification({
    userId: serviceRequest.clientUserId,
    title,
    message
  });
};

const notifySellerAboutClientDecision = async (serviceRequest) => {
  const seller = await Seller.findByPk(serviceRequest.sellerId);
  const clientLabel = getUserLabel(serviceRequest.client);
  const serviceLabel = getServiceLabel(serviceRequest);

  let title = 'Solicitud actualizada';
  let message = `${clientLabel} actualizó la solicitud de ${serviceLabel}.`;

  if (serviceRequest.status === 'accepted') {
    title = 'Cotización aceptada';
    message = `${clientLabel} aceptó la cotización de ${serviceLabel}.`;
  } else if (serviceRequest.status === 'rejected') {
    title = 'Cotización rechazada';
    message = `${clientLabel} rechazó la cotización de ${serviceLabel}.`;
  } else if (serviceRequest.status === 'cancelled') {
    title = 'Solicitud cancelada';
    message = `${clientLabel} canceló la solicitud de ${serviceLabel}.`;
  }

  await createNotification({
    userId: seller?.userId,
    title,
    message
  });
};

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

    await notifySellerAboutNewRequest(createdRequest);

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

      if (['accepted', 'rejected'].includes(status)) {
        return res.status(403).json({ message: 'La aceptación o rechazo de la cotización corresponde al cliente' });
      }
    } else if (req.userType === 'client') {
      if (serviceRequest.clientUserId !== req.userId) {
        return res.status(403).json({ message: 'Solo puedes actualizar tus propias solicitudes' });
      }

      const allowedClientStatuses = ['cancelled', 'accepted', 'rejected'];
      if (!allowedClientStatuses.includes(status)) {
        return res.status(403).json({ message: 'No tienes permisos para aplicar ese cambio de estado' });
      }

      if (['accepted', 'rejected'].includes(status) && serviceRequest.status !== 'quoted') {
        return res.status(400).json({ message: 'Solo puedes aceptar o rechazar una solicitud que ya fue cotizada' });
      }
    } else if (req.userType !== 'admin') {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta solicitud' });
    }

    const previousStatus = serviceRequest.status;
    const previousResponse = serviceRequest.providerResponse;
    const previousQuotedPrice = serviceRequest.quotedPrice;
    const updatePayload = { status };

    if (req.userType === 'seller') {
      updatePayload.providerResponse = providerResponse?.trim() || null;
      updatePayload.quotedPrice = parsedQuotedPrice;
    }

    await serviceRequest.update(updatePayload);

    const shouldNotifyClient = req.userType === 'seller' && (
      previousStatus !== serviceRequest.status
      || previousResponse !== serviceRequest.providerResponse
      || Number(previousQuotedPrice || 0) !== Number(serviceRequest.quotedPrice || 0)
    );

    if (shouldNotifyClient) {
      await notifyClientAboutSellerUpdate(serviceRequest, previousStatus);
    }

    if (req.userType === 'client' && previousStatus !== serviceRequest.status) {
      await notifySellerAboutClientDecision(serviceRequest);
    }

    res.json(serviceRequest);
  } catch (error) {
    next(error);
  }
};