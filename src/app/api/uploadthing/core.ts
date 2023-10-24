import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { getQdrantClient } from "@/app/lib/Qdrant";
import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { log } from "console";

const f = createUploadthing();

export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      const { getUser } = getKindeServerSession();
      const user = getUser();

      if (!user || !user.id) throw new Error("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`,
          uploadStatus: "PROCESSING",
        },
      });

      try {
        const response = await fetch(
          `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`
        );
        const blob = await response.blob();

        const loader = new PDFLoader(blob);
        const pageLevelDocs = await loader.load();

        const pagesAmt = pageLevelDocs.length;

        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Qdrant part - Vector indexing PDF
        const collectionName = "torpedochat";

        const qdrant = await getQdrantClient();
        const qdrantResponse = await qdrant.getCollections();
        
        const collectionNames = qdrantResponse.collections.map(
          (collection) => collection.name
        );

        if (collectionNames.includes(collectionName)) {
          await qdrant.deleteCollection(collectionName);
        }

        await qdrant.createCollection(collectionName, {
          vectors: {
            size: 1536,
            distance: "Cosine",
          },
          optimizers_config: {
            default_segment_number: 2, // work here
          },
          replication_factor: 2, // work here
        });

        await QdrantVectorStore.fromDocuments(pageLevelDocs, embeddings, {
          url: process.env.QDRANT_URL,
          collectionName: collectionName,
        });
        
        await db.file.update({
          data: {
            uploadStatus: "SUCCESS",
          },
          where: {
            id: createdFile.id,
          },
        });
      } catch (err) {
        console.log(err);
        await db.file.update({
          data: {
            uploadStatus: "FAILED",
          },
          where: {
            id: createdFile.id,
          },
        });
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
