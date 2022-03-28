import jwt from 'jsonwebtoken';
import {
  createClient,
  RedisClientType,
  RedisDefaultModules,
  RedisModules,
  RedisScripts,
} from 'redis';
import { RedisMemoryServer } from 'redis-memory-server';
import { Jwti } from '../src';
import { InvalidatedTokenError, JwtiError } from '../src/errors';

let redisServer: RedisMemoryServer;
let redisClient: RedisClientType<
  RedisDefaultModules & RedisModules,
  RedisScripts
>;

const setup = async () => {
  redisServer = new RedisMemoryServer({ instance: { port: 49474 } });
  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  const url = `redis://${host}:${port}`;

  redisClient = createClient({ url });
  await redisClient.connect();
};

const tearDown = async () => {
  await redisClient.disconnect();
  await redisServer.stop();
};

beforeEach(async () => {
  await setup();
});

afterEach(async () => {
  await tearDown();
});

test('InvalidatedTokenError (type token) after sign() and invalidate(TOKEN)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET');
    await jwti.invalidate(token);
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('InvalidatedTokenError (type token) after sign(USER) and invalidate(TOKEN)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', { user: 1 });
    await jwti.invalidate(token);
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('validate token after sign(USER) and invalidate(different USER)', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const token = await jwti.sign('PAYLOAD', 'SECRET', { user: 1 });
  await jwti.invalidate({ user: 2 });
  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('InvalidatedTokenError (type user) after sign(USER) and invalidate(same USER)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', { user: 1 });
    await jwti.invalidate({ user: 1 });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('InvalidatedTokenError (type token) after sign(CLIENT) and invalidate(TOKEN)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', { client: 'web' });
    await jwti.invalidate(token);
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('validate token after sign(CLIENT) and invalidate(USER)', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const token = await jwti.sign('PAYLOAD', 'SECRET', { client: 'web' });
  await jwti.invalidate({ user: 1 });
  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('validate token after sign(CLIENT) and invalidate(different CLIENT)', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const token = await jwti.sign('PAYLOAD', 'SECRET', { client: 'web' });
  await jwti.invalidate({ client: 'mobile' });
  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('InvalidatedTokenError (type client) after sign(CLIENT) and invalidate(same CLIENT)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', { client: 'web' });
    await jwti.invalidate({ client: 'web' });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('InvalidatedTokenError (type token) after sign(USER, CLIENT) and invalidate(TOKEN)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', {
      user: 1,
      client: 'web',
    });
    await jwti.invalidate(token);
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('validate token after sign(USER, CLIENT) and invalidate(different USER)', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user: 1,
    client: 'web',
  });
  await jwti.invalidate({ user: 2 });
  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('validate token after sign(USER, CLIENT) and invalidate(different CLIENT)', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user: 1,
    client: 'web',
  });
  await jwti.invalidate({ client: 'mobile' });
  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('InvalidatedTokenError (type user) after sign(USER, CLIENT) and invalidate(same USER)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', {
      user: 1,
      client: 'web',
    });
    await jwti.invalidate({ user: 1 });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('InvalidatedTokenError (type client) after sign(USER, CLIENT) and invalidate(same CLIENT)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', {
      user: 1,
      client: 'web',
    });
    await jwti.invalidate({ client: 'web' });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('InvalidatedTokenError (type user-client) after sign(USER, CLIENT) and invalidate(same USER, same CLIENT)', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const token = await jwti.sign('PAYLOAD', 'SECRET', {
      user: 1,
      client: 'web',
    });
    await jwti.invalidate({
      user: 1,
      client: 'web',
    });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }
});

test('InvalidatedTokenError (type user) after sign(USER) and invalidate(same USER) being user an object', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const user = { name: 'John', id: 1, lastOnline: new Date() };
    const token = await jwti.sign('PAYLOAD', 'SECRET', { user });
    await jwti.invalidate({ user });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('InvalidatedTokenError (type client) after sign(CLIENT) and invalidate(same CLIENT) being client an object', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const client = { device: 'desktop', app: 'mobile' };
    const token = await jwti.sign('PAYLOAD', 'SECRET', { client });
    await jwti.invalidate({ client });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('InvalidatedTokenError (type client) after sign(USER, CLIENT) and invalidate(same USER, same CLIENT) being user and client an object', async () => {
  try {
    const jwti = new Jwti(jwt, redisClient);
    const user = { name: 'John', id: 1, lastOnline: new Date() };
    const client = { device: 'desktop', app: 'mobile' };
    const token = await jwti.sign('PAYLOAD', 'SECRET', { user, client });
    await jwti.invalidate({ user, client });
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }
});

test('token signed after an user-client invalidation should be valid when using precise flag', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const firstToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user, client });
  const secondToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  try {
    await jwti.verify(firstToken, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }

  const decoded = await jwti.verify(secondToken, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('token signed after a user invalidation should be valid when using precise flag', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const firstToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user });
  const secondToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  try {
    await jwti.verify(firstToken, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }

  const decoded = await jwti.verify(secondToken, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('token signed after a client invalidation should be valid when using precise flag', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const firstToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ client });
  const secondToken = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  try {
    await jwti.verify(firstToken, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }

  const decoded = await jwti.verify(secondToken, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

//
// --------------------------- REVERT
//

test('invalidated token should NOT be valid after revert is called with user param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  await jwti.invalidate(token);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }

  const reverted = await jwti.revert({ user });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('invalidated token should NOT be valid after revert is called with client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  await jwti.invalidate(token);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }

  const reverted = await jwti.revert({ client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('invalidated token should NOT be valid after revert is called with user AND client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });

  await jwti.invalidate(token);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }

  const reverted = await jwti.revert({ user, client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }
});

test('invalidated token should be valid again after revert is called with token param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate(token);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('token');
  }

  await jwti.revert(token);

  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('invalidated user token should NOT be valid after revert is called with token param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }

  const reverted = await jwti.revert(token);

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('invalidated user token should NOT be valid after revert is called with client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }

  const reverted = await jwti.revert({ client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('invalidated user token should NOT be valid after revert is called with user-lcient param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }

  const reverted = await jwti.revert({ user, client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }
});

test('invalidated user token should be valid again after revert is called with user param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('user');
  }

  await jwti.revert({ user });

  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('invalidated client token should NOT be valid after revert is called with token param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }

  const reverted = await jwti.revert(token);

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('invalidated client token should NOT be valid after revert is called with user param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }

  const reverted = await jwti.revert({ user });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('invalidated client token should NOT be valid after revert is called with user AND client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }

  const reverted = await jwti.revert({ user, client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }
});

test('invalidated client token should be valid again after revert is called with client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe('client');
  }

  await jwti.revert({ client });

  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});

test('invalidated user-client token should NOT be valid after revert is called with token param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user, client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }

  const reverted = await jwti.revert(token);

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }
});

test('invalidated user-client token should NOT be valid after revert is called with user param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user, client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }

  const reverted = await jwti.revert({ user });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }
});

test('invalidated user-client token should NOT be valid after revert is called with client param', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user, client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }

  const reverted = await jwti.revert({ client });

  expect(reverted).toBe(false);

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }
});

test('invalidated user-client token should be valid again after revert is called with user AND client params', async () => {
  const jwti = new Jwti(jwt, redisClient);
  const user = { name: 'John', id: 1, lastOnline: new Date() };
  const client = { device: 'desktop', app: 'mobile' };
  const precise = true;
  const token = await jwti.sign('PAYLOAD', 'SECRET', {
    user,
    client,
    precise,
  });
  await jwti.invalidate({ user, client });

  try {
    await jwti.verify(token, 'SECRET');
  } catch (error) {
    expect(error).toBeInstanceOf(JwtiError);
    expect(error).toBeInstanceOf(InvalidatedTokenError);
    expect((error as InvalidatedTokenError).isJwtiError).toBe(true);
    expect((error as InvalidatedTokenError).invalidationType).toBe(
      'user-client',
    );
  }

  await jwti.revert({ user, client });

  const decoded = await jwti.verify(token, 'SECRET');
  expect(decoded).toBe('PAYLOAD');
});
