const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.NODE_ENV === 'development') {
  // Usar SQLite en memoria para desarrollo
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: console.log
  });
} else {
  const useSharedMemory = process.env.USE_SHARED_MEMORY === 'true';
  const useTrustedConnection = process.env.DB_TRUSTED_CONNECTION === 'true';
  const hasSqlCredentials = Boolean(process.env.DB_USER && process.env.DB_PASSWORD);

  const dialectOptions = {
    options: {}
  };

  if (useSharedMemory && process.env.DB_PIPE_NAME) {
    dialectOptions.options.pipeName = process.env.DB_PIPE_NAME;
  }

  if (useTrustedConnection && !hasSqlCredentials) {
    dialectOptions.options.trustedConnection = true;
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 1433;
    const instance = process.env.DB_INSTANCE;

    const serverValue = instance
      ? `${host}\\${instance}`
      : `${host},${port}`;

    dialectOptions.options.connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${serverValue};Database=${process.env.DB_NAME};Trusted_Connection=yes;`;
    dialectOptions.options.driver = '';
  } else {
    dialectOptions.options.encrypt = false;
    dialectOptions.options.trustServerCertificate = true;
    dialectOptions.options.useUTC = false;

    if (hasSqlCredentials) {
      dialectOptions.options.authentication = {
        type: 'default',
        options: {
          userName: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        }
      };
    } else if (useTrustedConnection) {
      dialectOptions.options.authentication = {
        type: 'ntlm',
        options: {
          domain: process.env.DB_DOMAIN || '',
          userName: process.env.DB_USER || '',
          password: process.env.DB_PASSWORD || ''
        }
      };
    }
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mssql',
    dialectOptions,
    logging: console.log
  };

  if (useTrustedConnection && !hasSqlCredentials) {
    config.dialectModulePath = 'msnodesqlv8/lib/sequelize';
  }

  if (!useSharedMemory) {
    if (process.env.DB_INSTANCE) {
      config.dialectOptions.options.instanceName = process.env.DB_INSTANCE;
    } else if (process.env.DB_PORT) {
      config.port = process.env.DB_PORT;
    }
  }

  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER || null,
    process.env.DB_PASSWORD || null,
    config
  );
}

module.exports = sequelize;
