import { QdrantClient } from '@qdrant/js-client-rest';

export const getQdrantClient = () => {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL!,
        apiKey: process.env.QDRANT_API_KEY!,
        port: 6333,
    })
    return client
}

