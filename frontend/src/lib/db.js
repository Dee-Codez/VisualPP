// This is a mock implementation of a database interface for the KV store
// In a real application, this would connect to an actual database

// Mock implementation for simulating DB operations
class KVDatabase {
	constructor() {
		this.store = {}
		this.simulatedLatency = true
	}

	// Set a key-value pair
	async set(key, value) {
		// Simulate a DB write operation with latency
		if (this.simulatedLatency) {
			await this.simulateLatency(10, 50)
		}
		
		this.store[key] = value
		return true
	}

	// Get a value by key
	async get(key) {
		// Simulate a DB read operation with latency
		if (this.simulatedLatency) {
			await this.simulateLatency(5, 30)
		}
		
		return this.store[key] || null
	}

	// Delete a key
	async delete(key) {
		// Simulate a DB delete operation with latency
		if (this.simulatedLatency) {
			await this.simulateLatency(8, 40)
		}
		
		if (key in this.store) {
			delete this.store[key]
			return true
		}
		return false
	}

	// Clear all keys
	async clear() {
		// Simulate a DB clear operation with latency
		if (this.simulatedLatency) {
			await this.simulateLatency(20, 100)
		}
		
		this.store = {}
		return true
	}

	// Helper method to simulate variable latency
	async simulateLatency(min, max) {
		const latency = Math.random() * (max - min) + min
		return new Promise(resolve => setTimeout(resolve, latency))
	}

	// Toggle simulated latency
	setSimulatedLatency(value) {
		this.simulatedLatency = value
	}
}

// Mock implementation for simulating Redis operations
class KVRedis {
	constructor() {
		this.store = {}
		this.cache = {}
		this.simulatedLatency = true
	}

	// Set a key-value pair
	async set(key, value, cached = false) {
		// Store the value
		this.store[key] = value
		
		// If cached is true, also store in cache
		if (cached) {
			this.cache[key] = value
			return true
		}
		
		// Simulate latency for non-cached writes
		if (this.simulatedLatency) {
			await this.simulateLatency(5, 20)
		}
		
		return true
	}

	// Get a value by key
	async get(key) {
		// Check if key is in cache
		if (key in this.cache) {
			// Cached reads are instant
			return this.cache[key]
		}
		
		// Simulate latency for non-cached reads
		if (this.simulatedLatency) {
			await this.simulateLatency(2, 15)
		}
		
		return this.store[key] || null
	}

	// Set cache status for a key
	async setCached(key, cached = true) {
		if (!(key in this.store)) {
			return false
		}
		
		if (cached) {
			this.cache[key] = this.store[key]
		} else if (key in this.cache) {
			delete this.cache[key]
		}
		
		return true
	}

	// Get cache status for a key
	getCachedStatus(key) {
		return key in this.cache
	}

	// Helper method to simulate variable latency
	async simulateLatency(min, max) {
		const latency = Math.random() * (max - min) + min
		return new Promise(resolve => setTimeout(resolve, latency))
	}

	// Toggle simulated latency
	setSimulatedLatency(value) {
		this.simulatedLatency = value
	}
}

// Export database instances
export const db = new KVDatabase()
export const redis = new KVRedis()

// Mock benchmark functions
export async function runBenchmark(config) {
	const { 
		type, 
		storage, 
		requests, 
		size, 
		ratio = '1:1', 
		cachedRatio = '1:1', 
		name = 'Benchmark Run' 
	} = config
	
	// Parse ratios
	const [setRatio, getRatio] = ratio.split(':').map(Number)
	const [cachedPart, uncachedPart] = cachedRatio.split(':').map(Number)
	const cachedProbability = cachedPart / (cachedPart + uncachedPart)
	
	const totalOperations = parseInt(requests)
	const dataSize = parseInt(size)
	
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
		for (let i = 0; i < totalOperations; i++) {
			const key = `benchmark:${i}`
			const value = generateValue(dataSize)
			const isCached = Math.random() < cachedProbability
			
			await storageImpl.set(key, value, isCached)
		}
	} else if (type === 'get') {
		// First populate keys
		for (let i = 0; i < totalOperations; i++) {
			const key = `benchmark:${i}`
			const value = generateValue(dataSize)
			const isCached = Math.random() < cachedProbability
			
			await storageImpl.set(key, value, isCached)
		}
		
		// GET benchmark
		for (let i = 0; i < totalOperations; i++) {
			const key = `benchmark:${i}`
			await storageImpl.get(key)
		}
	} else if (type === 'mixed') {
		// MIXED benchmark
		const setOps = Math.floor((setRatio / (setRatio + getRatio)) * totalOperations)
		const getOps = totalOperations - setOps
		
		// Pre-populate some keys for GET operations
		for (let i = 0; i < Math.min(getOps, totalOperations / 2); i++) {
			const key = `benchmark:${i}`
			const value = generateValue(dataSize)
			const isCached = Math.random() < cachedProbability
			
			await storageImpl.set(key, value, isCached)
		}
		
		// Run mixed operations
		let setCount = 0
		let getCount = 0
		
		for (let i = 0; i < totalOperations; i++) {
			// Determine operation type (SET or GET)
			const isSetOp = setCount < setOps && (getCount >= getOps || Math.random() < (setRatio / (setRatio + getRatio)))
			
			if (isSetOp) {
				setCount++
				const key = `benchmark:${Math.floor(Math.random() * totalOperations)}`
				const value = generateValue(dataSize)
				const isCached = Math.random() < cachedProbability
				
				await storageImpl.set(key, value, isCached)
			} else {
				getCount++
				const key = `benchmark:${Math.floor(Math.random() * totalOperations)}`
				await storageImpl.get(key)
			}
		}
	}
	
	// End timing
	const endTime = performance.now()
	const duration = (endTime - startTime) / 1000 // Convert to seconds
	const opsPerSecond = totalOperations / duration
	
	// Return benchmark results
	return {
		name,
		type,
		storage,
		requests: totalOperations,
		size: dataSize,
		ratio,
		cachedRatio,
		duration,
		opsPerSecond,
		timestamp: new Date().toISOString()
	}
}