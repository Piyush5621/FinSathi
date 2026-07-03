export class BaseError extends Error {
  constructor(name, httpCode, isOperational, description) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.httpCode = httpCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseError {
  constructor(description = 'Validation Error') {
    super('ValidationError', 400, true, description);
  }
}

export class AuthenticationError extends BaseError {
  constructor(description = 'Authentication Error') {
    super('AuthenticationError', 401, true, description);
  }
}

export class AuthorizationError extends BaseError {
  constructor(description = 'Authorization Error') {
    super('AuthorizationError', 403, true, description);
  }
}

export class BusinessRuleError extends BaseError {
  constructor(description = 'Business Rule Violation') {
    super('BusinessRuleError', 400, true, description);
  }
}

export class InfrastructureError extends BaseError {
  constructor(description = 'Infrastructure Error') {
    super('InfrastructureError', 500, true, description);
  }
}

export class ExternalProviderError extends BaseError {
  constructor(description = 'External Provider Error') {
    super('ExternalProviderError', 502, true, description);
  }
}

export class AIProviderError extends BaseError {
  constructor(description = 'AI Provider Error') {
    super('AIProviderError', 503, true, description);
  }
}
