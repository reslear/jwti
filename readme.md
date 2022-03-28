# jwti

JWT Invalidation uses \"jsonwebtoken\" and \"redis\" to provide a way to handle
multi token/user/client jwt invalidation.

# Setup

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

# Invalidate an specific token

```typescript
const token = await jwti.sign('payload', 'secret');

await jwti.invalidate(token);

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

# Invalidate all previously signed tokens for a user

```typescript
const token = await jwti.sign('payload', 'secret', { user: 1 });

await jwti.invalidate({ user: 1 });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

# Invalidate all previously signed tokens for a client

```typescript
const token = await jwti.sign('payload', 'secret', { client: 'mobile' });

await jwti.invalidate({ client: 'mobile' });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

# Invalidate all **previously** signed tokens for a user on a client

```typescript
const token = await jwti.sign('payload', 'secret', {
  user: 1,
  client: 'mobile',
});

await jwti.invalidate({ user: 1, client: 'mobile' });

// Throws an InvalidatedTokenError
await jwti.verify(token);
```

# Revert invalidations

## tokens

```typescript
const token = await jwti.sign('payload', 'secret');

await jwti.invalidate(token);

const reverted = await jwti.revert(token);

// Outputs 'payload'
await jwti.verify(token);
```

## users

```typescript
const token = await jwti.sign('payload', 'secret', { user: 1 });

await jwti.invalidate({ user: 1 });

const reverted = await jwti.revert({ user: 1 });

// Outputs 'payload'
console.log(await jwti.verify(token));
```

## clients

```typescript
const token = await jwti.sign('payload', 'secret', { client: 'mobile' });

await jwti.invalidate({ client: 'mobile' });

const reverted = await jwti.revert({ client: 'mobile' });

// Outputs 'payload'
console.log(await jwti.verify(token));
```

## user-client comabinations

```typescript
const token = await jwti.sign('payload', 'secret', {
  user: 1,
  client: 'mobile',
});

await jwti.invalidate({ user: 1, client: 'mobile' });

const reverted = await jwti.revert({ user: 1, client: 'mobile' });

// Outputs 'payload'
await jwti.verify(token);
```

# Quick reminder: all new tokens (signed after an invalidation) will be valid

```typescript
const firstToken = await jwti.sign('payload', 'secret', { user: 1 });

await jwti.invalidate({ user: 1 });

const secondToken = await jwti.sign('payload', 'secret', { user: 1 });

// Throws an InvalidatedTokenError
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));
```

# Important: Whenever possible, use precise flag (check full documentation for details in [Github](https://github.com/MarcoASilva/jwti))

Short explanation: `jwti` uses
[jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) under the hood and
jsonwebtoken generated `iat`s (issuedAt property) aren't precise, it strips out
the milleseconds.

E.g: `1648507842001` becomes `1648507842` hence `1648507842000`; `1648507842999`
also becomes `1648507842` hence `1648507842000`

jwti invalidations are precise, and take milleseconds into account. If an
invalidation was set on the same second of a token issuation, that token would
be valid altought it was signed before the invalidation.

E.g:

`token.iat = 1648507842001` becomes `1648507842` hence `1648507842000`;
`invalidation.timesstamp = 1648507842123`;

`token.iat` < `invalidation.timestamp` => token is valid.

This would cause the following weird scenario:

**NOT** using precise flag:

```typescript
const user = { name: 'John Doe', id: 1 };

const firstToken = await jwti.sign(user, 'secret', { user: 1 });

await jwti.invalidate({ user: 1 });

const secondToken = await jwti.sign(user, 'secret', { user: 1 });

// Outputs 'payload'
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));

//Both tokens are valid even though one of them was issued before an invalidation was made.
```

So `jwti` can generate it's own `iat` with milleseconds precision to get around
that problem. You just need pass `precise: true` in the options object.

**USING** precise flag:

```typescript
const user = { name: 'John Doe', id: 1 };

const firstToken = await jwti.sign(user, 'secret', { user: 1, precise: true });

await jwti.invalidate({ user: 1 });

const secondToken = await jwti.sign(user, 'secret', { user: 1, precise: true });

// Throws an InvalidatedTokenError without a chance of failing
console.log(await jwti.verify(firstToken));

// Outputs 'payload'
console.log(await jwti.verify(secondToken));
```
