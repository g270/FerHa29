require('dotenv').config();
const app = require('./app');
const { sequelize, Category, Sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function ensureDefaultCategories() {
  const categories = [
    {
      name: 'Artesanias',
      description: 'Productos hechos a mano y articulos artesanales',
      imageUrl: 'https://placehold.co/600x400?text=Artesanias'
    },
    {
      name: 'Servicios Medicos',
      description: 'Consultas, atencion y servicios de salud',
      imageUrl: 'https://placehold.co/600x400?text=Servicios+Medicos'
    },
    {
      name: 'Herramientas',
      description: 'Equipo, refacciones e insumos para trabajo tecnico',
      imageUrl: 'https://placehold.co/600x400?text=Herramientas'
    },
    {
      name: 'Tecnologia',
      description: 'Dispositivos, accesorios y soluciones tecnologicas',
      imageUrl: 'https://placehold.co/600x400?text=Tecnologia'
    }
  ];

  for (const category of categories) {
    await Category.findOrCreate({
      where: { name: category.name },
      defaults: category
    });
  }
}

async function ensureProductColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const productTable = await queryInterface.describeTable('Products');

  const columnsToAdd = [
    {
      name: 'sku',
      definition: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      }
    },
    {
      name: 'offerPrice',
      definition: {
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: true
      }
    },
    {
      name: 'dispatchLocation',
      definition: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      }
    },
    {
      name: 'deliveryType',
      definition: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
        defaultValue: 'retiro'
      }
    },
    {
      name: 'isActive',
      definition: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }
  ];

  for (const column of columnsToAdd) {
    if (!productTable[column.name]) {
      await queryInterface.addColumn('Products', column.name, column.definition);
    }
  }
}

async function ensureDatabaseExists() {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const masterConfig = {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false
      }
    },
    logging: false,
    port: process.env.DB_PORT || 1433
  };

  const master = new (require('sequelize').Sequelize)(
    'master',
    process.env.DB_USER || '',
    process.env.DB_PASSWORD || '',
    masterConfig
  );

  try {
    await master.authenticate();
    await master.query(`IF DB_ID(N'${process.env.DB_NAME}') IS NULL CREATE DATABASE [${process.env.DB_NAME}]`);
    console.log(`Base de datos '${process.env.DB_NAME}' verificada o creada correctamente`);
  } finally {
    await master.close();
  }
}

function listenAsync() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`✅ Servidor backend ejecutándose en http://localhost:${PORT}`);
      console.log(`📡 APIs disponibles en http://localhost:${PORT}/api/`);
      resolve(server);
    });

    server.once('error', reject);
  });
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a base de datos establecida correctamente');

    await sequelize.sync();
    console.log('Modelos sincronizados con la base de datos');

    await ensureProductColumns();
    console.log('Columnas extendidas de productos verificadas correctamente');

    await ensureDefaultCategories();
    console.log('Categorias base verificadas correctamente');

    await listenAsync();
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ No se pudo iniciar el servidor: el puerto ${PORT} ya está en uso`);
    } else {
      console.error('❌ No se pudo iniciar el servidor:', error.message);
    }
    process.exit(1);
  }
}

startServer();
