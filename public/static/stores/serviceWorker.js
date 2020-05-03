const SERVICE_WORKER_ACTIONS = {
  REFRESH_CACHE: 'SW_REFRESH_CACHE',
  UPDATE_FOUND: 'SW_UPDATE_FOUND',
  MESSAGE_RECEIVED: 'SW_MESSAGE_RECEIVED',
};

function serviceWorkerReducer(state = {}, action) {
  if (action.type === SERVICE_WORKER_ACTIONS.UPDATE_FOUND) {
    console.log('A new service worker is being installed');
    return state;
  }

  if (action.type === SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED) {
    console.log(SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED, action.payload.event.data)
    return state;
  }

  return state;
}

const serviceWorkerMiddleware = store => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/serviceWorker.js')
      .then(registration => {
        registration.addEventListener('updatefound', () => {
          store.dispatch({ type: SERVICE_WORKER_ACTIONS.UPDATE_FOUND });
        });

        if (registration.active && navigator.connection) {
          navigator.connection.onchange = (e) => {
            if (e.target.downlink > 0) {
              store.dispatch({ type: SERVICE_WORKER_ACTIONS.REFRESH_CACHE });
            }
          };

          navigator.serviceWorker.addEventListener('message', function(event){
            store.dispatch({ type: SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED, payload: { event } });
          });
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

  return next => action => {
    if (action.type === SERVICE_WORKER_ACTIONS.REFRESH_CACHE && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(action);
    }
    next(action);
  }
}
