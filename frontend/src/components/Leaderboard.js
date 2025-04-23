import { useState } from 'react'

export default function Leaderboard({ results }) {
	const [sortBy, setSortBy] = useState('opsPerSecond')
	const [sortDirection, setSortDirection] = useState('desc')
	const [filterType, setFilterType] = useState('all')
	const [filterStorage, setFilterStorage] = useState('all')
	const [searchTerm, setSearchTerm] = useState('')

	if (!results || results.length === 0) {
		return (
			<div className="bg-white shadow rounded-lg p-6 text-center dark:bg-gray-800">
				<p className="text-gray-500 dark:text-gray-400">No benchmark results available yet.</p>
				<p className="text-gray-500 dark:text-gray-400 mt-2">Run a benchmark to see leaderboard here.</p>
			</div>
		)
	}

	// Define hardcoded colors for consistency
	const REDIS_COLOR = '#3b82f6' // Blue
	const DB_COLOR = '#ef4444'    // Red

	// Filter results
	const filteredResults = results.filter(result => {
		const typeMatch = filterType === 'all' || result.type === filterType
		const storageMatch = filterStorage === 'all' || result.storage === filterStorage
		const searchMatch = !searchTerm || 
			(result.name && result.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(result.id && result.id.toLowerCase().includes(searchTerm.toLowerCase()))
		return typeMatch && storageMatch && searchMatch
	})

	// Sort results
	const sortedResults = [...filteredResults].sort((a, b) => {
		let aValue = a[sortBy] ?? 0
		let bValue = b[sortBy] ?? 0
		
		if (sortBy === 'timestamp') {
			aValue = new Date(a.timestamp || 0).getTime()
			bValue = new Date(b.timestamp || 0).getTime()
		}
		
		if (sortDirection === 'asc') {
			return aValue - bValue
		} else {
			return bValue - aValue
		}
	})

	// Handle sort header click
	const handleSort = (column) => {
		if (sortBy === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortBy(column)
			setSortDirection('desc')
		}
	}

	// Get category winners
	const getWinners = () => {
		const winners = {
			fastest: { ops: 0, result: null },
			redisGet: { ops: 0, result: null },
			redisSet: { ops: 0, result: null },
			redisMixed: { ops: 0, result: null },
			dbGet: { ops: 0, result: null },
			dbSet: { ops: 0, result: null },
			dbMixed: { ops: 0, result: null }
		}

		results.forEach(result => {
			const ops = result.opsPerSecond || 0
			
			// Overall fastest
			if (ops > winners.fastest.ops) {
				winners.fastest = { ops, result }
			}
			
			// Redis category winners
			if (result.storage === 'redis') {
				if (result.type === 'get' && ops > winners.redisGet.ops) {
					winners.redisGet = { ops, result }
				}
				else if (result.type === 'set' && ops > winners.redisSet.ops) {
					winners.redisSet = { ops, result }
				}
				else if (result.type === 'mixed' && ops > winners.redisMixed.ops) {
					winners.redisMixed = { ops, result }
				}
			}
			// DB category winners
			else if (result.storage === 'db') {
				if (result.type === 'get' && ops > winners.dbGet.ops) {
					winners.dbGet = { ops, result }
				}
				else if (result.type === 'set' && ops > winners.dbSet.ops) {
					winners.dbSet = { ops, result }
				}
				else if (result.type === 'mixed' && ops > winners.dbMixed.ops) {
					winners.dbMixed = { ops, result }
				}
			}
		})

		return winners
	}

	const winners = getWinners()

	return (
		<div className="space-y-6">
			{/* Winners Section (Medals) */}
			<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
				<h2 className="text-xl font-semibold mb-6 dark:text-white">Top Performing Benchmarks</h2>
				
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Overall fastest */}
					{winners.fastest.result && (
						<div className={`p-4 rounded-lg ${
							winners.fastest.result.storage === 'redis' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-red-50 dark:bg-red-900/30'
						}`}>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">Fastest Overall</span>
								<span className="flex items-center space-x-1">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
									</svg>
									<span className="text-yellow-500 font-bold">🏆</span>
								</span>
							</div>
							<h3 className="font-bold text-lg dark:text-white">{winners.fastest.result.name || winners.fastest.result.id}</h3>
							<p className={`text-sm ${
								winners.fastest.result.storage === 'redis' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
							}`}>
								{winners.fastest.result.storage === 'redis' ? 'Redis' : 'Database'} - {winners.fastest.result.type.toUpperCase()}
							</p>
							<p className="font-bold text-xl mt-2 dark:text-white">{winners.fastest.ops.toFixed(2)} ops/sec</p>
						</div>
					)}
					
					{/* Redis category winner */}
					<div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-500 dark:text-gray-400">Best Redis Performance</span>
							<span className="text-blue-600 dark:text-blue-400">🔷</span>
						</div>
						{winners.redisGet.result ? (
							<>
								<h3 className="font-bold text-lg dark:text-white">{winners.redisGet.result.name || winners.redisGet.result.id}</h3>
								<p className="text-sm text-blue-600 dark:text-blue-400">
									GET Operations
								</p>
								<p className="font-bold text-xl mt-2 dark:text-white">{winners.redisGet.ops.toFixed(2)} ops/sec</p>
							</>
						) : (
							<p className="text-gray-500 dark:text-gray-400">No Redis benchmarks found</p>
						)}
					</div>
					
					{/* DB category winner */}
					<div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-500 dark:text-gray-400">Best Database Performance</span>
							<span className="text-red-600 dark:text-red-400">🔶</span>
						</div>
						{winners.dbGet.result ? (
							<>
								<h3 className="font-bold text-lg dark:text-white">{winners.dbGet.result.name || winners.dbGet.result.id}</h3>
								<p className="text-sm text-red-600 dark:text-red-400">
									GET Operations
								</p>
								<p className="font-bold text-xl mt-2 dark:text-white">{winners.dbGet.ops.toFixed(2)} ops/sec</p>
							</>
						) : (
							<p className="text-gray-500 dark:text-gray-400">No Database benchmarks found</p>
						)}
					</div>
				</div>
			</div>

			{/* Leaderboard Table */}
			<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
				<div className="flex flex-col md:flex-row justify-between mb-6 items-center">
					<h2 className="text-xl font-semibold dark:text-white">Benchmark Leaderboard</h2>
					
					<div className="flex flex-wrap mt-4 md:mt-0 gap-2">
						<input
							type="text"
							placeholder="Search benchmarks..."
							className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						
						<select
							className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
							value={filterType}
							onChange={(e) => setFilterType(e.target.value)}
						>
							<option value="all">All Operations</option>
							<option value="set">SET Operations</option>
							<option value="get">GET Operations</option>
							<option value="mixed">Mixed Operations</option>
						</select>

						<select
							className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
							value={filterStorage}
							onChange={(e) => setFilterStorage(e.target.value)}
						>
							<option value="all">All Storage Types</option>
							<option value="redis">Redis</option>
							<option value="db">Database</option>
						</select>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('id')}>
									Rank
									{sortBy === 'id' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('name')}>
									Name
									{sortBy === 'name' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('type')}>
									Type
									{sortBy === 'type' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('storage')}>
									Storage
									{sortBy === 'storage' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('opsPerSecond')}>
									Ops/Second
									{sortBy === 'opsPerSecond' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('duration')}>
									Duration (s)
									{sortBy === 'duration' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('requests')}>
									Requests
									{sortBy === 'requests' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
									onClick={() => handleSort('timestamp')}>
									Date/Time
									{sortBy === 'timestamp' && (
										<span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									)}
								</th>
							</tr>
						</thead>
						<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{sortedResults.map((result, index) => (
								<tr 
									key={result.id}
									className={`${result.storage === 'redis' 
										? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
										: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
									} transition-colors`}
								>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
										{index + 1}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white">
										{result.name || `Run ${result.id?.substring(4, 8) || 'Unknown'}`}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm">
										<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 dark:text-white">
											{result.type?.toUpperCase() || 'UNKNOWN'}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm">
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											result.storage === 'redis' 
												? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
												: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
										}`}>
											{result.storage === 'redis' ? 'Redis' : 'Database'}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
										{(result.opsPerSecond || 0).toFixed(2)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300">
										{(result.duration || 0).toFixed(2)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300">
										{(result.requests || 0).toLocaleString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300">
										{result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Unknown'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{sortedResults.length === 0 && (
					<div className="text-center py-10">
						<p className="text-gray-500 dark:text-gray-400">No matching benchmark results found.</p>
					</div>
				)}
				
				<div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
					Showing {sortedResults.length} of {results.length} benchmark results
				</div>
			</div>
			
			{/* Performance Stats Section */}
			<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
				<h2 className="text-xl font-semibold mb-6 dark:text-white">Performance Statistics</h2>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Redis Stats */}
					<div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
						<h3 className="text-lg font-medium mb-4 text-blue-700 dark:text-blue-300">Redis (Cached) Stats</h3>
						
						<div className="space-y-2">
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Total Benchmarks:</span>
								<span className="font-medium dark:text-white">{results.filter(r => r.storage === 'redis').length}</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Average Ops/Second:</span>
								<span className="font-medium dark:text-white">
									{(results
										.filter(r => r.storage === 'redis')
										.reduce((sum, r) => sum + (r.opsPerSecond || 0), 0) / 
										Math.max(1, results.filter(r => r.storage === 'redis').length)
									).toFixed(2)}
								</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Max Ops/Second:</span>
								<span className="font-medium dark:text-white">
									{Math.max(
										0, 
										...results
											.filter(r => r.storage === 'redis')
											.map(r => r.opsPerSecond || 0)
									).toFixed(2)}
								</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Average Duration:</span>
								<span className="font-medium dark:text-white">
									{(results
										.filter(r => r.storage === 'redis')
										.reduce((sum, r) => sum + (r.duration || 0), 0) / 
										Math.max(1, results.filter(r => r.storage === 'redis').length)
									).toFixed(2)} seconds
								</span>
							</div>
						</div>
					</div>
					
					{/* DB Stats */}
					<div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
						<h3 className="text-lg font-medium mb-4 text-red-700 dark:text-red-300">Database (Uncached) Stats</h3>
						
						<div className="space-y-2">
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Total Benchmarks:</span>
								<span className="font-medium dark:text-white">{results.filter(r => r.storage === 'db').length}</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Average Ops/Second:</span>
								<span className="font-medium dark:text-white">
									{(results
										.filter(r => r.storage === 'db')
										.reduce((sum, r) => sum + (r.opsPerSecond || 0), 0) / 
										Math.max(1, results.filter(r => r.storage === 'db').length)
									).toFixed(2)}
								</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Max Ops/Second:</span>
								<span className="font-medium dark:text-white">
									{Math.max(
										0, 
										...results
											.filter(r => r.storage === 'db')
											.map(r => r.opsPerSecond || 0)
									).toFixed(2)}
								</span>
							</div>
							
							<div className="flex justify-between">
								<span className="text-gray-600 dark:text-gray-300">Average Duration:</span>
								<span className="font-medium dark:text-white">
									{(results
										.filter(r => r.storage === 'db')
										.reduce((sum, r) => sum + (r.duration || 0), 0) / 
										Math.max(1, results.filter(r => r.storage === 'db').length)
									).toFixed(2)} seconds
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}