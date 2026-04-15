const fetch = global.fetch;

(async () => {
  try {
    const loginResponse = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'Test1234!'
      })
    });

    const loginText = await loginResponse.text();
    console.log('LOGIN STATUS', loginResponse.status);
    console.log(loginText);

    if (!loginResponse.ok) return;

    const loginJson = JSON.parse(loginText);
    const token = loginJson.token;

    const profileResponse = await fetch('http://localhost:3001/api/users/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const profileText = await profileResponse.text();
    console.log('PROFILE STATUS', profileResponse.status);
    console.log(profileText);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
