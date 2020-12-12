class ApplicationError extends Error {
  constructor(message, info, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }

    this.name = 'ApplicationError';
    this.message = message;
    this.info = info;
  }
}

module.exports = ApplicationError;
