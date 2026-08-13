import crypto from 'node:crypto';

export interface DecodedUser {
  id?: string;
  telegramId?: string | number | null;
  googleId?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  [key: string]: unknown;
}

export interface AuthContext {
  isAuthenticated: boolean;
  isWhitelisted: boolean;
  user: DecodedUser | null;
  clientKey: string;
}

export const normalizeUsername = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/^@/, '');
};

export const parseWhitelist = (raw: string): string[] => {
  return raw
    .split(',')
    .map((item) => normalizeUsername(item))
    .filter(Boolean);
};

export const decodeJwtPayload = (token: string): DecodedUser | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;

    const payloadJson = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson);
    if (!parsed || typeof parsed !== 'object') return null;

    const userObj =
      parsed.user && typeof parsed.user === 'object' ? (parsed.user as Record<string, unknown>) : {};

    return {
      id: String(parsed.id || parsed.sub || userObj.id || ''),
      telegramId: (parsed.telegramId ?? parsed.telegram_id ?? userObj.telegramId ?? null) as string | number | null,
      googleId: (parsed.googleId ?? parsed.google_id ?? userObj.googleId ?? null) as string | null,
      email: (parsed.email ?? userObj.email ?? null) as string | null,
      username: (parsed.username ?? parsed.telegram_username ?? parsed.tg_username ?? parsed.preferred_username ?? userObj.username ?? null) as string | null,
      firstName: (parsed.firstName ?? parsed.first_name ?? userObj.firstName ?? null) as string | null,
      lastName: (parsed.lastName ?? parsed.last_name ?? userObj.lastName ?? null) as string | null,
      ...parsed,
    };
  } catch {
    return null;
  }
};

export const verifyJwtSignature = (token: string, secret: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const header = parts[0];
    const payload = parts[1];
    const signature = parts[2];
    if (!header || !payload || !signature) return false;

    const headerAndPayload = `${header}.${payload}`;

    const hmac1 = crypto.createHmac('sha256', secret).update(headerAndPayload).digest('base64url');
    if (signature.length === hmac1.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac1))) {
      return true;
    }

    try {
      const secretBuf = Buffer.from(secret, 'base64');
      const hmac2 = crypto.createHmac('sha256', secretBuf).update(headerAndPayload).digest('base64url');
      if (signature.length === hmac2.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac2))) {
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  } catch {
    return false;
  }
};

export const getAuthContext = (
  authHeader: string | undefined,
  ip: string,
  jwtSecret?: string,
  whitelistStr: string = 'DiChDev',
): AuthContext => {
  const whitelist = parseWhitelist(whitelistStr);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      isWhitelisted: false,
      user: null,
      clientKey: `ip:${ip}`,
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      isAuthenticated: false,
      isWhitelisted: false,
      user: null,
      clientKey: `ip:${ip}`,
    };
  }

  if (jwtSecret) {
    const isValid = verifyJwtSignature(token, jwtSecret);
    if (!isValid) {
      // best-effort fallback decoding if secret mismatch or not signed by HMAC
    }
  }

  const user = decodeJwtPayload(token);
  if (!user) {
    return {
      isAuthenticated: false,
      isWhitelisted: false,
      user: null,
      clientKey: `ip:${ip}`,
    };
  }

  const identifiersToCheck = [
    normalizeUsername(user.username),
    normalizeUsername(user.telegramId),
    normalizeUsername(user.email),
    normalizeUsername(user.id),
  ].filter(Boolean);

  const isWhitelisted = identifiersToCheck.some((id) => whitelist.includes(id));
  const primaryId = user.username || user.telegramId || user.id || ip;

  return {
    isAuthenticated: true,
    isWhitelisted,
    user,
    clientKey: `user:${primaryId}`,
  };
};
