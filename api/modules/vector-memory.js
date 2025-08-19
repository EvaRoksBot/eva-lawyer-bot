/**
 * Vector Memory System for Eva Lawyer Bot
 * Provides episodic, semantic, and profile memory using embeddings
 */

// Simple in-memory vector storage (replace with Postgres+pgvector or Qdrant in production)
class InMemoryVectorStore {
  constructor() {
    this.chunks = new Map(); // id -> {user_id, scope, content, meta, embedding, timestamp}
    this.nextId = 1;
  }
  
  /**
   * Add a memory chunk
   * @param {number} userId - User ID
   * @param {string} scope - Memory scope (episodic, semantic, profile)
   * @param {string} content - Content text
   * @param {Object} meta - Metadata
   * @param {Array} embedding - Vector embedding
   */
  async add(userId, scope, content, meta, embedding) {
    const id = this.nextId++;
    this.chunks.set(id, {
      id,
      user_id: userId,
      scope,
      content,
      meta,
      embedding,
      timestamp: Date.now()
    });
    return id;
  }
  
  /**
   * Search for similar chunks
   * @param {number} userId - User ID
   * @param {string} scope - Memory scope
   * @param {Array} queryEmbedding - Query vector
   * @param {number} k - Number of results
   * @returns {Array} - Similar chunks
   */
  async search(userId, scope, queryEmbedding, k = 6) {
    const candidates = [];
    
    for (const chunk of this.chunks.values()) {
      if (chunk.user_id !== userId) continue;
      if (scope && chunk.scope !== scope) continue;
      
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      candidates.push({ ...chunk, similarity });
    }
    
    // Sort by similarity (descending) and take top k
    return candidates
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }
  
  /**
   * Get recent chunks for a user
   * @param {number} userId - User ID
   * @param {string} scope - Memory scope
   * @param {number} limit - Number of results
   * @returns {Array} - Recent chunks
   */
  async getRecent(userId, scope, limit = 10) {
    const candidates = [];
    
    for (const chunk of this.chunks.values()) {
      if (chunk.user_id !== userId) continue;
      if (scope && chunk.scope !== scope) continue;
      candidates.push(chunk);
    }
    
    return candidates
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array} a - Vector A
 * @param {Array} b - Vector B
 * @returns {number} - Similarity score (0-1)
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Memory manager class
 */
class VectorMemory {
  constructor(openaiApiKey) {
    this.store = new InMemoryVectorStore();
    this.apiKey = openaiApiKey;
    this.embeddingModel = 'text-embedding-3-small'; // 1536 dimensions
  }
  
  /**
   * Get embedding for text
   * @param {string} text - Input text
   * @returns {Promise<Array>} - Embedding vector
   */
  async getEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text.slice(0, 8000) // Limit input length
        })
      });
      
      const result = await response.json();
      
      if (!result.data || !result.data[0]) {
        throw new Error('Invalid embedding response');
      }
      
      return result.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }
  
  /**
   * Add content to memory
   * @param {number} userId - User ID
   * @param {string} scope - Memory scope
   * @param {string} content - Content text
   * @param {Object} meta - Metadata
   */
  async add(userId, scope, content, meta = {}) {
    try {
      const embedding = await this.getEmbedding(content);
      return await this.store.add(userId, scope, content, meta, embedding);
    } catch (error) {
      console.error('Memory add error:', error);
      return null;
    }
  }
  
  /**
   * Search memory for relevant content
   * @param {number} userId - User ID
   * @param {string} scope - Memory scope
   * @param {string} query - Search query
   * @param {number} k - Number of results
   * @returns {Promise<Array>} - Relevant chunks
   */
  async search(userId, scope, query, k = 6) {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      return await this.store.search(userId, scope, queryEmbedding, k);
    } catch (error) {
      console.error('Memory search error:', error);
      return [];
    }
  }
  
  /**
   * Enrich context with relevant memory
   * @param {number} userId - User ID
   * @param {string} taskBrief - Task description
   * @param {number} k - Number of results
   * @returns {Promise<Array>} - Memory context
   */
  async enrichWithMemory(userId, taskBrief, k = 6) {
    try {
      // Search across all scopes
      const episodic = await this.search(userId, 'episodic', taskBrief, Math.ceil(k/3));
      const semantic = await this.search(userId, 'semantic', taskBrief, Math.ceil(k/3));
      const profile = await this.search(userId, 'profile', taskBrief, Math.ceil(k/3));
      
      // Combine and sort by similarity
      const allResults = [...episodic, ...semantic, ...profile];
      return allResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k)
        .map(chunk => ({
          scope: chunk.scope,
          content: chunk.content,
          meta: chunk.meta,
          similarity: chunk.similarity
        }));
    } catch (error) {
      console.error('Memory enrichment error:', error);
      return [];
    }
  }
  
  /**
   * Record user interaction
   * @param {number} userId - User ID
   * @param {string} userMessage - User message
   * @param {string} botResponse - Bot response
   * @param {Object} context - Additional context
   */
  async recordInteraction(userId, userMessage, botResponse, context = {}) {
    try {
      // Record episodic memory (conversation history)
      await this.add(userId, 'episodic', 
        `User: ${userMessage}\nBot: ${botResponse}`,
        { type: 'conversation', timestamp: Date.now(), ...context }
      );
      
      // Extract and record semantic knowledge if applicable
      if (context.documentAnalyzed) {
        await this.add(userId, 'semantic',
          `Document analysis: ${context.documentType || 'unknown'} - ${botResponse.slice(0, 500)}`,
          { type: 'document_analysis', document_type: context.documentType }
        );
      }
      
      if (context.contractAnalyzed) {
        await this.add(userId, 'semantic',
          `Contract analysis: ${botResponse.slice(0, 500)}`,
          { type: 'contract_analysis' }
        );
      }
      
      if (context.counterpartyChecked) {
        await this.add(userId, 'semantic',
          `Counterparty check: ${context.inn} - ${botResponse.slice(0, 500)}`,
          { type: 'counterparty_check', inn: context.inn }
        );
      }
    } catch (error) {
      console.error('Record interaction error:', error);
    }
  }
  
  /**
   * Update user profile based on preferences
   * @param {number} userId - User ID
   * @param {string} preference - Preference description
   * @param {Object} meta - Metadata
   */
  async updateProfile(userId, preference, meta = {}) {
    try {
      await this.add(userId, 'profile', preference, {
        type: 'preference',
        timestamp: Date.now(),
        ...meta
      });
    } catch (error) {
      console.error('Update profile error:', error);
    }
  }
}

// Export the VectorMemory class
module.exports = {
  VectorMemory,
  cosineSimilarity
};

