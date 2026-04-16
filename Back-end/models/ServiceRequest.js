module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ServiceRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    clientUserId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    preferredSchedule: {
      type: DataTypes.STRING,
      allowNull: true
    },
    providerResponse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quotedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    appointmentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    serviceMode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    serviceLocation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fulfillmentStatus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    completionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completionEvidence: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    }
  });
};