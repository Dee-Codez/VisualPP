/**
 * Mock implementation of a KV service for development/testing
 * This simulates both Redis (cached) and Database (uncached) operations
 */

// Mock storage - will be reset on server restart
const redisStore = new Map()
const dbStore = new Map()
const redisCache = new Map()

// Configurable simulation parameters
let simulationConfig = {
  redisLatencyMs: {
    min: 2,
    max: 15
  },
  dbLatencyMs: {
    min: 30,
    max: 200
  },
  networkJitterMs: {
    min: 0,
    max: 5
  }
}

/**
 * Helper to simulate variable latency
 * @param {number} min Minimum latency in ms
 * @param {number} max Maximum latency in ms
 * @returns {Promise} Promise that resolves after the latency period
 */
function simulateLatency(min, max) {
  const latency = Math.random() * (max - min) + min
  return new Promise(resolve => setTimeout(resolve, latency))
}

/**
 * Redis-like operations (with caching)
 */
const redis = {
  /**
   * Set a key-value pair
   * @param {string} key Key to set
   * @param {any} value Value to set
   * @param {boolean} cached Whether to cache the value
   * @returns {Promise<boolean>} Success
   */
  async set(key, value, cached = false) {
    // Simulate latency for writes
    await simulateLatency(
      simulationConfig.redisLatencyMs.min,
      simulationConfig.redisLatencyMs.max
    )
    
    // Store the value
    redisStore.set(key, value)
    
    // If cached is true, also store in cache
    if (cached) {
      redisCache.set(key, value)
    } else if (redisCache.has(key)) {
      // If the key exists in cache but shouldn't be cached, remove it
      redisCache.delete(key)
    }
    
    return true
  },
  
  /**
   * Get a value by key
   * @param {string} key Key to get
   * @returns {Promise<any>} Retrieved value or null
   */
  async get(key) {
    // Check if key is in cache
    if (redisCache.has(key)) {
      // Add minimal network jitter for cached reads
      await simulateLatency(
        simulationConfig.networkJitterMs.min,
        simulationConfig.networkJitterMs.max
      )
      return redisCache.get(key)
    }
    
    // Simulate latency for non-cached reads
    await simulateLatency(
      simulationConfig.redisLatencyMs.min,
      simulationConfig.redisLatencyMs.max
    )
    
    return redisStore.has(key) ? redisStore.get(key) : null
  },
  
  /**
   * Check if a key exists
   * @param {string} key Key to check
   * @returns {Promise<boolean>} Whether the key exists
   */
  async exists(key) {
    // Add minimal network jitter
    await simulateLatency(
      simulationConfig.networkJitterMs.min,
      simulationConfig.networkJitterMs.max
    )
    
    return redisStore.has(key)
  },
  
  /**
   * Delete a key
   * @param {string} key Key to delete
   * @returns {Promise<boolean>} Whether the key was deleted
   */
  async del(key) {
    // Simulate latency for writes
    await simulateLatency(
      simulationConfig.redisLatencyMs.min,
      simulationConfig.redisLatencyMs.max
    )
    
    // Remove from both store and cache
    const hadKey = redisStore.delete(key)
    redisCache.delete(key)
    
    return hadKey
  },
  
  /**
   * Set cache status for a key
   * @param {string} key Key to update
   * @param {boolean} cached Whether to cache the value
   * @returns {Promise<boolean>} Success
   */
  async setCached(key, cached = true) {
    // Add minimal network jitter
    await simulateLatency(
      simulationConfig.networkJitterMs.min,
      simulationConfig.networkJitterMs.max
    )
    
    if (!redisStore.has(key)) {
      return false
    }
    
    if (cached) {
      redisCache.set(key, redisStore.get(key))
    } else {
      redisCache.delete(key)
    }
    
    return true
  },
  
  /**
   * Get cache status for a key
   * @param {string} key Key to check
   * @returns {Promise<boolean|null>} Whether the key is cached, or null if key doesn't exist
   */
  async getCachedStatus(key) {
    // Add minimal network jitter
    await simulateLatency(
      simulationConfig.networkJitterMs.min,
      simulationConfig.networkJitterMs.max
    )
    
    if (!redisStore.has(key)) {
      return null
    }
    
    return redisCache.has(key)
  },
  
  /**
   * Clear all keys
   * @returns {Promise<boolean>} Success
   */
  async flushAll() {
    // Simulate latency for bulk operation
    await simulateLatency(
      simulationConfig.redisLatencyMs.min * 2,
      simulationConfig.redisLatencyMs.max * 2
    )
    
    redisStore.clear()
    redisCache.clear()
    
    return true
  }
}

/**
 * Database-like operations (without caching)
 */
const db = {
  /**
   * Set a key-value pair
   * @param {string} key Key to set
   * @param {any} value Value to set
   * @returns {Promise<boolean>} Success
   */
  async set(key, value) {
    // Simulate latency for database writes
    await simulateLatency(
      simulationConfig.dbLatencyMs.min,
      simulationConfig.dbLatencyMs.max
    )
    
    dbStore.set(key, value)
    
    return true
  },
  
  /**
   * Get a value by key
   * @param {string} key Key to get
   * @returns {Promise<any>} Retrieved value or null
   */
  async get(key) {
    // Simulate latency for database reads
    await simulateLatency(
      simulationConfig.dbLatencyMs.min,
      simulationConfig.dbLatencyMs.max
    )
    
    return dbStore.has(key) ? dbStore.get(key) : null
  },
  
  /**
   * Check if a key exists
   * @param {string} key Key to check
   * @returns {Promise<boolean>} Whether the key exists
   */
  async exists(key) {
    // Simulate latency for database query
    await simulateLatency(
      simulationConfig.dbLatencyMs.min / 2,
      simulationConfig.dbLatencyMs.max / 2
    )
    
    return dbStore.has(key)
  },
  
  /**
   * Delete a key
   * @param {string} key Key to delete
   * @returns {Promise<boolean>} Whether the key was deleted
   */
  async del(key) {
    // Simulate latency for database writes
    await simulateLatency(
      simulationConfig.dbLatencyMs.min,
      simulationConfig.dbLatencyMs.max
    )
    
    return dbStore.delete(key)
  },
  
  /**
   * Clear all keys
   * @returns {Promise<boolean>} Success
   */
  async clear() {
    // Simulate latency for bulk operation
    await simulateLatency(
      simulationConfig.dbLatencyMs.min * 2,
      simulationConfig.dbLatencyMs.max * 2
    )
    
    dbStore.clear()
    
    return true
  }
}

/**
 * Run a benchmark on either redis or db
 * @param {object} config Benchmark configuration
 * @returns {Promise<object>} Benchmark results
 */
async function runBenchmark(config) {
  const { 
    type = 'get', 
    storage = 'redis', 
    requests = 1000, 
    size = 3, 
    ratio = '1:1', 
    cachedRatio = '1:1',
    name = 'Benchmark Run' 
  } = config
  
  // Parse ratios
  const [setRatio, getRatio] = ratio.split(':').map(Number)
  const [cachedPart, uncachedPart] = cachedRatio.split(':').map(Number)
  const cachedProbability = cachedPart / (cachedPart + uncachedPart || 1)
  
  // Generate random string of the specified size
  const generateValue = (size) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < size; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
  
  // Select storage implementation
  const storageImpl = storage === 'redis' ? redis : db
  
  // Start timing
  const startTime = performance.now()
  
  // Run the appropriate benchmark
  if (type === 'set') {
    // SET benchmark
    for (let i = 0; i < requests; i++) {
      const key = `benchmark:${i}`
      const value = generateValue(size)
      
      if (storage === 'redis') {
        const isCached = Math.random() < cachedProbability
        await storageImpl.set(key, value, isCached)
      } else {
        await storageImpl.set(key, value)
      }
    }
  } else if (type === 'get') {
    // First populate keys
    for (let i = 0; i < requests; i++) {
      const key = `benchmark:get:${i}`
      const value = generateValue(size)
      
      if (storage === 'redis') {
        const isCached = Math.random() < cachedProbability
        await storageImpl.set(key, value, isCached)
      } else {
        await storageImpl.set(key, value)
      }
    }
    
    // GET benchmark
    for (let i = 0; i < requests; i++) {
      const key = `benchmark:get:${i}`
      await storageImpl.get(key)
    }
  } else if (type === 'mixed') {
    // MIXED benchmark
    const setOps = Math.floor((setRatio / (setRatio + getRatio)) * requests)
    const getOps = requests - setOps
    
    // Pre-populate some keys for GET operations
    for (let i = 0; i < Math.min(getOps, requests / 2); i++) {
      const key = `benchmark:mixed:${i}`
      const value = generateValue(size)
      
      if (storage === 'redis') {
        const isCached = Math.random() < cachedProbability
        await storageImpl.set(key, value, isCached)
      } else {
        await storageImpl.set(key, value)
      }
    }
    
    // Run mixed operations
    let setCount = 0
    let getCount = 0
    
    for (let i = 0; i < requests; i++) {
      // Determine operation type (SET or GET)
      const isSetOp = setCount < setOps && (getCount >= getOps || Math.random() < (setRatio / (setRatio + getRatio)))
      
      if (isSetOp) {
        setCount++
        const key = `benchmark:mixed:${Math.floor(Math.random() * requests)}`
        const value = generateValue(size)
        
        if (storage === 'redis') {
          const isCached = Math.random() < cachedProbability
          await storageImpl.set(key, value, isCached)
        } else {
          await storageImpl.set(key, value)
        }
      } else {
        getCount++
        const key = `benchmark:mixed:${Math.floor(Math.random() * requests)}`
        await storageImpl.get(key)
      }
    }
  }
  
  // End timing
  const endTime = performance.now()
  const duration = (endTime - startTime) / 1000 // Convert to seconds
  const opsPerSecond = requests / duration
  
  return {
    id: `run-${Math.random().toString(36).substring(2, 10)}`,
    name,
    type,
    storage,
    requests,
    size,
    ratio,
    cachedRatio: storage === 'redis' ? cachedRatio : '0:1',
    opsPerSecond,
    duration,
    timestamp: new Date().toISOString()
  }
}

/**
 * Update simulation parameters
 * @param {object} params New simulation parameters
 */
function updateSimulationConfig(params) {
  simulationConfig = {
    ...simulationConfig,
    ...params
  }
}

export { redis, db, runBenchmark, updateSimulationConfig }