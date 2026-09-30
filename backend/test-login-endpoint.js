async function run() {
  try {
    console.log("Sending login request using native fetch to http://localhost:3001/api/auth/login...");
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        correo: 'admin@juanleonmera.edu.ec',
        password: 'Admin2026!',
        recordarme: false
      })
    });

    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response data:", data);
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

run();
