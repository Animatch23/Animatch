const { EventEmitter } = require("events");

const files = new Map();

const toBuffer = (chunk) => {
  if (chunk === undefined || chunk === null) {
    return Buffer.alloc(0);
  }
  return Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
};

class MockWriteStream extends EventEmitter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.chunks = [];
  }

  write(chunk) {
    this.chunks.push(toBuffer(chunk));
    this.emit("drain");
    return true;
  }

  end(chunk) {
    if (chunk) {
      this.write(chunk);
    }
    const result = this.chunks.length ? Buffer.concat(this.chunks) : Buffer.alloc(0);
    files.set(this.filePath, result);
    this.emit("finish");
    this.emit("close");
  }

  pipe(destination) {
    this.on("data", (chunk) => destination.write?.(chunk));
    this.on("finish", () => destination.end?.());
    return destination;
  }
}

class MockReadStream extends EventEmitter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.buffer = files.get(filePath);

    process.nextTick(() => {
      if (!this.buffer) {
        const error = new Error(`ENOENT: no such file ${filePath}`);
        error.code = "ENOENT";
        this.emit("error", error);
        return;
      }

      this.emit("open", 1);
      this.emit("data", this.buffer);
      this.emit("end");
      this.emit("close");
    });
  }

  pipe(destination) {
    this.on("data", (chunk) => destination.write?.(chunk));
    this.on("end", () => destination.end?.());
    return destination;
  }

  setEncoding() {
    return this;
  }

  pause() {
    return this;
  }

  resume() {
    return this;
  }
}

const ensureFileExists = (filePath) => {
  if (!files.has(filePath)) {
    const error = new Error(`ENOENT: ${filePath}`);
    error.code = "ENOENT";
    throw error;
  }
};

const promises = {
  mkdir: async () => {},
  stat: async (filePath) => {
    ensureFileExists(filePath);
    return { size: files.get(filePath).length };
  },
  copyFile: async (source, target) => {
    ensureFileExists(source);
    files.set(target, Buffer.from(files.get(source)));
  },
  unlink: async (filePath) => {
    files.delete(filePath);
  }
};

const fsMock = {
  promises,
  __files: files,
  __reset: () => files.clear(),
  __setFile: (filePath, contents) => {
    files.set(filePath, toBuffer(contents));
  },
  __getFile: (filePath) => {
    const value = files.get(filePath);
    return value ? value.toString("utf8") : undefined;
  },
  existsSync: (filePath) => files.has(filePath),
  createWriteStream: (filePath) => new MockWriteStream(filePath),
  createReadStream: (filePath) => new MockReadStream(filePath),
  stat: (filePath, callback) => {
    try {
      ensureFileExists(filePath);
      callback(null, { size: files.get(filePath).length });
    } catch (error) {
      callback(error);
    }
  },
  mkdirSync: () => {},
  unlinkSync: (filePath) => {
    files.delete(filePath);
  }
};

module.exports = fsMock;
module.exports.promises = promises;
module.exports.default = fsMock;
