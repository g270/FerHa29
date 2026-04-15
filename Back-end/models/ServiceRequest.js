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
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    }
  });
};