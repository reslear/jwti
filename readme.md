# jwti

JWT Invalidation uses \"jsonwebtoken\" and \"redis\" to provide a way to handle
multi token/user/client jwt invalidation.

This library takes [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken),
and [redis]((https://www.npmjs.com/package/redis) in order to provide a method
to be used for blocklisting previously issued tokens.

There are some scenarios where you need to revoke users' sessions, in this
[answer](https://stackoverflow.com/a/36884683/7200626) you can see some of them:

- User's account is deleted/blocked/suspended.

- User's password is changed.

- User's roles or permissions are changed.

- User is logged out by admin.

- Any other application critical data in the JWT token is changed by the site
  admin.

`Jwti` uses a blocklist approach for invalidating tokens, and its upsides are:

- Less entries if compared to storing valid tokens instead of the revoked ones.
- Less data to persist (if you want to persist)
- You can still create tokens using just [jsonwebtoken]
  (https://www.npmjs.com/package/jsonwebtoken) for basic usage.

It exposes a simple method (`jwti.invalidate()`) for creating invalidations on a
given token, a given user, a given client or even a given user-client
combination.

This makes it possible to invalidate all previously signed tokens for a given
user (who just logged out for example), or signout a user from a given client
(mobile for example).

[redis]((https://www.npmjs.com/package/redis) is used to keep the state of the
invalidations and is up to you how you want to configure your redis server,
choosing wheather you want to persist the data, how you want to persist and
where you want to keep your server running. The only thing you have to do is to
give jwti a redis client already connected, so it can keep its state.

# (Peer)Dependencies

- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
- [redis]((https://www.npmjs.com/package/redis)

# Installation

Npm

```javascript
npm install jwti
```

Yarn

```javascript
yarn add jwti
```

# Quick start

## Setup

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);
  //...
})();
```

## jwti.sign(payload, secretOrPrivateKey, [options, callback]): Promise<jsonwebtoken return>

jwti sign method is pretty much similar to jsonwebtoken sign method signature.

The differences are:

1. jwti always returns a promise of the jsonwebtoken return
1. jwti has it's own options for advanced cases

`options`:

- **all [options](https://www.npmjs.com/package/jsonwebtoken) from jsonwebtoken
  sign method, plus:**
- `user: string | number | object`: represents the user of the token to be
  signed.
  > Eg: `1`, `"7c627d3a-e510-4f94-b93c-aec56e828ebd"`,
  > `{id: 1, name: 'John Doe'}`. The last type (object) is not recommended
  > because, if there's any change to the user's object, invalidations can be
  > ineffective.
- `client: string | number | object`: represents the client of the token to be
  signed.
  > Eg: `1`, `"mobile"`, `{device: 'mobile', app: 'admin'}`
- `precise: boolean` (default: false): if true jwti will use its own `iat`
  (issuedAt) property
  > `jsonwebtoken`'s `iat` ignores millis. Jwti cover's some
  > [edge cases](#-Edge-cases) using it's own precise issuedAt property.

`jwti` calls [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) `sign`
method under the hood and the resulting token is no different from the one
returned by calling `jsonwebtoken.sign` directly, unless jwti's options are used
(`user`, `client`, `precise`)

```typescript
const token = await jwti.sign('payload', 'secret');
```

same token as

```typescript
const token = jsonwebtoken.sign('payload', 'secret');
```

but different than

```typescript
const token = await jwti.sign('payload', 'secret', {
  user: 1,
  client: 'mobile',
  precise: true,
});
```

## jwti.invalidate(token || {user, client}): Promise<void>

### Invalidate an specific token

> If you are going to invalidate tokens individually you can opt to use
> [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) library or `jwti`
> for creating/signing tokens. Beucase jwti is using jsonwebtoken under the hood
> and expose almost the same signature for sign and verify method (the only
> difference is that jwti always returns a **Promise** of the `jsonwebtoken`
> return).

```typescript
const token = await jwti.sign('payload', 'secret');
// or
const token = jsonwebtoken.sign('payload', 'secret');

// Invalidates the one specific token
await jwti.invalidate(token);

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

### Invalidate all previously signed tokens for a user

To invalidate tokens by an user identifier you MUST **sign** them using
`jwti.sign`, altough you have all options and overloads from [jsonwebtoken]
(https://www.npmjs.com/package/jsonwebtoken).

```typescript
const token = await jwti.sign('payload', 'secret', { user: 1 });

// All tokens previously signed for user: 1 will be invalidated
await jwti.invalidate({ user: 1 });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

### Invalidate all previously signed tokens for a client

```typescript
const token = await jwti.sign('payload', 'secret', { client: 'mobile' });

// All tokens previously signed with client: 'mobile' will be invalidated
await jwti.invalidate({ client: 'mobile' });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

### Invalidate all **previously** signed tokens for a user on a client

```typescript
const token = await jwti.sign('payload', 'secret', {
  user: 1,
  client: 'mobile',
});
// All tokens previously signed with user: 1 and client: 'mobile' will be invalidated
await jwti.invalidate({ user: 1, client: 'mobile' });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

#### Quick reminder: all new tokens (signed after an invalidation) will be valid

> See [edge-cases](#-Edge-cases) also

```typescript
const firstToken = await jwti.sign('payload', 'secret', { user: 1 });
await jwti.invalidate({ user: 1 });
const secondToken = await jwti.sign('payload', 'secret', { user: 1 });

// Throws an InvalidatedTokenError
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));
```

## jwti.verify(token, secretOrPublicKey, [options, callback]): Promise<jsonwebtoken return>

jwti verify method is pretty much similar to jsonwebtoken verify method
signature.

The differences are:

1. jwti always returns a promise of the `jsonwebtoken.verify` return
1. `jwti` does a 3-step verification on the token:

- verify it using [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
  `verify` method with all the parameters passed along
- verify if the token has an invalidation set (`jwti.invalidate(token)`)
- verify if there's an invalidation for the `token`, `user`, `client` or `user`
  AND `client` combination

_P.S: **Step 3 only happens when the token was signed using `jwti` instead of
`jsonwebtoken` with user and/or client options**_

```typescript
const decoded = await jwti.verify(token, 'secret'));
```

# Complete examples

## Invalidate token

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  // Connect to your redis server
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);
  const token = await jwti.sign('payload', 'secret');

  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));

  // Create an invalidation for the just signed token
  await jwti.invalidate(token);

  // Token is now invalid
  // Throws an InvalidatedTokenError
  try {
    await jwti.verify(token, 'secret');
  } catch (error) {
    // true
    console.log(error instanceof InvalidatedTokenError);
    // true
    console.log(error.isJwtiError);
    // Outputs 'token'
    console.log(error.invalidationType);
  }
})();
```

## Invalidate all tokens from a given user

> **Please _note_ that** for using this feature the token should be previously
> signed with `jwti.sign` and not `jsonwebtoken.sign`.

#### (you can do it manually having properly placed the `user` and/or `client` in the jwt header object under `jwti` property name but it's not recomended).

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  // Connect to your redis server
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);

  // You have to pass an options object containg the user.
  // It can be a number, string or even the user object if it's stringifiable
  // Be very cautious with the last as it's not recommended.
  const token = await jwti.sign('payload', 'secret', { user: 1 });
  // or
  const token = await jwti.sign('payload', 'secret', {
    user: '7c627d3a-e510-4f94-b93c-aec56e828ebd',
  });
  // or
  const token = await jwti.sign('payload', 'secret', {
    user: { _id: '7c627d3a-e510-4f94-b93c-aec56e828ebd', role: 'admin' },
  });

  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));

  // Create an invalidation for ALL the PREVIOUS signed tokens of the given user
  await jwti.invalidate({ user: 1 });
  // or
  await jwti.invalidate({ user: '7c627d3a-e510-4f94-b93c-aec56e828ebd' });
  // or
  await jwti.invalidate({ user: { _id: '7c627d3a-e510-4f94-b93c-aec56e828ebd', role: 'admin' } });

  // Token is now invalid
  // Throws an InvalidatedTokenError
  try {
    await jwti.verify(token, 'secret');
  } catch (error) {
    // true
    console.log(error instanceof InvalidatedTokenError);
    // true
    console.log(error.isJwtiError);
    // Outputs 'user'
    console.log(error.invalidationType);
  }
};)();
```

## Invalidate all tokens from a given client

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  // Connect to your redis server
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);

  // You have to pass an options object containg the client.
  // It can be a number, string or even the client object if it's stringifiable
  // Be very cautious with the last as it's not recommended.
  const token = await jwti.sign('payload', 'secret', { client: 1 });
  // or
  const token = await jwti.sign('payload', 'secret', { client: 'mobile'});
  // or
  const token = await jwti.sign('payload', 'secret', {
    client: { device: 'mobile', app: 'admin' },
  });

  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));

  // Create an invalidation for ALL the PREVIOUS signed tokens for the given client
  await jwti.invalidate({ client: 1 });
  // or
  await jwti.invalidate({ client: 'mobile' });
  // or
  await jwti.invalidate({ client: { _id: 'mobile', role: 'admin' } });


  // Token is now invalid
  // Throws an InvalidatedTokenError
  try {
    await jwti.verify(token, 'secret');
  } catch (error) {
    // true
    console.log(error instanceof InvalidatedTokenError);
    // true
    console.log(error.isJwtiError);
    // Outputs 'client'
    console.log(error.invalidationType);
  }
};)();
```

## Invalidate all tokens from a given user on a given client

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  // Connect to your redis server
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);

  // You have to pass an options object containg the user AND client.
  // Again, both user and client parameters can be number || string || object (stringifiable)
  const token = await jwti.sign('payload', 'secret', { user: 1, client: 'mobile' });

  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));

  // Create an invalidation for all the previous tokens issued for the user 1 using the client 'mobile'
  await jwti.invalidate({ user: 1, client: 'mobile' });

  // Token is now invalid
  // Throws an InvalidatedTokenError
  try {
    await jwti.verify(token, 'secret');
  } catch (error) {
    // true
    console.log(error instanceof InvalidatedTokenError);
    // true
    console.log(error.isJwtiError);
    // Outputs 'user-client'
    console.log(error.invalidationType);
  }
};)();
```

## Revert an invalidation

```typescript
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { Jwti } from 'jwti';

(async () => {
  // Connect to your redis server
  const redis = createClient();
  await redis.connect();

  const jwti = new Jwti(jwt, redis);

  const token = await jwt.sign('payload', 'secret');

  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));

  await jwti.invalidate(token);

  // Token now is invalid
  // Throws an InvalidatedTokenError
  try {
    await jwti.verify(token, 'secret');
  } catch (error) {
    // true
    console.log(error instanceof InvalidatedTokenError);
    // true
    console.log(error.isJwtiError);
    // Outputs 'token'
    console.log(error.invalidationType);
  }

  await jwti.revert(token);

  // Token is valid again
  // Outputs 'payload'
  console.log(await jwti.verify(token, 'secret'));
};)();
```

# API

This library mimic the signature of jsonwebtoken methods `sign` and `verify`
because it actually call those methods with the same parameters as you passed
along but doing some extra work (with redis) to offer invalidation capabilities.

### jwti.sign(payload, secretOrPrivateKey, [options]): Promise<string>

Creates and sign a token using jsonwebtoken

### jwti.verify<T>(token, secretOrPublicKey, [options]): Promise<T>

Verifies a token using jsonwebtoken and redis for invalidations

### jwti.invalidate([token, {user, client}]): Promise<void>

Invalidates a token using redis to keep their state

# Edge cases

When generating tokens, `jsonwebtoken` automatically adds `iat` property to the
payload **IF** `typeof payload === 'object'`. For all the other payload types
(string or buffer) **iat is not generated**.

For those cases where `jsonwebtoken` does not generate issuedAt, `jwti` does.

jwti generated `iat`s are more precise because it takes milliseconds into
consideration. `jsonwebtoken` does not.

E.g: if you generate a given number of tokens, one after the other, using
`jsonwebtoken` they can have the same iat altought they were not generated
exactly at the same time:

```javascript
var jwt = require("jsonwebtoken")

const [t1, t2, t3] = [jwt.sign({t: 1}, 'secret'), jwt.sign({t: 2}, 'secret'), jwt.sign({t: 3}, 'secret')];

const [d1, d2, d3] = [jwt.decode(t1), jwt.decode(t2), jwt.decode(t3)]

console.log(d1, d2, d3);

// Outputs:
Object {t: 1, iat: 1648431003}
Object {t: 2, iat: 1648431003}
Object {t: 3, iat: 1648431003}
```

As you can see those tokens have the same iat because milleseconds were striped
out. This way you need a more precise iat in order to avoid some edge-cases.

`jwti` automatically does that for you if you generate a token which payload is
**NOT** an object.

But if the payload **IS** an **object** `jwti` **relies on jsonwebtoken iat by
default**, and that can cause some trouble, like the one as follows:

```typescript
const firstToken = await jwti.sign({{...user}}, 'secret', { user: 1 });
await jwti.invalidate({ user: 1 });
const secondToken = await jwti.sign({...user}, 'secret', { user: 1 });

// Outputs 'payload'
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));
```

Neither of those tokens would be invalidated because their `iat`s date before
the invalidation timestamp (`jwti` invalidations are precise - they include
milleseconds) once they're generated in the same second range:

<!-- prettier-ignore-start -->
firstToken.iat = 1648431003(000)
invalidation.iat = 1648431003145
firstToken.iat = 1648431003(000)
<!-- prettier-ignore-end -->

So in this scenario, the invalidation happened after both tokens issuation.

So you can use the flag `{precise: true}` to make `jwti` generate its own `iat`
and relies on it for invalidations:

```typescript
const firstToken = await jwti.sign({{...user}}, 'secret', { user: 1, precise: true });
await jwti.invalidate({ user: 1 });
const secondToken = await jwti.sign({...user}, 'secret', { user: 1, precise: true });

// Throws an InvalidatedTokenError
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));
```

<!-- prettier-ignore-start -->
firstToken.iat = 1648431003054)
invalidation.iat = 1648431003145
firstToken.iat = 1648431003258
<!-- prettier-ignore-end -->

# Issues

[jwti](https://github.com/MarcoASilva/jwti/issues)
