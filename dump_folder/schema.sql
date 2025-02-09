-- libsql (SQLite-compatible schema)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  raw_text TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  ipfs_cid TEXT,
  embedding BLOB  -- Store vector as JSON/Buffer
);

CREATE TABLE IF NOT EXISTS permissions (
  wallet_address TEXT PRIMARY KEY,
  can_write BOOLEAN DEFAULT 0
);


-- const func = new EmbeddingFunction(getRegistry()
--   .openai
-- //   get("openai")
--   ?.create({ model: "text-embedding-ada-002" }));


-- const wordsSchema = LanceSchema({
--     text: func.sourceField(new Utf8()),
--     vector: func.vectorField({ndims: 1536}),
--   });
--   const tbl = await db.createEmptyTable("words", wordsSchema, {
--     mode: "overwrite",
--   });

--   await tbl.add([{ text: "hello world" }, { text: "goodbye world" }]);

--   const query = "greetings";
--   const actual = (await tbl.search(query).limit(1).toArray())[0];
