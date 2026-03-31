import { EventEmitter } from 'events';

export class Socket extends EventEmitter {
  constructor() {
    super();
    this.connecting = false;
    this.destroyed = false;
  }
  connect(options, cb) {
    if (cb) this.once('connect', cb);
    setTimeout(() => {
      this.emit('error', new Error('Browser environment cannot create TCP sockets.'));
    }, 10);
    return this;
  }
  setEncoding() {}
  setKeepAlive() {}
  setNoDelay() {}
  setTimeout() {}
  ref() {}
  unref() {}
  end() {
    this.emit('end');
  }
  destroy() {
    this.destroyed = true;
    this.emit('close');
  }
  write() {}
}

export function connect() {
  return new Socket();
}

export function createConnection() {
  return new Socket();
}

export function createServer() {
  return {
    listen: () => {},
    close: () => {},
    on: () => {},
  };
}

export default {
  Socket,
  connect,
  createConnection,
  createServer,
};
