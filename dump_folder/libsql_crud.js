import { createClient } from '@libsql/client';
import { vectorTable, syncVectors } from './vector-db.js';

// Create client with local SQLite file
const client = createClient({
    url: 'file:./data.db',  // Local SQLite file
  });

export async function clearTable(){
    // clear the entire table for testing purpose
    const res = await client.execute({
        sql: `DELETE FROM documents`
    });

}

export async function insertDocument(rawText, walletAddress) {
    // 1. Generate embedding
    const embedding = [0.1, 1.0]
    
    console.log(embedding.length);  

    // 2. Insert into libSQL
    const res = await client.execute({
        sql: `INSERT INTO documents (raw_text, wallet_address, embedding)
            VALUES (?, ?, ?) RETURNING id`,
        args: [rawText, walletAddress, JSON.stringify(embedding)]
    });

    // 3. Sync with LanceDB
    await syncVectors();
    console.log(res.rows[0])
    return res.rows[0].id;
}

export async function semanticSearch(query, limit = 5) {
    const queryEmbedding = [0.1, 0.3]
    // await generateEmbedding(query);
    console.log(queryEmbedding.length); 


    const db_query = vectorTable.vectorSearch(queryEmbedding).limit(limit);
    const results = await db_query.toArray();

    console.log(results);

    // return await vectorTable
    //   .vectorSearch(queryEmbedding)
    //   .limit(limit)
    //   .execute();
  }

// insertDocument("hello wolrd", "0x1jdk")
// .then(

// );
// semanticSearch("hello wnlrd", 20)

clearTable()
