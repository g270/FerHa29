const express = require('express');
const { body, validationResult } = require('express-validator');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authentication');

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Validaciones para registro
const registerValidations = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El apellido debe tener al menos 2 caracteres'),
  body('userType')
    .isIn(['client', 'seller', 'admin'])
    .withMessage('Tipo de usuario inválido')
];

// Validaciones para login
const loginValidations = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida')
];

// Validaciones para actualizar perfil
const updateProfileValidations = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('El apellido debe tener al menos 2 caracteres'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Número de teléfono inválido')
];

router.post('/register', registerValidations, handleValidationErrors, userController.registerUser);
router.post('/login', loginValidations, handleValidationErrors, userController.loginUser);
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, updateProfileValidations, handleValidationErrors, userController.updateProfile);

module.exports = router;
