export type RequestType = 'xhr'|'fetch';

export type RequestHandler = (req: XMLHttpRequest|Promise<Response>, type: RequestType, timestamp: number) => void;

export interface ActiveRequests {
  count: number;
  fetchRequests: Promise<Response>[];
  xhrRequests: XMLHttpRequest[];
  running: boolean;
  settings: {
    debug: boolean;
    timeout: number;
  };
  requestStartHandlers: {
    xhr: { [id: number]: RequestHandler };
    fetch: { [id: number]: RequestHandler };
    generic: { [id: number]: RequestHandler };
  }
  requestEndHandlers: {
    xhr: { [id: number]: RequestHandler };
    fetch: { [id: number]: RequestHandler };
    generic: { [id: number]: RequestHandler };
  }
  start(settings: Partial<ActiveRequests['settings']>): ActiveRequests;
  stop(): ActiveRequests;
  onRequestStart(callback: RequestHandler, options: { type?: RequestType }): number
  onRequestEnd(callback: RequestHandler, options: { type?: RequestType }): number
}
let requestHandlerId = 0;

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
  },
  requestStartHandlers: {
    xhr: {},
    fetch: {},
    generic: {},
  },
  requestEndHandlers: {
    xhr: {},
    fetch: {},
    generic: {},
  },
  onRequestStart(callback: RequestHandler, options: { type?: RequestType } = {}): number {
    const id = ++requestHandlerId;
    const handlers = this.requestStartHandlers[options.type || 'generic'];
    Object.assign(handlers, { [id]: callback });
    return id;
  },
  onRequestEnd(callback: RequestHandler, options: { type?: RequestType } = {}): number {
    const id = ++requestHandlerId;
    const handlers = this.requestEndHandlers[options.type || 'generic'];
    Object.assign(handlers, { [id]: callback });
    return id;
  },
  removeListener(id: number): void {
    (['xhr', 'fetch', 'generic'] as const).forEach((reqType) => {
      delete this.requestStartHandlers[reqType][id];
      delete this.requestEndHandlers[reqType][id];
    });
  },
};

type Args<T extends (...args: any[]) => any> = T extends (...args: infer U) => any ? U : never;

const logger = (message: string, instance: any, ...args: any[]): void => {
  if (!activeRequests.settings.debug) return;
  const punctuatedMessage = message.match(/[\w)\]]$/) ? `${message};` : message;
  console.log(punctuatedMessage, `${activeRequests.count} requests currently active. Instance:`, instance, ...args);
};

const addRequest = (options: { xhr: XMLHttpRequest, fetch?: undefined }|{ fetch: Promise<Response>, xhr?: undefined }): number => {
  const reqType = options.xhr ? 'xhr' : 'fetch';
  const req = options[reqType]!;
  const time = new Date().getTime();

  const handle = (handler: RequestHandler): void => handler(req, reqType, time);

  if (options.xhr) {
    logger("XMLHttpRequest started", options.xhr);
    activeRequests.xhrRequests.push(options.xhr);
    Object.values(activeRequests.requestStartHandlers.xhr).forEach(handle);
  } else {
    logger("Fetch started", options.fetch);
    activeRequests.fetchRequests.push(options.fetch);
    Object.values(activeRequests.requestStartHandlers.fetch).forEach(handle);
  }

  Object.values(activeRequests.requestStartHandlers.generic).forEach(handle);

  const { timeout } = activeRequests.settings;
  return timeout <= 0 ? 0 : window.setTimeout(() => removeRequest(options, true), timeout);
};

const removeRequest = (options: { xhr: XMLHttpRequest, fetch?: undefined }|{ fetch: Promise<Response>, xhr?: undefined }, timedOut = false): void => {
  const remove = <T>(item: T, list: T[]): boolean => {
    const index = list.indexOf(item);
    if (index >= 0) { list.splice(index, 1); return true; }
    return false;
  }

  const [req, reqType, removed] = options.xhr
    ? [options.xhr, 'xhr', remove(options.xhr, activeRequests.xhrRequests)] as const
    : [options.fetch, 'fetch', remove(options.fetch, activeRequests.fetchRequests)] as const;

  if (removed) {
    const time = new Date().getTime();
    const handle = (handler: RequestHandler): void => handler(req, reqType, time);
    const specificHandlers = activeRequests.requestEndHandlers[reqType];
    const genericHandlers = activeRequests.requestEndHandlers.generic;
    Object.values({ ...specificHandlers, ...genericHandlers }).forEach(handle);
  }

  logger(`${reqType === 'xhr' ? 'XMLHttpRequest' : 'Native fetch'} ${timedOut ? 'timed out' : 'finished'}${removed ? '' : ' (but already removed from tracking)'}`, req);
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
