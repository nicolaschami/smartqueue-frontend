self.addEventListener("install", (event) => {
  console.log("✅ SmartQueue Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("✅ SmartQueue Service Worker activated");

  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener("push", (event) => {
  console.log("🔔 PUSH EVENT RECEIVED");

  const body = event.data
    ? event.data.text()
    : "It's your turn!";

  console.log("📦 PUSH BODY:", body);

  event.waitUntil(
    self.registration.showNotification("SmartQueue", {
      body: body,
      icon: "/favicon.ico"
    })
  );
});