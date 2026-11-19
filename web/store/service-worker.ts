import type { Middleware } from 'redux';
import { isAction, type AnyAction, type RootState } from './types.ts';

interface MessageAction { type: typeof SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED; payload: { event: MessageEvent } }

export const SERVICE_WORKER_ACTIONS = {
  REFRESH_CACHE: 'SW_REFRESH_CACHE',
  UPDATE_FOUND: 'SW_UPDATE_FOUND',
  MESSAGE_RECEIVED: 'SW_MESSAGE_RECEIVED',
  SESSION: 'SW_SESSION',
} as const;

// tells the worker which session this page runs in, so it keeps per-user responses apart
function reportSessionToServiceWorker() {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    return;
  }

  const sessionId = document.querySelector('meta[name="x-session-id"]')?.getAttribute('content') ?? '';
  navigator.serviceWorker.controller.postMessage({ type: SERVICE_WORKER_ACTIONS.SESSION, sessionId });
}

export function serviceWorkerReducer(state: RootState['serviceWorker'] = {}, action: AnyAction) {
  if (action.type === SERVICE_WORKER_ACTIONS.UPDATE_FOUND) {
    console.log('A new service worker is being installed');
  }

  if (isAction<MessageAction>(action, SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED)) {
    console.log(SERVICE_WORKER_ACTIONS.MESSAGE_RECEIVED, action.payload.event.data);
  }

  return state;
}

export const serviceWorkerMiddleware: Middleware<object, RootState> = () => {
  if ('serviceWorker' in navigator) {
    reportSessionToServiceWorker();
    navigator.serviceWorker.addEventListener('controllerchange', reportSessionToServiceWorker);

    // the worker is switched off: a registration left from an earlier version goes
    navigator.serviceWorker
      .getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(error => console.error(error));
  }

  return next => (action) => {
    if (action.type === SERVICE_WORKER_ACTIONS.REFRESH_CACHE && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(action);
    }

    return next(action);
  };
};
