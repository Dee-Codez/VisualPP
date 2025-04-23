import fs from 'fs'
import path from 'path'

// File to store benchmark results
const RESULTS_FILE = 'benchmark_results.json'

// Mock data for development/testing
const MOCK_RESULTS = [
  {
    id: 'run-sample1',
    name: 'Redis GET Fast',
    type: 'get',
    storage: 'redis',
    requests: 10000,
    size: 3,
    cachedRatio: '1:0',
    opsPerSecond: 8750.25,
    duration: 1.14,
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: 'run-sample2',
    name: 'DB GET Slow',
    type: 'get',
    storage: 'db',
    requests: 10000,
    size: 3,
    cachedRatio: '0:1',
    opsPerSecond: 156.78,
    duration: 63.78,
    timestamp: new Date(Date.now() - 3300000).toISOString() // 55 minutes ago
  },
  {
    id: 'run-sample3',
    name: 'Redis SET Fast',
    type: 'set',
    storage: 'redis',
    requests: 10000,
    size: 3,
    cachedRatio: '1:0',
    opsPerSecond: 7845.32,
    duration: 1.27,
    timestamp: new Date(Date.now() - 3000000).toISOString() // 50 minutes ago
  },
  {
    id: 'run-sample4',
    name: 'DB SET Slow',
    type: 'set',
    storage: 'db',
    requests: 10000,
    size: 3,
    cachedRatio: '0:1',
    opsPerSecond: 198.45,
    duration: 50.39,
    timestamp: new Date(Date.now() - 2700000).toISOString() // 45 minutes ago
  },
  {
    id: 'run-sample5',
    name: 'Redis Mixed 50:50',
    type: 'mixed',
    storage: 'redis',
    requests: 10000,
    size: 3,
    ratio: '1:1',
    cachedRatio: '1:0',
    opsPerSecond: 8150.75,
    duration: 1.23,
    timestamp: new Date(Date.now() - 2400000).toISOString() // 40 minutes ago
  },
  {
    id: 'run-sample6',
    name: 'DB Mixed 50:50',
    type: 'mixed',
    storage: 'db',
    requests: 10000,
    size: 3,
    ratio: '1:1',
    cachedRatio: '0:1',
    opsPerSecond: 175.25,
    duration: 57.06,
    timestamp: new Date(Date.now() - 2100000).toISOString() // 35 minutes ago
  }
]

// Helper to read results from file
function readResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const data = fs.readFileSync(RESULTS_FILE, 'utf8')
      try {
        const results = JSON.parse(data)
        
        if (!Array.isArray(results)) {
          console.warn('Results file does not contain an array, returning empty array')
          return []
        }
        
        // Validate and sanitize results
        return results.map(result => {
          // Ensure all results have an id
          if (!result.id) {
            result.id = `run-${Math.random().toString(36).substring(2, 10)}`
          }
          
          // Ensure all results have a timestamp
          if (!result.timestamp) {
            result.timestamp = new Date().toISOString()
          }
          
          // Ensure numeric fields are actually numbers
          if (result.opsPerSecond) result.opsPerSecond = parseFloat(result.opsPerSecond)
          if (result.duration) result.duration = parseFloat(result.duration)
          if (result.requests) result.requests = parseInt(result.requests)
          if (result.size) result.size = parseInt(result.size)
          
          return result
        })
      } catch (parseError) {
        console.error('Error parsing results file:', parseError)
        return []
      }
    }
  } catch (error) {
    console.error('Error reading results file:', error)
  }
  return []
}

// Helper to write results to file
function writeResults(results) {
  try {
    // Ensure the data directory exists
    const dir = path.dirname(RESULTS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Error writing results file:', error)
    return false
  }
}

export default async function handler(req, res) {
  const useMockData = process.env.USE_MOCK_DATA === 'true'
  
  // GET method - retrieve all benchmark results
  if (req.method === 'GET') {
    let results = readResults()
    
    // If file is empty or doesn't exist and we're in development, use mock data
    if (results.length === 0 && useMockData) {
      console.log('Using mock benchmark results data')
      results = MOCK_RESULTS
    }
    
    // Sort by timestamp (newest first) by default
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    return res.status(200).json(results)
  }
  
  // POST method - add a new benchmark result
  if (req.method === 'POST') {
    try {
      const newResult = req.body
      
      // Validate required fields
      if (!newResult.type || !newResult.storage) {
        return res.status(400).json({ message: 'Missing required fields: type and storage are required' })
      }
      
      // Ensure required fields are present
      const result = {
        id: newResult.id || `run-${Math.random().toString(36).substring(2, 10)}`,
        name: newResult.name || `${newResult.storage === 'redis' ? 'Redis' : 'DB'} ${newResult.type.toUpperCase()} Benchmark`,
        type: newResult.type,
        storage: newResult.storage,
        requests: parseInt(newResult.requests || 1000),
        size: parseInt(newResult.size || 3),
        ratio: newResult.ratio || '1:1',
        cachedRatio: newResult.cachedRatio || '1:1',
        opsPerSecond: parseFloat(newResult.opsPerSecond || 0),
        duration: parseFloat(newResult.duration || 0),
        timestamp: newResult.timestamp || new Date().toISOString()
      }
      
      // Read existing results
      const results = readResults()
      
      // Add new result
      results.push(result)
      
      // Write updated results
      const success = writeResults(results)
      
      if (success) {
        return res.status(201).json(result)
      } else {
        return res.status(500).json({ message: 'Failed to save result' })
      }
    } catch (error) {
      console.error('Error saving result:', error)
      return res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  }
  
  // DELETE method - clear all results or delete a specific result
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      
      // Read existing results
      let results = readResults()
      
      // If ID is provided, delete specific result
      if (id) {
        const filteredResults = results.filter(r => r.id !== id)
        
        // If no results were filtered out, the ID doesn't exist
        if (filteredResults.length === results.length) {
          return res.status(404).json({ message: 'Result not found' })
        }
        
        results = filteredResults
      }
      // Otherwise clear all results
      else {
        results = []
      }
      
      // Write updated results
      const success = writeResults(results)
      
      if (success) {
        return res.status(200).json({ 
          message: id ? 'Result deleted' : 'All results cleared',
          count: results.length
        })
      } else {
        return res.status(500).json({ message: 'Failed to update results file' })
      }
    } catch (error) {
      console.error('Error deleting results:', error)
      return res.status(500).json({ message: 'Internal server error', error: error.message })
    }
  }
  
  // Method not allowed
  return res.status(405).json({ message: 'Method not allowed' })
}