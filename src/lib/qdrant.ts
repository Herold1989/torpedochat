import { QdrantClient } from '@qdrant/js-client-rest'

export const getQdrantClient = () => {
  const client = new QdrantClient({
    apiKey: process.env.QDRANT_API_KEY!,
    url: process.env.QDRANT_URL!,
    port: 6333,
  })

  return client
}