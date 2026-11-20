export type ApiConfirmation = {
  id: number;
  title: string;
  message: string;
  actionLabel: string;
};

type RequestUiSnapshot = {
  activeRequests: number;
  confirmation: ApiConfirmation | null;
};

type PendingConfirmation = {
  request: ApiConfirmation;
  resolve: (confirmed: boolean) => void;
};

const listeners = new Set<() => void>();
const confirmationQueue: PendingConfirmation[] = [];
let nextConfirmationId = 1;
let snapshot: RequestUiSnapshot = {
  activeRequests: 0,
  confirmation: null,
};

const publish = () => {
  snapshot = {
    ...snapshot,
    confirmation: confirmationQueue[0]?.request ?? null,
  };
  listeners.forEach(listener => listener());
};

export const subscribeToRequestUi = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRequestUiSnapshot = () => snapshot;

export const beginApiRequest = () => {
  snapshot = {...snapshot, activeRequests: snapshot.activeRequests + 1};
  listeners.forEach(listener => listener());

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    snapshot = {
      ...snapshot,
      activeRequests: Math.max(0, snapshot.activeRequests - 1),
    };
    listeners.forEach(listener => listener());
  };
};

export const requestApiConfirmation = (endpoint: string): Promise<boolean> =>
  new Promise(resolve => {
    const actionLabel = endpoint
      .replace(/Mutation$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/^./, letter => letter.toLowerCase());
    confirmationQueue.push({
      request: {
        id: nextConfirmationId++,
        title: 'Confirm action',
        message: `You are about to ${actionLabel || 'make this change'}. Continue?`,
        actionLabel: 'Confirm',
      },
      resolve,
    });
    publish();
  });

const endpointsWithoutConfirmation = new Set([
  'customerLogin',
  'customerRegister',
  'workerLogin',
  'uploadImage',
  'requestLoginOtp',
  'verifyLoginOtp',
  'requestPasswordReset',
  'resetPassword',
]);

export const requiresApiConfirmation = (endpoint: string) =>
  !endpoint.startsWith('confirmStripe') &&
  !endpointsWithoutConfirmation.has(endpoint);

export const resolveApiConfirmation = (confirmed: boolean) => {
  const pending = confirmationQueue.shift();
  if (!pending) return;
  pending.resolve(confirmed);
  publish();
};
