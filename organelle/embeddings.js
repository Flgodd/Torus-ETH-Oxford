import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: "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" });
// process.env.OPENAI_KEY

export const generateEmbedding = async (text) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',// 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
};

// generateEmbedding('Hello, world!').then(console.log).catch(console.error);