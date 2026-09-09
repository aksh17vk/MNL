import { describe, expect, it } from "vitest";

import {
  buildMeta,
  paginationQuerySchema,
  toSkipTake
} from "../../src/lib/pagination.js";

describe("pagination", () => {
  it("defaults to the first page of 20", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces query strings to numbers", () => {
    expect(paginationQuerySchema.parse({ page: "3", limit: "5" })).toEqual({
      page: 3,
      limit: 5
    });
  });

  it("rejects a page below 1 and a limit above 100", () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("converts a page into skip/take", () => {
    expect(toSkipTake({ page: 3, limit: 20 })).toEqual({ skip: 40, take: 20 });
  });

  it("rounds the page count up", () => {
    expect(buildMeta({ page: 1, limit: 20 }, 41).totalPages).toBe(3);
  });

  it("reports zero pages for an empty result", () => {
    expect(buildMeta({ page: 1, limit: 20 }, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    });
  });
});
