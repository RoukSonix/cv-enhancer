import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing auth
vi.mock("@/lib/prisma", () => ({
  prisma: {
    roast: {
      updateMany: vi.fn(),
    },
  },
}));

// Mock next-auth and providers to isolate callback testing
vi.mock("next-auth", () => {
  return {
    default: vi.fn((config: Record<string, unknown>) => {
      // Expose the config for testing callbacks
      return {
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
        _config: config,
      };
    }),
  };
});

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", name: "Google", type: "oauth" })),
}));

vi.mock("next-auth/providers/resend", () => ({
  default: vi.fn(() => ({ id: "resend", name: "Resend", type: "email" })),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

import { prisma } from "@/lib/prisma";

const mockUpdateMany = prisma.roast.updateMany as ReturnType<typeof vi.fn>;

// We need to dynamically extract the callbacks from the NextAuth config
// Import will trigger the NextAuth mock
let authConfig: {
  callbacks: {
    jwt: (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Record<string, unknown>;
    session: (args: { session: Record<string, unknown>; token: Record<string, unknown> }) => Record<string, unknown>;
    signIn: (args: { user: Record<string, unknown> }) => Promise<boolean>;
  };
};

beforeEach(async () => {
  vi.clearAllMocks();
  // Re-import to get fresh config
  const NextAuth = (await import("next-auth")).default as unknown as {
    (...args: unknown[]): { _config: typeof authConfig };
  };
  // Import auth module to trigger NextAuth call
  vi.resetModules();
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      roast: {
        updateMany: mockUpdateMany,
      },
    },
  }));
  vi.doMock("next-auth", () => ({
    default: vi.fn((config: typeof authConfig) => {
      authConfig = config;
      return {
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
      };
    }),
  }));
  vi.doMock("next-auth/providers/google", () => ({
    default: vi.fn(() => ({ id: "google" })),
  }));
  vi.doMock("next-auth/providers/resend", () => ({
    default: vi.fn(() => ({ id: "resend" })),
  }));
  vi.doMock("@auth/prisma-adapter", () => ({
    PrismaAdapter: vi.fn(() => ({})),
  }));
  await import("@/lib/auth");
});

describe("Auth.js callbacks", () => {
  describe("jwt callback", () => {
    it("includes userId and isAdmin when user is present", () => {
      const token = { sub: "123" };
      const user = { id: "user-1", isAdmin: true };

      const result = authConfig.callbacks.jwt({ token, user });

      expect(result.userId).toBe("user-1");
      expect(result.isAdmin).toBe(true);
    });

    it("defaults isAdmin to false when not set", () => {
      const token = { sub: "123" };
      const user = { id: "user-2" };

      const result = authConfig.callbacks.jwt({ token, user });

      expect(result.userId).toBe("user-2");
      expect(result.isAdmin).toBe(false);
    });

    it("does not modify token when no user (refresh)", () => {
      const token = { sub: "123", userId: "user-1", isAdmin: true };

      const result = authConfig.callbacks.jwt({ token });

      expect(result.userId).toBe("user-1");
      expect(result.isAdmin).toBe(true);
    });
  });

  describe("session callback", () => {
    it("exposes userId and isAdmin on session.user", () => {
      const session = { user: { name: "Test", email: "t@t.com" } };
      const token = { userId: "user-1", isAdmin: true };

      const result = authConfig.callbacks.session({ session, token }) as {
        user: { id: string; isAdmin: boolean };
      };

      expect(result.user.id).toBe("user-1");
      expect(result.user.isAdmin).toBe(true);
    });
  });

  describe("signIn callback", () => {
    it("links roasts by normalized email", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 2 });

      const result = await authConfig.callbacks.signIn({
        user: { id: "user-1", email: "Test@Example.COM" },
      });

      expect(result).toBe(true);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "test@example.com", userId: null },
        data: { userId: "user-1" },
      });
    });

    it("does not link roasts with different email", async () => {
      const result = await authConfig.callbacks.signIn({
        user: { id: "user-1", email: "user@example.com" },
      });

      expect(result).toBe(true);
      // updateMany is called with the user's email only
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "user@example.com", userId: null },
        data: { userId: "user-1" },
      });
    });

    it("does not overwrite roasts already linked to another user", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 0 });

      await authConfig.callbacks.signIn({
        user: { id: "user-2", email: "test@example.com" },
      });

      // The WHERE clause includes userId: null, so already-linked roasts are not touched
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "test@example.com", userId: null },
        data: { userId: "user-2" },
      });
    });

    it("skips linking when user has no email", async () => {
      const result = await authConfig.callbacks.signIn({
        user: { id: "user-1" },
      });

      expect(result).toBe(true);
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("skips linking when user has no id", async () => {
      const result = await authConfig.callbacks.signIn({
        user: { email: "test@example.com" },
      });

      expect(result).toBe(true);
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });
});

describe("isAdminAuthorized", () => {
  it("returns true for session with isAdmin", async () => {
    // Reset modules to set up auth mock with controlled session
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockResolvedValue({
      user: { id: "user-1", isAdmin: true },
    });

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    const { isAdminAuthorized } = await import("@/lib/auth");
    const req = new Request("http://localhost/api/admin/stats");
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(true);
  });

  it("returns false for session without isAdmin", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockResolvedValue({
      user: { id: "user-1", isAdmin: false },
    });

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    const { isAdminAuthorized } = await import("@/lib/auth");
    const req = new Request("http://localhost/api/admin/stats");
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(false);
  });

  it("accepts ADMIN_TOKEN as Bearer header fallback", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockResolvedValue(null);

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    process.env.ADMIN_TOKEN = "test-token-123";

    const { isAdminAuthorized } = await import("@/lib/auth");
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: "Bearer test-token-123" },
    });
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(true);

    delete process.env.ADMIN_TOKEN;
  });

  it("falls through to ADMIN_TOKEN when auth() throws MissingSecret", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockRejectedValue(new Error("MissingSecret"));

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    process.env.ADMIN_TOKEN = "test-token-123";

    const { isAdminAuthorized } = await import("@/lib/auth");
    const req = new Request("http://localhost/api/admin/stats", {
      headers: { authorization: "Bearer test-token-123" },
    });
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(true);
    expect(mockAuth).toHaveBeenCalled();

    delete process.env.ADMIN_TOKEN;
  });

  it("returns false when auth() throws and no ADMIN_TOKEN is set", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockRejectedValue(new Error("MissingSecret"));

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    delete process.env.ADMIN_TOKEN;

    const { isAdminAuthorized } = await import("@/lib/auth");
    const req = new Request("http://localhost/api/admin/stats");
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(false);
  });

  it("accepts query token when auth() throws", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: { roast: { updateMany: vi.fn() } },
    }));

    const mockAuth = vi.fn().mockRejectedValue(new Error("MissingSecret"));

    vi.doMock("next-auth", () => ({
      default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: mockAuth,
      })),
    }));
    vi.doMock("next-auth/providers/google", () => ({
      default: vi.fn(() => ({ id: "google" })),
    }));
    vi.doMock("next-auth/providers/resend", () => ({
      default: vi.fn(() => ({ id: "resend" })),
    }));
    vi.doMock("@auth/prisma-adapter", () => ({
      PrismaAdapter: vi.fn(() => ({})),
    }));

    process.env.ADMIN_TOKEN = "test-token-123";

    const { isAdminAuthorized } = await import("@/lib/auth");
    const url = new URL("http://localhost/api/admin/stats?token=test-token-123");
    const req = {
      headers: new Headers(),
      nextUrl: url,
    };
    const result = await isAdminAuthorized(
      req as unknown as import("next/server").NextRequest
    );

    expect(result).toBe(true);

    delete process.env.ADMIN_TOKEN;
  });
});
