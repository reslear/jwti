import Jwt from 'jsonwebtoken';
import {
  RedisClientType,
  RedisDefaultModules,
  RedisModules,
  RedisScripts,
} from 'redis';
import { InvalidatedTokenError } from './errors';
import { JwtiAPI, JwtiParams } from './interfaces';
import type { Redis } from 'ioredis';

export class Jwti implements JwtiAPI {
  constructor(
    public jwt: typeof Jwt,
    private redis:
      | RedisClientType<RedisDefaultModules & RedisModules, RedisScripts>
      | Redis,
  ) {}

  private async createTokenInvalidation(token: string): Promise<void> {
    const invalidationTime = +new Date() / 1000;
    await this.redis.set(token, invalidationTime);
  }

  private async createUserInvalidation(
    user: string | number | Object,
  ): Promise<void> {
    const invalidationTime = +new Date() / 1000;
    const userKey = typeof user === 'string' ? user : JSON.stringify(user);
    const invalidationKey = `user::${userKey}`;

    await this.redis.set(invalidationKey, invalidationTime);
  }

  private async createClientInvalidation(
    client: string | number | Object,
  ): Promise<void> {
    const invalidationTime = +new Date() / 1000;
    const clientKey =
      typeof client === 'string' ? client : JSON.stringify(client);
    const invalidationKey = `user::${clientKey}`;

    await this.redis.set(invalidationKey, invalidationTime);
  }

  private async createUserClientInvalidation(
    user: string | number | Object,
    client: string | number | Object,
  ): Promise<void> {
    const invalidationTime = +new Date() / 1000;
    const userKey = typeof user === 'string' ? user : JSON.stringify(user);
    const clientKey =
      typeof client === 'string' ? client : JSON.stringify(client);
    const invalidationKey = `user::${userKey}::client::${clientKey}`;

    await this.redis.set(invalidationKey, invalidationTime);
  }

  private async getTokenInvalidationTime(
    token: string,
  ): Promise<number | null> {
    try {
      const invalidationTime = await this.redis.get(token);
      return invalidationTime ? parseFloat(invalidationTime) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async getUserInvalidationTime(
    user: string | number | Object,
  ): Promise<number | null> {
    try {
      const userKey = typeof user === 'string' ? user : JSON.stringify(user);
      const invalidationKey = `user::${userKey}`;

      const invalidationTime = await this.redis.get(invalidationKey);

      return invalidationTime ? parseFloat(invalidationTime) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async getClientInvalidationTime(
    client: string | number | Object,
  ): Promise<number | null> {
    try {
      const clientKey =
        typeof client === 'string' ? client : JSON.stringify(client);
      const invalidationKey = `user::${clientKey}`;

      const invalidationTime = await this.redis.get(invalidationKey);

      return invalidationTime ? parseFloat(invalidationTime) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async getUserClientInvalidationTime(
    user: string | number | Object,
    client: string | number | Object,
  ): Promise<number | null> {
    try {
      const userKey = typeof user === 'string' ? user : JSON.stringify(user);
      const clientKey =
        typeof client === 'string' ? client : JSON.stringify(client);
      const invalidationKey = `user::${userKey}::client::${clientKey}`;

      const invalidationTime = await this.redis.get(invalidationKey);

      return invalidationTime ? parseFloat(invalidationTime) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async revertTokenInvalidation(token: string): Promise<boolean> {
    const invalidationTime = await this.redis.get(token);
    return (invalidationTime && (await this.redis.del(token), true)) || false;
  }

  private async removeUserClientInvalidation(
    user: string | number | Object,
    client: string | number | Object,
  ): Promise<void> {
    try {
      const userKey = typeof user === 'string' ? user : JSON.stringify(user);
      const clientKey =
        typeof client === 'string' ? client : JSON.stringify(client);
      const invalidationKey = `user::${userKey}::client::${clientKey}`;
      await this.redis.del(invalidationKey);
    } catch (error) {
      console.error(error);
    }
  }

  private async removeUserInvalidation(
    user: string | number | Object,
  ): Promise<void> {
    try {
      const userKey = typeof user === 'string' ? user : JSON.stringify(user);
      const invalidationKey = `user::${userKey}`;
      await this.redis.del(invalidationKey);
    } catch (error) {
      console.error(error);
    }
  }

  private async removeClientInvalidation(
    client: string | number | Object,
  ): Promise<void> {
    try {
      const clientKey =
        typeof client === 'string' ? client : JSON.stringify(client);
      const invalidationKey = `user::${clientKey}`;
      await this.redis.del(invalidationKey);
    } catch (error) {
      console.error(error);
    }
  }

  private async revertUserClientInvalidation(
    user: string | number | Object,
    client: string | number | Object,
  ): Promise<boolean> {
    if (await this.getUserClientInvalidationTime(user, client)) {
      return await this.removeUserClientInvalidation(user, client), true;
    }
    return false;
  }

  private async revertUserInvalidation(
    user: string | number | Object,
  ): Promise<boolean> {
    if (await this.getUserInvalidationTime(user)) {
      return await this.removeUserInvalidation(user), true;
    }
    return false;
  }

  private async revertClientInvalidation(
    client: string | number | Object,
  ): Promise<boolean> {
    if (await this.getClientInvalidationTime(client)) {
      return await this.removeClientInvalidation(client), true;
    }
    return false;
  }

  /**
   * Reverts an invalidation
   *
   * Same rules for invalidating. You can revert an invalidation
   * made for a given **user**, a given **client**, or a combination of
   * a given **user** **AND** a given **client**
   * @param token the invalidated token
   * @param params like the ```jwti.invalidate()``` method the params are ```user``` and/or ```client```.
   * @example
   * ```ts
   * {client: 'mobile', user: 1}
   * ```
   * @returns a ```Promise``` of a ```boolean```. The boolean will be true if an
   * invalidation was found and reverted, and false if no invalidation was found
   * (for the given parameters)
   *
   */
  async revert(token: string): Promise<boolean>;
  async revert(params: Omit<JwtiParams, 'precise'>): Promise<boolean>;
  async revert(params: any): Promise<boolean> {
    if (typeof params === 'string') {
      return this.revertTokenInvalidation(params);
    }

    const { user, client } = params as JwtiParams;

    if (user && client) {
      return this.revertUserClientInvalidation(user, client);
    }

    if (user) {
      return this.revertUserInvalidation(user);
    }

    if (client) {
      return this.revertClientInvalidation(client);
    }

    return false;
  }

  private createJwtiHeader = (
    user?: string | number | Object,
    client?: string | number | Object,
    iat?: number,
  ): Object => {
    return Object.assign({ user, client, iat });
  };

  /**
   * Same signature of @jsonwebtoken sign method but returns a
   * Promise of the original value
   *
   * This method uses the @jsonwebtoken under the hood
   * @param payload the content of the token
   * @param secretOrPrivateKey the secret to use for the signature
   * @param options jsonwebtoken options plus ```client```, ```user``` and ```precise```
   * where ```client``` and ```user```
   * to be used by Jwti to identify the
   * token later on verify method
   *
   * ```precise``` is a boolean flag (defaults to false) to let jwti use its own
   * ```iat``` header on the token because jsonwebtoken ignore milleseconds when
   * generating iat
   * @example
   * * You can either pass one or both to identify the token, so you can invalidate it later:
   * ```ts
   * // Mark the token as belonging to user: 1 AND client: 'mobile'
   * const token = await jwti.sign('payload', 'secret', {user: 1, client: 'mobile'});
   * // Or passing an object as the payload (it supports all the jsonwebtoken parameters and its types)
   * const token = await jwti.sign({something: 'nothing'}, 'secret', {user: 1, client: 'mobile'});
   * ```
   * * Then:
   * ```ts
   * // Invalidates all previously signed tokens (signed with jwti) that are from user: 1 AND client: 'mobile'
   * await jwti.invalidate({user: 1, client: 'mobile'})
   * ```
   * * Finally:
   * ```ts
   * // Throws an InvalidatedTokenError with type: 'user-client'
   * const payload = await jwti.verify(token, 'secret');
   * ```
   * @param callback as you would use with jsonwebtoken, just
   * remember that this method still returns a promise
   *
   */
  async sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: Jwt.Secret,
    options?: Jwt.SignOptions & JwtiParams,
  ): Promise<string>;
  async sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: Jwt.Secret,
    callback: Jwt.SignCallback,
  ): Promise<void>;
  async sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: Jwt.Secret,
    options: Jwt.SignOptions & JwtiParams,
    callback: Jwt.SignCallback,
  ): Promise<void>;
  async sign(
    payload: any,
    secretOrPrivateKey: any,
    options?: any,
    callback?: any,
  ): Promise<string | void> {
    const {
      user = undefined,
      client = undefined,
      precise = false,
    } = typeof options === 'object' ? (options as JwtiParams) : {};

    const iat =
      precise || typeof payload !== 'object' ? +new Date() / 1000 : undefined;

    if (!options || typeof options === 'function') {
      if (!iat)
        return this.jwt.sign(payload, secretOrPrivateKey, options, callback);

      const jwtiHeader = this.createJwtiHeader(undefined, undefined, iat);

      const callbackFunction = options;
      return this.jwt.sign(
        payload,
        secretOrPrivateKey,
        { header: Object.assign({ jwti: jwtiHeader }) },
        callbackFunction,
      );
    }

    const jwtiHeader = this.createJwtiHeader(user, client, iat);

    const header = Object.assign(options?.header || {}, {
      jwti: jwtiHeader,
    });

    delete options.user;
    delete options.client;
    delete options.precise;

    return this.jwt.sign(
      payload,
      secretOrPrivateKey,
      { ...options, header },
      callback,
    );
  }

  private jwtiParamExists(
    param: string | number | Object | undefined | null,
  ): boolean {
    return param !== null && param !== undefined;
  }

  /**
   * Creates an invalidation entry for a given **token** or any
   * token for a given **user** | **client** or even a
   * combination of **user** AND **client**.
   *
   * You can invalidate a single token, all tokens issued for a
   * given user, all tokens issued for a given client or even
   * all tokens issued for a given combination of user and client
   * @param token the token (obtained by calling the sign method)
   * @param params object containing either **user** and/or
   * **client** eg. {user: 1, client: 'mobile'}
   * @example {user: 1, client: 'mobile'}
   */
  async invalidate(token: string): Promise<void>;
  async invalidate(params: Omit<JwtiParams, 'precise'>): Promise<void>;
  async invalidate(params: any): Promise<void> {
    if (typeof params === 'string') {
      return this.createTokenInvalidation(params);
    }

    const { user, client } = params as JwtiParams;

    if (this.jwtiParamExists(user) && this.jwtiParamExists(client))
      return this.createUserClientInvalidation(
        user as string | number | Object,
        client as string | number | Object,
      );

    if (this.jwtiParamExists(user))
      return this.createUserInvalidation(user as string | number | Object);

    if (this.jwtiParamExists(client))
      return this.createClientInvalidation(client as string | number | Object);
  }

  /**
   * Verifies a token by using jsonwebtoken verify method and,
   * if valid, checking against invalidation entries created with
   * ```ts
   * jwti.invalidate(params)
   * ```
   *
   * If there's any invalidation entry for the given **token**, **user**,
   * **client** or **user-client** combination **AND** the invalidation timestamp
   * is higher/newer than the ```iat``` (issued at) property of the token
   * it throws an @InvalidatedTokenError
   *
   * @param token the token (obtained by calling the sign method)
   * @param params object containing either **user** and/or
   * **client** eg. {user: 1, client: 'mobile'}
   * @example {user: 1, client: 'mobile'}
   */
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret,
    options: Jwt.VerifyOptions & { complete: true },
  ): Promise<Jwt.Jwt>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret,
    options?: Jwt.VerifyOptions & { complete?: false },
  ): Promise<string | Jwt.JwtPayload>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret,
    options?: Jwt.VerifyOptions,
  ): Promise<string | Jwt.Jwt | Jwt.JwtPayload>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret | Jwt.GetPublicKeyOrSecret,
    callback?: Jwt.VerifyCallback<string | Jwt.JwtPayload>,
  ): Promise<void>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret | Jwt.GetPublicKeyOrSecret,
    options: Jwt.VerifyOptions & { complete: true },
    callback?: Jwt.VerifyCallback<Jwt.Jwt>,
  ): Promise<void>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret | Jwt.GetPublicKeyOrSecret,
    options?: Jwt.VerifyOptions & { complete?: false },
    callback?: Jwt.VerifyCallback<string | Jwt.JwtPayload>,
  ): Promise<void>;
  async verify(
    token: string,
    secretOrPublicKey: Jwt.Secret | Jwt.GetPublicKeyOrSecret,
    options?: Jwt.VerifyOptions,
    callback?: Jwt.VerifyCallback<string | Jwt.Jwt | Jwt.JwtPayload>,
  ): Promise<void>;
  async verify(
    token: string,
    secretOrPublicKey: any,
    options?: any,
    callback?: any,
  ): Promise<void | Jwt.Jwt | string | Jwt.JwtPayload> {
    const decoded = this.jwt.verify(
      token,
      secretOrPublicKey,
      options,
      callback,
    );

    if (!Boolean(decoded)) return;

    const { header } =
      this.jwt.decode(token, { complete: true }) || ({} as Record<string, any>);

    const jwtiHeader = header.jwti || {};

    const { user, client } = jwtiHeader as JwtiParams;

    const iat = jwtiHeader.iat || (decoded as any).iat;

    if (!jwtiHeader) {
      const invalidationTime = await this.getTokenInvalidationTime(token);

      let invalid;

      if (iat && typeof iat === 'number' && invalidationTime) {
        invalid = iat - invalidationTime > 0;
      } else {
        invalid = invalidationTime;
      }

      if (invalid)
        throw new InvalidatedTokenError(
          'Token was invalidated in Jwti.',
          InvalidatedTokenError.TYPE_TOKEN,
          Number(invalidationTime),
        );
      return decoded;
    }

    if (!iat || typeof iat !== 'number') {
      return decoded;
    }

    if (this.jwtiParamExists(user) && this.jwtiParamExists(client)) {
      const invalidationTime = await this.getUserClientInvalidationTime(
        user as string | number | Object,
        client as string | number | Object,
      );
      const invalid = invalidationTime && iat - invalidationTime < 0;

      if (invalid)
        throw new InvalidatedTokenError(
          'Token was invalidated in Jwti.',
          InvalidatedTokenError.TYPE_USER_CLIENT,
          invalidationTime,
        );
    }

    if (this.jwtiParamExists(user)) {
      const invalidationTime = await this.getUserInvalidationTime(
        user as string | number | Object,
      );
      const invalid = invalidationTime && iat - invalidationTime < 0;

      if (invalid)
        throw new InvalidatedTokenError(
          'Token was invalidated in Jwti.',
          InvalidatedTokenError.TYPE_USER,
          invalidationTime,
        );
    }

    if (this.jwtiParamExists(client)) {
      const invalidationTime = await this.getUserInvalidationTime(
        client as string | number | Object,
      );
      const invalid = invalidationTime && iat - invalidationTime < 0;

      if (invalid)
        throw new InvalidatedTokenError(
          'Token was invalidated in Jwti.',
          InvalidatedTokenError.TYPE_CLIENT,
          invalidationTime,
        );
    }

    // OPTIONS EXISTS BUT THERE'S NO USER nor CLIENT present
    const invalidationTime = await this.getTokenInvalidationTime(token);
    const invalid = invalidationTime && iat - invalidationTime < 0;
    if (invalid)
      throw new InvalidatedTokenError(
        'Token was invalidated in Jwti.',
        InvalidatedTokenError.TYPE_TOKEN,
        invalidationTime,
      );
    return decoded;
  }
}
