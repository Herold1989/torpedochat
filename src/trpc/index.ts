import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { privateProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { z } from "zod";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";
import { UTApi } from "uploadthing/server";

export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession();
    const user = getUser();

    if (!user.id || !user.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // check if the user is in the DataBase
    const dbUser = await db.user.findFirst({
      where: {
        id: user.id,
      },
    });

    if (!dbUser) {
      // create user in DB
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
        },
      });
    }

    return { success: true };
  }),
  getUserFiles: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    return await db.file.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }),


  createStripeSession: privateProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx;

    const billingUrl = absoluteUrl("/dashboard/billing");

    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const dbUser = await db.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!dbUser) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const subscriptionPlan = await getUserSubscriptionPlan();

    if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: billingUrl,
      });

      return {
        url: stripeSession.url,
      };
    }

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
      payment_method_types: ["card", "paypal"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price: PLANS.find((plan) => plan.name === "Pro")?.price.priceIds.test,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
      },
    });

    return { url: stripeSession.url };
  }),
  getFileMessages: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        fileId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;
      const { fileId, cursor } = input;
      const limit = input.limit ?? INFINITE_QUERY_LIMIT;

      const file = await db.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      });

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const messages = await db.message.findMany({
        where: {
          fileId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          isUserMessage: true,
          createdAt: true,
          text: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages,
        nextCursor,
      };
    }),
  getFileUploadStatus: privateProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      });
      if (!file) {
        return { status: "PENDING" as const };
      }

      return { status: file.uploadStatus };
    }),
  getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;
      console.log(userId);
      const file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      });

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return file;
    }),

  getAccessToken: privateProcedure.mutation(async () => {
    // Replace these with your actual Kinde credentials
    const client_id = process.env.KINDE_CLIENT_ID;
    const client_secret = process.env.KINDE_CLIENT_SECRET;
    const domain = "torpedochat";

    if (!client_id || !client_secret) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Missing Kinde credentials",
      });
    }

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", client_id);
    params.append("client_secret", client_secret);

    const response = await fetch(`https://${domain}.kinde.com/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Failed to get Kinde access token",
      });
    }

    const data = await response.json();
    return data.access_token;
  }),

  deleteUser: privateProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx;

    // Kinde credentials
    const client_id = process.env.KINDE_CLIENT_ID;
    const client_secret = process.env.KINDE_CLIENT_SECRET;
    const domain = "torpedochat";
    const audience = process.env.KINDE_AUDIENCE!;

    if (!client_id || !client_secret) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Missing Kinde credentials",
      });
    }

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", client_id);
    params.append("client_secret", client_secret);
    params.append("audience", audience); // Include the correct audience parameter

    // Get Access Token
    const response = await fetch(`https://${domain}.kinde.com/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Failed to get Kinde access token",
      });
    }

    const data = await response.json();
    const access_token = data.access_token;

    // Delete user messages
    await db.message.deleteMany({
      where: {
        userId,
      },
    });

    // Fetch all user files
    const userFiles = await db.file.findMany({
      where: {
        userId,
      },
    });

    const utapi = new UTApi({
      fetch: globalThis.fetch,
      apiKey: process.env.UPLOADTHING_SECRET,
    });

    // Delete files from UploadThing
    for (const file of userFiles) {
      await utapi.deleteFiles(file.key);
    }

    // Delete user files from the database
    await db.file.deleteMany({
      where: {
        userId,
      },
    });

    // Delete user from the database
    await db.user.delete({
      where: {
        id: userId,
      },
    });

    const kindeDeleteEndpoint = `https://${domain}.kinde.com/api/v1/user?id=${userId}`;

    const kindeDeleteResponse = await fetch(kindeDeleteEndpoint, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${access_token.trim()}`,
      },
    });

    if (!kindeDeleteResponse.ok) {
      const kindeDeleteError = await kindeDeleteResponse.text();
      console.error("Kinde Delete Error:", kindeDeleteError);
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Failed to delete user from Kinde",
      });
    }

    // Parse and return the deleted user
    const deletedKindeUser = await kindeDeleteResponse.json();
    // Revoke User Token
    //const revokedTokenResult = await revokeTokenResponse.json();
    return deletedKindeUser;
  }),

  deleteFile: privateProcedure
    .input(z.object({ id: z.string(), key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const file = await db.file.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      // Delete ALL messages associated with the file
      await db.message.deleteMany({
        where: {
          fileId: input.id,
        },
      });

      await db.file.delete({
        where: {
          id: input.id,
          key: input.key,
        },
      });

      const utapi = new UTApi({
        fetch: globalThis.fetch,
        apiKey: process.env.UPLOADTHING_SECRET,
      });
      await utapi.deleteFiles(input.key);
      return file;
    }),
});

export type AppRouter = typeof appRouter;
