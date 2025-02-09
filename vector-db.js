import * as lancedb from "@lancedb/lancedb";
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: "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" });


const db = await lancedb.connect('./data/lancedb');

async function initializeVectorTable() {
    return await db.openTable('vector_store_table');
}

const vectorTable = await initializeVectorTable();


export async function prepareEmbeddingEntryFromText(unique_id, raw_text){
    const vector = await generateEmbedding(raw_text);
    return {id:unique_id, vector, raw_text}
}


export async function addSingleVectorEntry(unique_id, vector_array, raw_text){
    const data = [{id: unique_id, vector: vector_array, raw_text: raw_text}]
    await vectorTable.add(data)
}

export async function addMultipleVectorEntries(arrayInputEntries){
    // data input must look like
    // const data = [
        // { id: "0x1b", vector: [0.1, 1.0], raw_text: "hello world"},
        // { id: "0x1c", vector: [3.9, 0.5], raw_text: "hi user"},
    //   ];
    await vectorTable.add(arrayInputEntries);
}

export async function deleteEntry(column_name, column_value){
    // eg. stringCondition is 'item = "fizz"'
    const stringCondition = column_name + ' = "' + column_value + '"' ; 
    await vectorTable.delete(stringCondition);
}


export async function nearestNeighbourSearch(vector_array, limit=5) {
    // limit = number of items to return
    //  vector_array size should be the same as vectors inside the table
    //  if not it willl throw an error
    // example output [{"id": 1, "vector": [0.10000000149011612,1], "raw_text": "foo", "_distance": 0.4899999797344208},..]
    return await vectorTable.vectorSearch(vector_array).limit(limit).toArray();
}


// await deleteEntry("id", "0x1d")

// const result = await nearestNeighbourSearch([0.1, 0.3])
// console.log(result)

// const data = [
//     { id: "0x1b", vector: [0.2, 1.0], raw_text: "hello world"},
//     { id: "0x1c", vector: [3.9, 1.5], raw_text: "hi user"},
//   ];
// addMultipleVectorEntries(data)

// addSingleVectorEntry("0x1d", [0.1, 3.3], "test3")
