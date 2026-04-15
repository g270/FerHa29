require('dotenv').config();
const { Connection } = require('tedious');

const authOptions = {
  type: 'ntlm',
  options: {
    domain: '',
    userName: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || ''
  }
};

const tests = [];

if (process.env.USE_SHARED_MEMORY === 'true' && process.env.DB_PIPE_NAME) {
  tests.push({
    name: 'Named Pipe',
    config: {
      server: process.env.DB_HOST || 'localhost',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false,
        pipeName: process.env.DB_PIPE_NAME
      },
      authentication: authOptions
    }
  });
}

if (process.env.DB_INSTANCE) {
  tests.push({
    name: 'TCP with instanceName',
    config: {
      server: process.env.DB_HOST || 'localhost',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false,
        instanceName: process.env.DB_INSTANCE
      },
      authentication: authOptions
    }
  });
} else {
  tests.push({
    name: 'TCP',
    config: {
      server: process.env.DB_HOST || 'localhost',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        useUTC: false
      },
      authentication: authOptions,
      port: parseInt(process.env.DB_PORT, 10) || 1433
    }
  });
}

const runTest = (test) => {
  return new Promise((resolve) => {
    console.log(`\n=== Testing ${test.name} connection ===`);
    console.log(JSON.stringify(test.config, null, 2));

    const connection = new Connection(test.config);
    const timeout = setTimeout(() => {
      console.error(`${test.name} TIMEOUT: no respuesta en 15 segundos`);
      connection.close();
      resolve({ name: test.name, status: 'timeout' });
    }, 15000);

    connection.on('connect', (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error(`${test.name} CONNECT_ERROR`, err.message);
        resolve({ name: test.name, status: 'error', error: err.message });
        return;
      }
      console.log(`${test.name} CONNECTED`);
      connection.close();
      resolve({ name: test.name, status: 'success' });
    });

    connection.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`${test.name} ERROR_EVENT`, err.message);
      resolve({ name: test.name, status: 'error', error: err.message });
    });
  });
};

(async () => {
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  console.log('\n=== Results ===');
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.some(r => r.status !== 'success') ? 1 : 0);
})();