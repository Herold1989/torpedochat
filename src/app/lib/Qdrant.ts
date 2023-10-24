import {QdrantClient} from '@qdrant/js-client-rest';

// or connect to Qdrant Cloud
{/*export const client = new QdrantClient({
    url: 'https://99ec845a-906f-422e-8758-7152b85acc60.us-east4-0.gcp.cloud.qdrant.io:6333',
    apiKey: process.env.QDRANT_API_KEY
});*/}

export const getQdrantClient = async () => {
    const client = new QdrantClient({
        url: 'https://99ec845a-906f-422e-8758-7152b85acc60.us-east4-0.gcp.cloud.qdrant.io:6333',
        apiKey: process.env.QDRANT_API_KEY
    })
    return client
}
