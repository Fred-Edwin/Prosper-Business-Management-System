import type { ErrorCode } from "@/lib/api/response";

/**
 * A domain-layer error carrying an API `code` (CONVENTIONS.md §3) plus an
 * optional `field`. The route layer catches these and translates them 1:1
 * into `fail(e.code, e.message, e.field)` — the domain never imports
 * `NextResponse` or otherwise knows about HTTP.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly field?: string;

  constructor(code: ErrorCode, message: string, field?: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.field = field;
  }
}
