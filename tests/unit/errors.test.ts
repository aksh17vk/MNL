import { describe, expect, it } from "vitest";

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "../../src/lib/errors.js";
import { failure, success } from "../../src/lib/response.js";

describe("error hierarchy", () => {
  it("carries a status code and a machine-readable code", () => {
    const error = new NotFoundError("Task", "TASK_NOT_FOUND");

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("TASK_NOT_FOUND");
    expect(error.message).toBe("Task not found");
  });

  it("uses the status code the spec expects for each kind", () => {
    expect(new ValidationError().statusCode).toBe(422);
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ConflictError().statusCode).toBe(409);
  });

  it("keeps details when they are supplied", () => {
    const error = new ValidationError("bad", [{ path: "/name" }]);

    expect(error.details).toEqual([{ path: "/name" }]);
  });
});

describe("response envelope", () => {
  it("omits message when none is given", () => {
    expect(success({ id: "1" })).toEqual({ success: true, data: { id: "1" } });
  });

  it("includes message when given", () => {
    expect(success({ id: "1" }, "Created")).toEqual({
      success: true,
      data: { id: "1" },
      message: "Created"
    });
  });

  it("shapes errors as { success: false, error: { code, message } }", () => {
    expect(failure("TASK_NOT_FOUND", "Task not found")).toEqual({
      success: false,
      error: { code: "TASK_NOT_FOUND", message: "Task not found" }
    });
  });
});
