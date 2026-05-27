import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock("@/services", () => ({
  createProductRecord: vi.fn(),
  updateProductRecord: vi.fn(),
  listProducts: vi.fn(),
  getProductDetailsRecord: vi.fn(),
}));

import createProduct from "@/controllers/createProduct";
import getProductDetails from "@/controllers/getProductDetails";
import getProducts from "@/controllers/getProducts";
import updateProduct from "@/controllers/updateProduct";
import { getAuthenticatedUser, isAdmin } from "@/lib/auth";
import {
  createProductRecord,
  getProductDetailsRecord,
  listProducts,
  updateProductRecord,
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

const product = {
  id: "product-1",
  sku: "KEYBOARD",
  name: "Keyboard",
  description: null,
  price: 50,
  inventoryId: "inventory-1",
  status: "DRAFT",
};

describe("product controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockReturnValue(admin);
    vi.mocked(isAdmin).mockReturnValue(true);
  });

  it("requires admin access to create products", async () => {
    vi.mocked(getAuthenticatedUser).mockReturnValue(null);
    const unauthorizedRes = createResponse();

    await createProduct({ body: {} } as any, unauthorizedRes as any, vi.fn());

    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    vi.mocked(getAuthenticatedUser).mockReturnValue({ ...admin, role: "USER" });
    vi.mocked(isAdmin).mockReturnValue(false);
    const forbiddenRes = createResponse();

    await createProduct({ body: {} } as any, forbiddenRes as any, vi.fn());

    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });

  it("creates products and maps conflicts", async () => {
    vi.mocked(createProductRecord).mockResolvedValueOnce({
      status: "created",
      product,
    } as any);
    const createdRes = createResponse();

    await createProduct(
      {
        body: {
          sku: "KEYBOARD",
          name: "Keyboard",
          price: 50,
        },
      } as any,
      createdRes as any,
      vi.fn(),
    );

    expect(createdRes.status).toHaveBeenCalledWith(201);
    expect(createdRes.json).toHaveBeenCalledWith(product);

    vi.mocked(createProductRecord).mockResolvedValueOnce({
      status: "conflict",
      message: "Product with the same SKU already exists",
    });
    const conflictRes = createResponse();

    await createProduct(
      {
        body: {
          sku: "KEYBOARD",
          name: "Keyboard",
        },
      } as any,
      conflictRes as any,
      vi.fn(),
    );

    expect(conflictRes.status).toHaveBeenCalledWith(409);
  });

  it("updates products and maps not found", async () => {
    vi.mocked(updateProductRecord).mockResolvedValueOnce({
      status: "updated",
      product: { ...product, name: "Updated Product" },
    } as any);
    const updatedRes = createResponse();

    await updateProduct(
      {
        params: { id: "product-1" },
        body: { name: "Updated Product" },
      } as any,
      updatedRes as any,
      vi.fn(),
    );

    expect(updateProductRecord).toHaveBeenCalledWith("product-1", {
      name: "Updated Product",
    });
    expect(updatedRes.status).toHaveBeenCalledWith(200);
    expect(updatedRes.json).toHaveBeenCalledWith({
      data: { ...product, name: "Updated Product" },
    });

    vi.mocked(updateProductRecord).mockResolvedValueOnce({
      status: "not_found",
    });
    const notFoundRes = createResponse();

    await updateProduct(
      {
        params: { id: "missing" },
        body: { name: "Updated Product" },
      } as any,
      notFoundRes as any,
      vi.fn(),
    );

    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it("lists products with query parsing", async () => {
    vi.mocked(listProducts).mockResolvedValue({
      products: [product],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    } as any);
    const res = createResponse();

    await getProducts(
      {
        query: { page: "1", limit: "20", search: "key" },
      } as any,
      res as any,
      vi.fn(),
    );

    expect(listProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: "key",
    });
    expect(res.json).toHaveBeenCalledWith({
      data: [product],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("returns product details with stock", async () => {
    vi.mocked(getProductDetailsRecord).mockResolvedValue({
      status: "found",
      product,
      stock: 5,
      stockStatus: "In stock",
    } as any);
    const res = createResponse();

    await getProductDetails(
      { params: { id: "product-1" } } as any,
      res as any,
      vi.fn(),
    );

    expect(getProductDetailsRecord).toHaveBeenCalledWith("product-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...product,
      stock: 5,
      stockStatus: "In stock",
    });
  });
});
