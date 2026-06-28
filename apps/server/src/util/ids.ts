import { customAlphabet, nanoid } from 'nanoid';

const CODE = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 4);

/** A long opaque id for users, tables, messages. */
export function newId(): string {
  return nanoid(16);
}

/** A short, easy to type table join code. */
export function newTableCode(): string {
  return CODE();
}
