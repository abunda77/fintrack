import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const badRequest = (code: string, message: string) =>
  new ApiError(400, code, message);
export const notFound = (code: string, message: string) =>
  new ApiError(404, code, message);
export const conflict = (code: string, message: string) =>
  new ApiError(409, code, message);

/** Membungkus async route handler agar error diteruskan ke middleware error. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function zodToFieldErrors(err: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.join(".") || "form";
    if (!fieldErrors[field]) fieldErrors[field] = [];
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Data yang dikirim tidak valid.",
        fieldErrors: zodToFieldErrors(err),
      },
    });
    return;
  }
  const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: msg, fieldErrors: {} },
  });
}

export function notFoundApiHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Endpoint tidak ditemukan.",
      fieldErrors: {},
    },
  });
}