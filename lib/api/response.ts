import { NextResponse } from "next/server";

/**
 * Standard API response envelope (CONVENTIONS.md §3).
 *
 * Success: `{ data: <payload> }`
 * Error:   `{ error: { code, message, field? } }`
 *
 * The frontend switches on `error.code`, never on the free-text `message`.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function fail(
  code: ErrorCode,
  message: string,
  field?: string,
  status?: number,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status: status ?? STATUS_BY_CODE[code] },
  );
}
