if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/cacheWorker.js')
      .then(function (registration) {
        registration.addEventListener('updatefound', function () {
          const installingWorker = registration.installing;
          console.log('A new service worker is being installed:', installingWorker);
        });
        if (registration.active && navigator.connection) {
          navigator.connection.onchange = (e) => {
            if (e.target.downlink > 0) {
              registration.update().then(() => {
                console.log('updated cache');
              });
            }
          };
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  });
}
