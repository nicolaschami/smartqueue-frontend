self.addEventListener('push', (event) => {
  console.log('🔔 PUSH EVENT RECEIVED version 1.0');

  const body = event.data
    ? event.data.text()
    : "It's your turn!";

  console.log('📦 PUSH BODY:', body);

  event.waitUntil(
    self.registration.showNotification('SmartQueue', {
      body: body,
      icon: '/favicon.ico'
    })
  );
});