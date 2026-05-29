import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
  getTrustedInternalService: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("@/services", () => ({
  createInventoryRecord: vi.fn(),
  updateInventoryQuantity: vi.fn(),
  getInventoryQuantity: vi.fn(),
  getInventoryWithHistory: vi.fn(),
}));

import createInventory from "@/controllers/createInventory";
import getInventoryById from "@/controllers/getInventoryById";
import getInventoryDetails from "@/controllers/getInventoryDetails";
import updateInventory from "@/controllers/updateInventory";
import {
  getAuthenticatedUser,
  getTrustedInternalService,
  isAdmin,
} from "@/lib/auth";
import {
  createInventoryRecord,
  getInventoryQuantity,
  getInventoryWithHistory,
  updateInventoryQuantity,
} from "@/services";

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const admin = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
};

describe("inventory controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockReturnValue(admin as any);
    vi.mocked(getTrustedInternalService).mockReturnValue(null);
    vi.mocked(isAdmin).mockReturnValue(true);
  });

  it("requires admin access to create and update inventory", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null as any);
    const unauthorizedRes = createResponse();

    await createInventory({ body: {} } as any, unauthorizedRes as any, vi.fn());

    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    vi.mocked(getAuthenticatedUser).mockReturnValue({
      ...admin,
      role: "USER",
    } as any);
    vi.mocked(isAdmin).mockReturnValue(false);
    const forbiddenRes = createResponse();

    await updateInventory(
      { params: { id: "inventory-1" }, body: {} } as any,
      forbiddenRes as any,
      vi.fn(),
    );

    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });

  it("allows product service to create inventory through a trusted internal call", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null as any);
    vi.mocked(getTrustedInternalService).mockReturnValue("product");
    vi.mocked(createInventoryRecord).mockResolvedValueOnce({
      status: "created",
      inventory: { id: "inventory-1", quantity: 0 },
    });
    const res = createResponse();

    await createInventory(
      {
        body: {
          productId: "product-1",
          sku: "SKU1",
        },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(createInventoryRecord).toHaveBeenCalledWith({
      productId: "product-1",
      sku: "SKU1",
      quantity: 0,
    });
  });

  it("creates inventory and maps conflict responses", async () => {
    vi.mocked(createInventoryRecord).mockResolvedValueOnce({
      status: "created",
      inventory: { id: "inventory-1", quantity: 0 },
    });
    const createdRes = createResponse();

    await createInventory(
      {
        body: {
          productId: "product-1",
          sku: "SKU1",
          quantity: 0,
        },
      } as any,
      createdRes as any,
      vi.fn(),
    );

    expect(createdRes.status).toHaveBeenCalledWith(201);
    expect(createdRes.json).toHaveBeenCalledWith({
      id: "inventory-1",
      quantity: 0,
    });

    vi.mocked(createInventoryRecord).mockResolvedValueOnce({
      status: "conflict",
      message: "Inventory already exists for this product or SKU",
    });
    const conflictRes = createResponse();

    await createInventory(
      {
        body: {
          productId: "product-1",
          sku: "SKU1",
        },
      } as any,
      conflictRes as any,
      vi.fn(),
    );

    expect(conflictRes.status).toHaveBeenCalledWith(409);
  });

  it("updates inventory and maps not found/insufficient states", async () => {
    vi.mocked(updateInventoryQuantity).mockResolvedValueOnce({
      status: "updated",
      inventory: { id: "inventory-1", quantity: 5 },
    });
    const updatedRes = createResponse();

    await updateInventory(
      {
        params: { id: "inventory-1" },
        body: { actionType: "In", quantity: 5 },
      } as any,
      updatedRes as any,
      vi.fn(),
    );

    expect(updateInventoryQuantity).toHaveBeenCalledWith("inventory-1", {
      actionType: "In",
      quantity: 5,
    });
    expect(updatedRes.status).toHaveBeenCalledWith(200);
    expect(updatedRes.json).toHaveBeenCalledWith({
      id: "inventory-1",
      quantity: 5,
    });

    vi.mocked(updateInventoryQuantity).mockResolvedValueOnce({
      status: "insufficient",
    });
    const insufficientRes = createResponse();

    await updateInventory(
      {
        params: { id: "inventory-1" },
        body: { actionType: "Out", quantity: 50 },
      } as any,
      insufficientRes as any,
      vi.fn(),
    );

    expect(insufficientRes.status).toHaveBeenCalledWith(400);
    expect(insufficientRes.json).toHaveBeenCalledWith({
      message: "Insufficient inventory",
    });
  });

  it("returns inventory quantity by id", async () => {
    vi.mocked(getInventoryQuantity).mockResolvedValue({ quantity: 10 } as any);
    const res = createResponse();

    await getInventoryById(
      { params: { id: "inventory-1" } } as any,
      res as any,
      vi.fn(),
    );

    expect(getInventoryQuantity).toHaveBeenCalledWith("inventory-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ quantity: 10 });
  });

  it("returns inventory details with bounded query parsing", async () => {
    vi.mocked(getInventoryWithHistory).mockResolvedValue({
      id: "inventory-1",
      histories: [],
    } as any);
    const res = createResponse();

    await getInventoryDetails(
      {
        params: { id: "inventory-1" },
        query: { historyLimit: "25" },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(getInventoryWithHistory).toHaveBeenCalledWith("inventory-1", 25);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: "inventory-1",
      histories: [],
    });
  });
});
