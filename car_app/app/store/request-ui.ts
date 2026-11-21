export type ApiConfirmation = {
  id: number;
  title: string;
  message: string;
  actionLabel: string;
};

type RequestUiSnapshot = {
  activeRequests: number;
  confirmation: ApiConfirmation | null;
  outcome: ApiOutcome | null;
};

export type ApiOutcome = {
  success: boolean;
  title: string;
  message: string;
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
  outcome: null,
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
  snapshot = {
    ...snapshot,
    activeRequests: snapshot.activeRequests + 1,
    outcome: null,
  };
  listeners.forEach(listener => listener());

  let finished = false;
  return (outcome?: ApiOutcome) => {
    if (finished) return;
    finished = true;
    snapshot = {
      ...snapshot,
      activeRequests: Math.max(0, snapshot.activeRequests - 1),
      outcome:
        outcome && snapshot.activeRequests <= 1
          ? outcome
          : snapshot.outcome,
    };
    listeners.forEach(listener => listener());
  };
};

export const requestApiConfirmation = (endpoint: string): Promise<boolean> =>
  new Promise(resolve => {
    snapshot = {...snapshot, outcome: null};
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

export const requiresApiConfirmation = (endpoint: string) =>
  endpoint.startsWith('delete');

export const resolveApiConfirmation = (confirmed: boolean) => {
  const pending = confirmationQueue.shift();
  if (!pending) return;
  pending.resolve(confirmed);
  publish();
};

export const dismissApiOutcome = () => {
  if (!snapshot.outcome) return;
  snapshot = {...snapshot, outcome: null};
  listeners.forEach(listener => listener());
};
