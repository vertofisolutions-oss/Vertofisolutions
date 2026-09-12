console.log("Vertofi API Server initialized");

export default function handler(req: any, res: any) {
  if (res && typeof res.status === "function") {
    return res.status(200).json({
      status: "online",
      name: "Vertofi Platform API",
      message: "API Gateway is active. For the frontend web application, set Vercel Root Directory to apps/web-landing or repository root.",
      timestamp: new Date().toISOString()
    });
  }

  return new Response(
    JSON.stringify({
      status: "online",
      name: "Vertofi Platform API",
      message: "API Gateway is active.",
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
