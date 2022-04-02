type InvalidationType = 'token' | 'user-client' | 'user' | 'client';

export class JwtiError extends Error {
  isJwtiError = true;
}

export class InvalidatedTokenError extends JwtiError {
  static TYPE_TOKEN: InvalidationType = 'token';
  static TYPE_USER_CLIENT: InvalidationType = 'user-client';
  static TYPE_USER: InvalidationType = 'user';
  static TYPE_CLIENT: InvalidationType = 'client';
  constructor(
    message: string,
    public invalidationType: InvalidationType,
    public invalidationTime: number,
  ) {
    super(message);
  }
}
