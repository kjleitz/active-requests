interface ActiveRequests {
  count: number;
  fetchRequests: Promise<Response>[];
  xhrRequests: XMLHttpRequest[];
  running: boolean;
  settings: {
    debug: boolean;
    timeout: number;
  };
  start(settings: Partial<ActiveRequests['settings']>): ActiveRequests;
  stop(): ActiveRequests;
}

const activeRequests: ActiveRequests = (typeof window === 'undefined' ? null : (window as any).activeRequests) || {
  get count() { return this.fetchRequests.length + this.xhrRequests.length; },
  fetchRequests: [],
  xhrRequests: [],
  running: false,
  settings: {
    timeout: -1,
    debug: false,
  },
  start(settings = {}) {
    this.settings = { ...this.settings, ...settings };
    XMLHttpRequest.prototype.send = wrappedXhrSend;
    window.fetch = wrappedFetch;
    this.running = true;
    return this;
  },
  stop() {
    XMLHttpRequest.prototype.send = originalXhrSend;
    window.fetch = originalFetch;
    this.running = false;
    return this;
  }
};

type Args<T extends (...args: any[]) => any> = T extends (...args: infer U) => any ? U : never;

const logger = (message: string, instance: any, ...args: any[]): void => {
  if (!activeRequests.settings.debug) return;
  const punctuatedMessage = message.match(/[\w)\]]$/) ? `${message};` : message;
  console.log(punctuatedMessage, `${activeRequests.count} requests currently active. Instance:`, instance, ...args);
};

const addRequest = (options: { xhr: XMLHttpRequest }|{ fetch: Promise<Response> }): number => {
  if ('xhr' in options) {
    logger("XMLHttpRequest started", options.xhr);
    activeRequests.xhrRequests.push(options.xhr);
  } else {
    logger("Fetch started", options.fetch);
    activeRequests.fetchRequests.push(options.fetch);
  }

  const { timeout } = activeRequests.settings;
  return timeout <= 0 ? 0 : window.setTimeout(() => removeRequest(options, true), timeout);
};

const removeRequest = (options: { xhr: XMLHttpRequest }|{ fetch: Promise<Response> }, timedOut = false): void => {
  const remove = <T>(item: T, list: T[]): boolean => {
    const index = list.indexOf(item);
    if (index >= 0) { list.splice(index, 1); return true; }
    return false;
  }

  const [req, reqDescription, removed] = 'xhr' in options
    ? [options.xhr, 'XMLHttpRequest', remove(options.xhr, activeRequests.xhrRequests)]
    : [options.fetch, 'Native fetch', remove(options.fetch, activeRequests.fetchRequests)];

  logger(`${reqDescription} ${timedOut ? 'timed out' : 'finished'}${removed ? '' : ' (but already removed from tracking)'}`, req);
};

const originalXhrSend = XMLHttpRequest.prototype.send;
const originalFetch = window.fetch;

const wrappedXhrSend = function(this: XMLHttpRequest, ...args: Args<XMLHttpRequest['send']>) {
  let activeRequestTimeout = 0;

  this.addEventListener("loadstart", () => {
    activeRequestTimeout = addRequest({ xhr: this });
  }, false);

  this.addEventListener("loadend", () => {
    window.clearTimeout(activeRequestTimeout);
    removeRequest({ xhr: this });
  }, false);

  return originalXhrSend.call(this, ...args);
};

const wrappedFetch = function(this: Window, ...args: Args<Window['fetch']>) {
  let activeRequestTimeout = 0;

  const request = originalFetch(...args).finally(() => {
    window.clearTimeout(activeRequestTimeout);
    removeRequest({ fetch: request });
  });

  activeRequestTimeout = addRequest({ fetch: request });

  return request;
};

export default activeRequests;
