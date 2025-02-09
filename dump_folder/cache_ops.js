import pool from './cache_db_setup.js';
import { generateEmbedding } from './embeddings.js'; // Your embedding service

export const insertDocument = async (rawText, walletAddress, signature) => {
//   // 1. Verify wallet ownership
//   const isAuthenticated = await verifyWallet(walletAddress, signature);
//   if (!isAuthenticated) throw new Error('Unauthorized');

//   // 2. Check write permissions
//   const canWrite = await checkWritePermission(walletAddress);
//   if (!canWrite) throw new Error('No write permissions');

  // 3. Generate embedding (e.g., using OpenAI, HuggingFace, or local model)
  // const embedding = await generateEmbedding(rawText);

  // const embedding = [0.12, 0.34, 0.56, 0.78, 0.90];  // Example array of floats

  // const embeddingString = `{${embedding.join(',')}}`;  // e.g. '{0.12,0.34,0.56,0.78,0.90}'

  const embedding = [0.12, 0.34, 0.56, 0.78, 0.90];  // Example with 5 values, but should be 768 for your case

  // Convert the array into a string formatted as a PostgreSQL array
  const embeddingString = `[${embedding.join(',')}]`;  // Format it like '[0.12,0.34,0.56,0.78,0.90]'
  
  // Insert q


  console.log(embeddingString);
  // throw Error;

  // 4. Store in PostgreSQL
  const res = await pool.query(
    `INSERT INTO documents (raw_text, embedding, wallet_address)
     VALUES ($1, $2::vector, $3) RETURNING id`,
    [rawText, embeddingString, walletAddress.toLowerCase()]
  );

  return res.rows[0].id;
};

insertDocument('Hello, world!', '0x123', 'signature').then(console.log).catch(console.error);