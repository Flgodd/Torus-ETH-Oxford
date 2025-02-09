import * as lancedb from "@lancedb/lancedb";
import { generateEmbedding } from "./embeddings.js";
import OpenAI from 'openai';

const db = await lancedb.connect("data/lancedb");
const openai = new OpenAI({ apiKey: "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" });

const hi = await generateEmbedding('Hello world');
const monkey = await generateEmbedding('monkey');

// // // table creation logic
// const vectorTable = await db.createTable("2vector_store_table", [
//   { id: "0x1b", vector: hi, raw_text: "Hello world"},
//   { id: "0x1c", vector: monkey, raw_text: "monkey"},
// ]);

async function initializeVectorTable() {
    return await db.openTable('vector_store_table');
}

export const vectorTable = await initializeVectorTable();

const greeting = await generateEmbedding('greeting');


const results = await vectorTable.vectorSearch(greeting).limit(20).toArray();
console.log(results);

