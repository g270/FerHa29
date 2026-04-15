module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Seller', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hasHomeDelivery: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    hasPhysicalStore: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    businessAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    businessHours: {
      type: DataTypes.STRING,
      allowNull: true
    },
    businessNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });
};
