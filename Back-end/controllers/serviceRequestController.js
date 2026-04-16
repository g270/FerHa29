const { Notification, Product, Seller, ServiceRequest, User } = require('../models');

const clientAttributes = ['id', 'email', 'firstName', 'lastName', 'phone', 'address', 'userType', 'createdAt', 'updatedAt'];
const sellerAttributes = ['id', 'businessName', 'description', 'logoUrl', 'hasHomeDelivery', 'hasPhysicalStore', 'businessAddress', 'businessHours', 'businessNotes', 'rating', 'isVerified'];
const validStatuses = ['pending', 'contacted', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled'];
const validFulfillmentStatuses = ['pending_schedule', 'scheduled', 'in_progress', 'completed'];
const validServiceModes = ['domicilio', 'negocio', 'virtual'];
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

const getFulfillmentStatusLabel = (status) => {
  switch (status) {
    case 'pending_schedule':
      return 'pendiente de agenda';
    case 'scheduled':
      return 'agendado';
    case 'in_progress':
      return 'en progreso';
    case 'completed':
      return 'completado';
    default:
      return status;
  }
};

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
  } else if (serviceRequest.fulfillmentStatus === 'scheduled') {
    title = 'Cita programada';
    message = `${sellerName} programó tu servicio de ${serviceLabel}${serviceRequest.appointmentAt ? ` para ${new Date(serviceRequest.appointmentAt).toLocaleString('es-ES')}` : ''}.`;
  } else if (serviceRequest.fulfillmentStatus === 'in_progress') {
    title = 'Servicio en progreso';
    message = `${sellerName} marcó tu servicio de ${serviceLabel} como en progreso.`;
  } else if (serviceRequest.fulfillmentStatus === 'completed') {
    title = 'Servicio completado';
    message = `${sellerName} marcó tu servicio de ${serviceLabel} como completado.`;
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
    message = `${clientLabel} aceptó la cotización de ${serviceLabel}. Ya puedes programar la cita.`;
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
    const { status, providerResponse, quotedPrice, appointmentAt, serviceMode, serviceLocation, fulfillmentStatus, completionNotes, completionEvidence } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'El estado de la solicitud no es válido' });
    }

    const parsedQuotedPrice = quotedPrice === undefined || quotedPrice === null || quotedPrice === ''
      ? null
      : Number(quotedPrice);

    if (parsedQuotedPrice !== null && (Number.isNaN(parsedQuotedPrice) || parsedQuotedPrice < 0)) {
      return res.status(400).json({ message: 'El monto cotizado no es válido' });
    }

    const normalizedAppointmentAt = appointmentAt === undefined
      ? undefined
      : appointmentAt === null || appointmentAt === ''
        ? null
        : new Date(appointmentAt);

    if (normalizedAppointmentAt instanceof Date && Number.isNaN(normalizedAppointmentAt.getTime())) {
      return res.status(400).json({ message: 'La fecha y hora de la cita no es válida' });
    }

    const normalizedServiceMode = serviceMode === undefined ? undefined : serviceMode?.trim() || null;
    if (normalizedServiceMode && !validServiceModes.includes(normalizedServiceMode)) {
      return res.status(400).json({ message: 'La modalidad del servicio no es válida' });
    }

    const normalizedServiceLocation = serviceLocation === undefined ? undefined : serviceLocation?.trim() || null;
    const normalizedFulfillmentStatus = fulfillmentStatus === undefined ? undefined : fulfillmentStatus?.trim() || null;
    if (normalizedFulfillmentStatus && !validFulfillmentStatuses.includes(normalizedFulfillmentStatus)) {
      return res.status(400).json({ message: 'El seguimiento operativo del servicio no es válido' });
    }

    const normalizedCompletionNotes = completionNotes === undefined ? undefined : completionNotes?.trim() || null;
    const normalizedCompletionEvidence = completionEvidence === undefined ? undefined : completionEvidence?.trim() || null;

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

      if (['accepted', 'rejected'].includes(status) && status !== serviceRequest.status) {
        return res.status(403).json({ message: 'La aceptación o rechazo de la cotización corresponde al cliente' });
      }

      const hasSchedulingChanges = appointmentAt !== undefined
        || serviceMode !== undefined
        || serviceLocation !== undefined
        || fulfillmentStatus !== undefined
        || completionNotes !== undefined
        || completionEvidence !== undefined;

      const effectiveStatus = status || serviceRequest.status;
      if (hasSchedulingChanges && !['accepted', 'closed'].includes(effectiveStatus)) {
        return res.status(400).json({ message: 'Solo puedes agendar o dar seguimiento a una solicitud aceptada' });
      }

      const effectiveFulfillmentStatus = normalizedFulfillmentStatus || serviceRequest.fulfillmentStatus || (hasSchedulingChanges ? 'scheduled' : null);
      const effectiveAppointmentAt = normalizedAppointmentAt === undefined ? serviceRequest.appointmentAt : normalizedAppointmentAt;
      const effectiveServiceMode = normalizedServiceMode === undefined ? serviceRequest.serviceMode : normalizedServiceMode;
      const effectiveServiceLocation = normalizedServiceLocation === undefined ? serviceRequest.serviceLocation : normalizedServiceLocation;

      if (effectiveFulfillmentStatus === 'scheduled') {
        if (!effectiveAppointmentAt) {
          return res.status(400).json({ message: 'Debes indicar fecha y hora para dejar el servicio agendado' });
        }

        if (!effectiveServiceMode) {
          return res.status(400).json({ message: 'Debes indicar la modalidad del servicio para agendar la cita' });
        }
      }

      if (effectiveFulfillmentStatus === 'in_progress' && !serviceRequest.appointmentAt && normalizedAppointmentAt === undefined) {
        return res.status(400).json({ message: 'Debes programar primero la cita antes de iniciar el servicio' });
      }

      if (effectiveServiceMode && effectiveServiceMode !== 'virtual' && !effectiveServiceLocation) {
        return res.status(400).json({ message: 'Debes indicar la dirección o punto de encuentro del servicio' });
      }

      if (effectiveFulfillmentStatus === 'completed' && !normalizedCompletionNotes && !serviceRequest.completionNotes) {
        return res.status(400).json({ message: 'Debes registrar observaciones finales para completar el servicio' });
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

      if (appointmentAt !== undefined || serviceMode !== undefined || serviceLocation !== undefined || fulfillmentStatus !== undefined || completionNotes !== undefined || completionEvidence !== undefined) {
        return res.status(403).json({ message: 'Solo el proveedor puede agendar y dar seguimiento operativo al servicio' });
      }
    } else if (req.userType !== 'admin') {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta solicitud' });
    }

    const previousStatus = serviceRequest.status;
    const previousResponse = serviceRequest.providerResponse;
    const previousQuotedPrice = serviceRequest.quotedPrice;
    const previousAppointmentAt = serviceRequest.appointmentAt;
    const previousServiceMode = serviceRequest.serviceMode;
    const previousServiceLocation = serviceRequest.serviceLocation;
    const previousFulfillmentStatus = serviceRequest.fulfillmentStatus;
    const previousCompletionNotes = serviceRequest.completionNotes;
    const previousCompletionEvidence = serviceRequest.completionEvidence;
    const updatePayload = { status };

    if (req.userType === 'seller') {
      updatePayload.providerResponse = providerResponse?.trim() || null;
      updatePayload.quotedPrice = parsedQuotedPrice;

      if (normalizedAppointmentAt !== undefined) {
        updatePayload.appointmentAt = normalizedAppointmentAt;
      }

      if (normalizedServiceMode !== undefined) {
        updatePayload.serviceMode = normalizedServiceMode;
      }

      if (normalizedServiceLocation !== undefined) {
        updatePayload.serviceLocation = normalizedServiceLocation;
      }

      if (normalizedFulfillmentStatus !== undefined) {
        updatePayload.fulfillmentStatus = normalizedFulfillmentStatus;
      } else if (
        status === 'accepted'
        && (normalizedAppointmentAt !== undefined || normalizedServiceMode !== undefined || normalizedServiceLocation !== undefined)
      ) {
        updatePayload.fulfillmentStatus = 'scheduled';
      }

      if (normalizedCompletionNotes !== undefined) {
        updatePayload.completionNotes = normalizedCompletionNotes;
      }

      if (normalizedCompletionEvidence !== undefined) {
        updatePayload.completionEvidence = normalizedCompletionEvidence;
      }

      if (updatePayload.fulfillmentStatus === 'completed' || status === 'closed') {
        updatePayload.fulfillmentStatus = 'completed';
        updatePayload.status = 'closed';
      }
    }

    if (req.userType === 'client' && status === 'accepted' && !serviceRequest.fulfillmentStatus) {
      updatePayload.fulfillmentStatus = 'pending_schedule';
    }

    await serviceRequest.update(updatePayload);

    const shouldNotifyClient = req.userType === 'seller' && (
      previousStatus !== serviceRequest.status
      || previousResponse !== serviceRequest.providerResponse
      || Number(previousQuotedPrice || 0) !== Number(serviceRequest.quotedPrice || 0)
      || String(previousAppointmentAt || '') !== String(serviceRequest.appointmentAt || '')
      || String(previousServiceMode || '') !== String(serviceRequest.serviceMode || '')
      || String(previousServiceLocation || '') !== String(serviceRequest.serviceLocation || '')
      || String(previousFulfillmentStatus || '') !== String(serviceRequest.fulfillmentStatus || '')
      || String(previousCompletionNotes || '') !== String(serviceRequest.completionNotes || '')
      || String(previousCompletionEvidence || '') !== String(serviceRequest.completionEvidence || '')
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