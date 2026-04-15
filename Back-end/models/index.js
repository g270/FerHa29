const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User')(sequelize, Sequelize.DataTypes);
const Seller = require('./Seller')(sequelize, Sequelize.DataTypes);
const Category = require('./Category')(sequelize, Sequelize.DataTypes);
const Product = require('./Product')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);
const OrderItem = require('./OrderItem')(sequelize, Sequelize.DataTypes);
const ServiceRequest = require('./ServiceRequest')(sequelize, Sequelize.DataTypes);
const Notification = require('./Notification')(sequelize, Sequelize.DataTypes);

User.hasOne(Seller, { foreignKey: 'userId', as: 'sellerProfile' });
Seller.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Seller.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Product.belongsTo(Seller, { foreignKey: 'sellerId', as: 'seller' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
User.hasMany(ServiceRequest, { foreignKey: 'clientUserId', as: 'serviceRequests', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
ServiceRequest.belongsTo(User, { foreignKey: 'clientUserId', as: 'client', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
Seller.hasMany(ServiceRequest, { foreignKey: 'sellerId', as: 'serviceRequests', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
ServiceRequest.belongsTo(Seller, { foreignKey: 'sellerId', as: 'seller', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
Product.hasMany(ServiceRequest, { foreignKey: 'productId', as: 'serviceRequests', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
ServiceRequest.belongsTo(Product, { foreignKey: 'productId', as: 'product', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Seller,
  Category,
  Product,
  Order,
  OrderItem,
  ServiceRequest,
  Notification
};
