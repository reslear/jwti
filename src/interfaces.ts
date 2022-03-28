import JWT from 'jsonwebtoken';

export interface JwtiParams {
  client?: string | number | Object;
  user?: string | number | Object;
  precise?: boolean;
}

export interface JwtiAPI {
  invalidate(token: string): Promise<void>;
  invalidate(params: JwtiParams): Promise<void>;
  revert(token: string): Promise<boolean>;
  revert(params: Omit<JwtiParams, 'precise'>): Promise<boolean>;
  // invalidateAll(): Promise<void>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret,
    options: JWT.VerifyOptions & { complete: true },
  ): Promise<JWT.Jwt>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret,
    options?: JWT.VerifyOptions & { complete?: false },
  ): Promise<JWT.JwtPayload | string>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret,
    options?: JWT.VerifyOptions,
  ): Promise<JWT.Jwt | JWT.JwtPayload | string>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret | JWT.GetPublicKeyOrSecret,
    callback?: JWT.VerifyCallback<JWT.JwtPayload | string>,
  ): Promise<void>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret | JWT.GetPublicKeyOrSecret,
    options: JWT.VerifyOptions & { complete: true },
    callback?: JWT.VerifyCallback<JWT.Jwt>,
  ): Promise<void>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret | JWT.GetPublicKeyOrSecret,
    options?: JWT.VerifyOptions & { complete?: false },
    callback?: JWT.VerifyCallback<JWT.JwtPayload | string>,
  ): Promise<void>;
  verify(
    token: string,
    secretOrPublicKey: JWT.Secret | JWT.GetPublicKeyOrSecret,
    options?: JWT.VerifyOptions,
    callback?: JWT.VerifyCallback,
  ): Promise<void>;
  sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: JWT.Secret,
    options?: JWT.SignOptions & JwtiParams,
  ): Promise<string>;
  sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: JWT.Secret,
    callback: JWT.SignCallback,
  ): Promise<void>;
  sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: JWT.Secret,
    options: JWT.SignOptions & JwtiParams,
    callback: JWT.SignCallback,
  ): Promise<void>;
  jwt: typeof JWT;
}
