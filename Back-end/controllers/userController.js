const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Seller } = require('../models');

const buildAuthUserPayload = (user, sellerProfile) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  address: user.address,
  userType: user.userType,
  createdAt: user.createdAt,
  sellerProfile: sellerProfile
    ? {
        id: sellerProfile.id,
        businessName: sellerProfile.businessName,
        description: sellerProfile.description,
        logoUrl: sellerProfile.logoUrl,
        rating: sellerProfile.rating,
        isVerified: sellerProfile.isVerified
      }
    : null
});

exports.registerUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, userType, phone, address } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'El correo ya está en uso' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      address,
      userType: userType || 'client'
    });

    let sellerProfile = null;
    if (user.userType === 'seller') {
      sellerProfile = await Seller.create({
        userId: user.id,
        businessName: `${firstName} ${lastName}`.trim() || email,
        description: '',
        logoUrl: null
      });
    }

    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      process.env.JWT_SECRET || 'mercaclicksecret',
      { expiresIn: '2h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: buildAuthUserPayload(user, sellerProfile),
      token
    });
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const sellerProfile = await Seller.findOne({ where: { userId: user.id } });
    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      process.env.JWT_SECRET || 'mercaclicksecret',
      { expiresIn: '2h' }
    );
    res.json({
      message: 'Login exitoso',
      token,
      user: buildAuthUserPayload(user, sellerProfile)
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const sellerProfile = await Seller.findOne({ where: { userId: user.id } });
    const { password, ...userProfile } = user.toJSON();
    res.json({
      ...userProfile,
      sellerProfile: sellerProfile
        ? {
            id: sellerProfile.id,
            businessName: sellerProfile.businessName,
            description: sellerProfile.description,
            logoUrl: sellerProfile.logoUrl,
            rating: sellerProfile.rating,
            isVerified: sellerProfile.isVerified
          }
        : null
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { firstName, lastName, phone, address } = req.body;

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone,
      address: address || user.address
    });

    const sellerProfile = await Seller.findOne({ where: { userId: user.id } });
    const { password, ...userProfile } = user.toJSON();
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        ...userProfile,
        sellerProfile: sellerProfile
          ? {
              id: sellerProfile.id,
              businessName: sellerProfile.businessName,
              description: sellerProfile.description,
              logoUrl: sellerProfile.logoUrl,
              rating: sellerProfile.rating,
              isVerified: sellerProfile.isVerified
            }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
};
