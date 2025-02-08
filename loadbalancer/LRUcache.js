export class LRUCache {
    constructor(limit = 50) { // Default max cache size = 50
        this.cache = new Map();
        this.limit = limit;
    }

    get(key) {
        if (!this.cache.has(key)) return null;
        const value = this.cache.get(key);

        // Move accessed item to the end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key); // Remove existing key before re-inserting
        } else if (this.cache.size >= this.limit) {
            // Remove the least recently used item (first entry)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
  