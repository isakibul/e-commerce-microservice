import { AuthenticatedUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserCreateInput,
  UserProfileCreateInput,
  UserUpdateInput,
} from "@/schemas";

export const createUserRecord = async (input: UserCreateInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { authUserId: input.authUserId },
  });
  if (existingUser) {
    return {
      status: "exists" as const,
      user: existingUser,
    };
  }

  try {
    const user = await prisma.user.create({
      data: input,
    });

    return {
      status: "created" as const,
      user,
    };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return {
          status: "conflict" as const,
          message: "User already exists",
        };
      }
    }

    throw error;
  }
};

export const createUserProfileForAuthenticatedUser = async (
  input: UserProfileCreateInput,
  authUser: AuthenticatedUser,
) => {
  return createUserRecord({
    authUserId: authUser.id,
    email: input.email || authUser.email,
    name: input.name || authUser.name,
    address: input.address,
    phone: input.phone,
  });
};

export const updateUserRecord = async (
  id: string,
  input: UserUpdateInput,
  authUser: AuthenticatedUser,
) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return { status: "not_found" as const };
  }

  if (!isAdmin(authUser) && user.authUserId !== authUser.id) {
    return { status: "forbidden" as const };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: input,
    });

    return {
      status: "updated" as const,
      user: updatedUser,
    };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        return {
          status: "conflict" as const,
          message: "User already exists",
        };
      }
    }

    throw error;
  }
};

export const getAuthorizedUser = async ({
  id,
  field,
  authUser,
}: {
  id: string;
  field: "id" | "authUserId";
  authUser: AuthenticatedUser;
}) => {
  const user =
    field === "authUserId"
      ? await prisma.user.findUnique({ where: { authUserId: id } })
      : await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return { status: "not_found" as const };
  }

  if (!isAdmin(authUser) && user.authUserId !== authUser.id) {
    return { status: "forbidden" as const };
  }

  return {
    status: "found" as const,
    user,
  };
};
