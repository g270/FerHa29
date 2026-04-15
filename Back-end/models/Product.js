module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true
    },
    offerPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dispatchLocation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deliveryType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'retiro'
    },
    itemType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'producto'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0
    }
  });
};
