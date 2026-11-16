import _ from "lodash";
import { Request } from "express";
import { Query } from "express-serve-static-core";

// Each of these authenticates a request on its own, so a log line that keeps the whole
// value is a live credential. The header stays, cut to a 7-character prefix: enough to
// tell two keys apart, not enough to replay one. Node lowercases incoming header names.
export const keyHeaders = [
  "authorization",
  "apikey",
  "personnelapikey",
  "x-tc-auth-token",
];

// tabletcommand-session reads each of these from the query string when the header is
// absent, and accepts either spelling. signupKey only ever arrives in the query.
export const keyParams = [
  "apikey",
  "personnelapikey",
  "signupkey",
];

// A route can wrap a key name in a longer parameter name, such as deviceApiKey, so match
// the name loosely. Cutting a parameter that holds no credential costs nothing.
export function isKeyParam(name: string): boolean {
  const lower = decodeName(name).toLowerCase();
  return keyParams.some((keyParam) => lower.includes(keyParam));
}

// Express decodes the name before tabletcommand-session reads it, so api%6Bey
// authenticates as apikey and has to be matched the same way. decodeURIComponent throws
// on a malformed escape, and this runs in a res "finish" listener where a throw ends the
// process.
export function decodeName(name: string): string {
  try {
    return decodeURIComponent(name.replace(/\+/g, " "));
  } catch {
    return name;
  }
}

export const redacted = "<redacted>";

export function keepPrefix(value: string): string {
  return value.substring(0, 7);
}

// Every scheme this service accepts is a short word, such as Bearer or Basic.
const schemePattern = /^[A-Za-z]{1,20}$/;

// A scheme fills the whole prefix on its own, so keep it and take the prefix from the
// credential behind it. A first word that is not a scheme is part of the credential, so
// cut the value whole rather than keep that word.
export function redactAuthorization(value: string): string {
  const [scheme, ...rest] = value.split(" ");
  if (rest.length === 0 || !schemePattern.test(scheme)) {
    return keepPrefix(value);
  }
  return `${scheme} ${keepPrefix(rest.join(" "))}`;
}

// Cookie names answer "did the caller send a session at all", so they stay and the values go.
export function redactCookie(value: string): string {
  return value
    .split(";")
    .map((pair) => pair.split("=")[0].trim())
    .filter((name) => name !== "")
    .map((name) => `${name}=${redacted}`)
    .join("; ");
}

// Set-Cookie header contains the cookie pair first, followed by optional attributes
// (e.g. "session=SECRET; Path=/; Domain=.tabletcommand.com; Max-Age=3600; HttpOnly; Secure; SameSite=None").
// Redact only the first pair's value while keeping attributes intact for security auditing.
export function redactSetCookie(value: string): string {
  if (!value || value.trim() === "") {
    return "";
  }
  const parts = value.split(";");
  const first = parts[0].trim();
  if (first === "") {
    return "";
  }
  const equalsIndex = first.indexOf("=");
  const firstRedacted =
    equalsIndex < 0
      ? `${first}=${redacted}`
      : `${first.substring(0, equalsIndex).trim()}=${redacted}`;

  const attributes = parts
    .slice(1)
    .map((attr) => attr.trim())
    .filter((attr) => attr !== "");

  if (attributes.length === 0) {
    return firstRedacted;
  }
  return [firstRedacted, ...attributes].join("; ");
}

export function redactorFor(name: string): (value: string) => string {
  if (name === "cookie") {
    return redactCookie;
  }
  if (name === "set-cookie") {
    return redactSetCookie;
  }
  if (name === "authorization") {
    return redactAuthorization;
  }
  return keepPrefix;
}

// Node only gives a string or an array of strings, so anything else means other
// middleware wrote to req.headers. Drop it rather than throw: this runs in a res
// "finish" listener, where an exception ends the process.
export function redactHeaderValue(name: string, value: unknown): string | string[] {
  const redact = redactorFor(name);
  if (_.isArray(value)) {
    return value.map((entry: unknown) => (_.isString(entry) ? redact(entry) : redacted));
  }
  if (!_.isString(value)) {
    return redacted;
  }
  return redact(value);
}

export function redactHeaders(headers: Request["headers"]): Request["headers"] {
  const clean = { ...headers };
  for (const [name, value] of Object.entries(clean)) {
    const lower = name.toLowerCase();
    const isCookie = lower === "cookie" || lower === "set-cookie";
    if (_.isUndefined(value) || (!isCookie && !keyHeaders.includes(lower))) {
      continue;
    }
    clean[name] = redactHeaderValue(lower, value);
  }
  return clean;
}

export function redactQueryValue(value: Query[string]): Query[string] {
  if (_.isString(value)) {
    return keepPrefix(value);
  }
  if (_.isArray(value)) {
    return value.map((entry: unknown) => (_.isString(entry) ? keepPrefix(entry) : redacted));
  }
  return redacted;
}

export function redactQuery(query: Query): Query {
  const clean: Query = { ...query };
  for (const [name, value] of Object.entries(clean)) {
    if (_.isUndefined(value) || !isKeyParam(name)) {
      continue;
    }
    clean[name] = redactQueryValue(value);
  }
  return clean;
}

export function redactParamPair(pair: string): string {
  const split = pair.indexOf("=");
  if (split < 0 || !isKeyParam(pair.substring(0, split))) {
    return pair;
  }
  return pair.substring(0, split + 1) + keepPrefix(pair.substring(split + 1));
}

// req.originalUrl is relative, so this splits the string rather than parsing a URL. A
// regex over the whole string backtracks for as long as the url, and the url comes from
// the caller. Splitting on "?" as well as "&" reaches a nested url in a parameter value.
export function redactOriginalURL(maybeURL?: string): string {
  if (!_.isString(maybeURL) || maybeURL === "") {
    return "";
  }

  const queryStart = maybeURL.indexOf("?");
  if (queryStart < 0) {
    return maybeURL;
  }

  const path = maybeURL.substring(0, queryStart + 1);
  const parts = maybeURL.substring(queryStart + 1).split(/([?&])/);

  return path + parts.map((part, index) => (index % 2 === 0 ? redactParamPair(part) : part)).join("");
}

// Key names are compared lowercased with "-" and "_" removed, so authToken, auth_token,
// AUTH-TOKEN and x-api-key all match without listing each spelling. The names come from an
// audit of massive-tyrion and tabletcommand-backend-models (request bodies, model fields,
// outgoing request configs).
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, "");
}

// Values under these keys go entirely: a prefix of a password, private key, SSN or door
// code gives away too much of it.
const fullKeyParts = [
  "password",
  "passwd",
  "passphrase",
  "secret",
  "credential",
  "privatekey",
  "signingkey",
  "encryptionkey",
];
const fullKeys = new Set([
  "pass", // user password hash
  "pwd",
  "authpass",
  "salt",
  "ssn",
  "dateofbirth",
  "licensenumber",
  "doorcode",
]);

// Values under these keys keep a 7-character prefix, enough to tell two keys apart.
const prefixKeyParts = [
  "apikey", // apiKey, departmentApiKey, watchDutyApiKey, x-api-key, apiKeyReadOnly, ...
];
const prefixKeys = new Set([
  "signupkey",
  "partnerkey",
  "xpartnerkey",
  "cadkey",
  "vendorkey",
  "licensekey",
  "licensecode",
  "mark43key",
  "authkey",
  "accesscode",
  "joincode",
  "jwt",
  "authheader",
  "sessioncookie",
  "readonlysessioncookie",
  "authtokenplaintext",
]);

// Pagination cursors end in "token" but carry no credential.
const notSecretTokens = ["pagetoken", "paginationtoken"];

export type SecretKind = "full" | "prefix" | "authorization" | "cookie" | "set-cookie";

export function secretKind(key: string): SecretKind | null {
  const name = normalizeKey(key);
  if (name === "authorization") {
    return "authorization";
  }
  if (name === "cookie" || name === "cookies") {
    return "cookie";
  }
  if (name === "setcookie") {
    return "set-cookie";
  }
  if (fullKeys.has(name) || fullKeyParts.some((part) => name.includes(part))) {
    return "full";
  }
  if (prefixKeys.has(name) || prefixKeyParts.some((part) => name.includes(part))) {
    return "prefix";
  }
  // accessToken, refresh_token, idToken, sessionToken, x-tc-auth-token, deviceToken, ...
  if (name.endsWith("token") && !notSecretTokens.some((part) => name.endsWith(part))) {
    return "prefix";
  }
  return null;
}

function redactString(kind: SecretKind, value: string): string {
  switch (kind) {
    case "full":
      return redacted;
    case "authorization":
      return redactAuthorization(value);
    case "cookie":
      return redactCookie(value);
    case "set-cookie":
      return redactSetCookie(value);
    default:
      return keepPrefix(value);
  }
}

// Booleans, numbers and null under a secret name are flags and settings (hasAuthSecret,
// minPasswordLength), not secrets, so they stay readable.
export function redactSecretValue(kind: SecretKind, value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(kind, value);
  }
  if (Array.isArray(value)) {
    return value.map((entry: unknown) => (typeof entry === "string" ? redactString(kind, entry) : redacted));
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  return redacted;
}

// Deeper than this the walk stops and leaves the value as it is. It bounds the cost of a
// large or cyclic object; real log payloads sit well inside it.
export const MAX_REDACT_DEPTH = 10;

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasToJSON(value: object): value is { toJSON: () => unknown } {
  return typeof (value as { toJSON?: unknown }).toJSON === "function";
}

function walk(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object" || depth > MAX_REDACT_DEPTH) {
    return value;
  }

  // Mongoose documents, axios errors and the like serialize through toJSON, so redact
  // what will actually be written. Other class instances (raw req/res, Error) are left
  // to their serializers.
  let source: unknown = value;
  if (!Array.isArray(value) && !isPlainObject(value)) {
    if (!hasToJSON(value) || value instanceof Date) {
      return value;
    }
    source = value.toJSON();
    if (source === null || typeof source !== "object") {
      return source;
    }
    if (!Array.isArray(source) && !isPlainObject(source)) {
      return source;
    }
  }

  if (Array.isArray(source)) {
    let copy: unknown[] | null = null;
    source.forEach((entry: unknown, index: number) => {
      const next = walk(entry, depth + 1);
      if (next !== entry) {
        copy = copy || source.slice();
        copy[index] = next;
      }
    });
    return copy || source;
  }

  // Copy on write: the caller's object is never changed, and an object with nothing to
  // redact is returned as it is.
  const record = source as Record<string, unknown>;
  let copy: Record<string, unknown> | null = null;
  for (const key of Object.keys(record)) {
    const entry = record[key];
    const kind = secretKind(key);
    const next = kind ? redactSecretValue(kind, entry) : walk(entry, depth + 1);
    if (next !== entry) {
      copy = copy || { ...record };
      copy[key] = next;
    }
  }
  return copy || source;
}

// Redacts every secret-named key in a log object, bindings or serialized value.
export function redactSecrets<T>(value: T): T {
  return walk(value, 0) as T;
}
