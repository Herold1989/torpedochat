import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { PDFLoader} from "langchain/document_loaders/fs/pdf";

const f = createUploadthing();
 
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {

      const { getUser } = getKindeServerSession()
      const user = getUser()

      if(!user || !user.id) throw new Error("Unauthorized")
 
      return { userId: user.id};
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
      })

      try {
        const response = await fetch(`https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`)
        const blob = await response.blob()

        const loader = new PDFLoader(blob)
        const pageLevelDocs = await loader.load()

        const pagesAmt = pageLevelDocs.length

        //vectorize and index entire document

      } catch (err) {
        
      }

    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;