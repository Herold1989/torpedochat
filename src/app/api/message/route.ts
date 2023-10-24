import { getQdrantClient } from "@/app/lib/Qdrant";
import { SendMessageValidator } from "@/app/lib/validators/sendMessageValidator";
import { db } from "@/db";
import { openai } from "@/lib/openai";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { QdrantVectorStore } from "langchain/vectorstores/qdrant";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  //endpoint for asking a question to a pdf file

  const body = await req.json();
  const { getUser } = getKindeServerSession();
  const user = getUser();

  const { id: userId } = user;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { fileId, message } = SendMessageValidator.parse(body);

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) return new Response("Not found", { status: 404 });

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  });

  //

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

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    new OpenAIEmbeddings(),
    {
      url: process.env.QDRANT_URL,
      collectionName: collectionName,
    }
  );

  const results = await vectorStore.similaritySearch(message, 4);

  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    stream: true,
    messages: []
      
  });

};
