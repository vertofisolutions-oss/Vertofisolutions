console.log("Vertofi API Server initialized");

export const maxDuration = 300;

export default function handler(req: any, res: any) {
  const payload = {
    status: "online",
    name: "Vertofi Platform API",
    message: "API Gateway is active. For the frontend web application, access the main platform dashboard or set Vercel Root Directory to apps/web-landing or repository root.",
    timestamp: new Date().toISOString()
  };

  // 1. Express / Micro style res.status().json()
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    return res.status(200).json(payload);
  }

  // 2. Standard Node.js http.ServerResponse (res.setHeader, res.end)
  if (res && typeof res.end === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
    return;
  }

  // 3. Web Standard Request/Response (Edge runtime)
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
