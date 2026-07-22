
async function loginAndFetch() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'damitha123@gmail.com', password: '123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    console.log('Login Token:', token ? 'Got Token' : loginData);

    const productsRes = await fetch('http://localhost:5000/api/branch_products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const productsData = await productsRes.text();
    console.log('Products:', productsRes.status, productsData.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
loginAndFetch();
