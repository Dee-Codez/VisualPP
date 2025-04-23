import { useState, useMemo } from 'react'
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	AreaChart,
	Area,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar,
	ScatterChart,
	Scatter,
	ZAxis
} from 'recharts'

export default function ResultsCharts({ results }) {
	const [chartType, setChartType] = useState('line')
	const [operationType, setOperationType] = useState('all')
	const [selectedTimeFrame, setSelectedTimeFrame] = useState('all')

	if (!results || results.length === 0) {
		return (
			<div className="bg-white shadow rounded-lg p-6 text-center dark:bg-gray-800">
				<p className="text-gray-500 dark:text-gray-400">No benchmark results available yet.</p>
				<p className="text-gray-500 dark:text-gray-400 mt-2">Run a benchmark to see charts here.</p>
			</div>
		)
	}

	// Define hardcoded colors for consistency
	const REDIS_COLOR = '#3b82f6' // Blue
	const DB_COLOR = '#ef4444'    // Red
	const MIXED_COLOR = '#8884d8' // Purple
	const ACCENT_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899']

	// Filter results based on operation type and timeframe
	const filteredResults = useMemo(() => {
		let filtered = [...results]
		
		// Filter by operation type
		if (operationType !== 'all') {
			filtered = filtered.filter(r => r.type === operationType)
		}
		
		// Filter by timeframe if needed
		if (selectedTimeFrame !== 'all') {
			const now = new Date()
			const cutoffDate = new Date()
			
			if (selectedTimeFrame === 'day') {
				cutoffDate.setDate(now.getDate() - 1)
			} else if (selectedTimeFrame === 'week') {
				cutoffDate.setDate(now.getDate() - 7)
			} else if (selectedTimeFrame === 'month') {
				cutoffDate.setMonth(now.getMonth() - 1)
			}
			
			filtered = filtered.filter(r => new Date(r.timestamp) >= cutoffDate)
		}
		
		return filtered
	}, [results, operationType, selectedTimeFrame])

	// Prepare data for main charts
	const chartData = useMemo(() => {
		return filteredResults.map(result => ({
			name: result.name || `Run ${result.id.substring(4, 8)}`,
			opsPerSecond: result.opsPerSecond || 0,
			duration: result.duration || 0,
			requests: result.requests || 0,
			type: result.type || 'unknown',
			storage: result.storage || 'unknown',
			timestamp: result.timestamp || new Date().toISOString(),
			// Color based on storage type (hardcoded)
			color: result.storage === 'redis' ? REDIS_COLOR : DB_COLOR
		}))
	}, [filteredResults])

	// Calculate statistics
	const stats = useMemo(() => {
		if (chartData.length === 0) {
			return {
				avgOpsPerSecond: 0,
				maxOpsPerSecond: 0,
				totalRequests: 0,
				redisAvg: 0,
				dbAvg: 0,
				speedupRatio: 0
			}
		}
		
		const redisResults = chartData.filter(item => item.storage === 'redis')
		const dbResults = chartData.filter(item => item.storage === 'db')
		
		const redisAvg = redisResults.length > 0 
			? redisResults.reduce((sum, item) => sum + item.opsPerSecond, 0) / redisResults.length 
			: 0
		
		const dbAvg = dbResults.length > 0 
			? dbResults.reduce((sum, item) => sum + item.opsPerSecond, 0) / dbResults.length 
			: 0
		
		// Safe division to avoid infinity
		const speedupRatio = dbAvg > 0 ? redisAvg / dbAvg : 0
		
		return {
			avgOpsPerSecond: chartData.reduce((sum, item) => sum + item.opsPerSecond, 0) / chartData.length,
			maxOpsPerSecond: Math.max(...chartData.map(item => item.opsPerSecond)),
			totalRequests: chartData.reduce((sum, item) => sum + item.requests, 0),
			redisAvg,
			dbAvg,
			speedupRatio
		}
	}, [chartData])

	// Data for operation type comparison
	const operationTypeData = useMemo(() => {
		// Group by operation type
		const types = ['get', 'set', 'mixed']
		return types.map(type => {
			const typeResults = results.filter(r => r.type === type)
			const redisResults = typeResults.filter(r => r.storage === 'redis')
			const dbResults = typeResults.filter(r => r.storage === 'db')
			
			const redisAvg = redisResults.length > 0 
				? redisResults.reduce((sum, r) => sum + (r.opsPerSecond || 0), 0) / redisResults.length 
				: 0
			
			const dbAvg = dbResults.length > 0 
				? dbResults.reduce((sum, r) => sum + (r.opsPerSecond || 0), 0) / dbResults.length 
				: 0
			
			return {
				name: type.toUpperCase(),
				redis: redisAvg,
				db: dbAvg,
				ratio: dbAvg > 0 ? redisAvg / dbAvg : 0
			}
		})
	}, [results])

	// Data for Redis vs DB comparison
	const comparisonData = useMemo(() => {
		return [
			{
				name: 'Redis (Cached)',
				ops: stats.redisAvg,
				color: REDIS_COLOR
			},
			{
				name: 'Database (Uncached)',
				ops: stats.dbAvg,
				color: DB_COLOR
			}
		]
	}, [stats])

	// Data for pie chart
	const pieData = useMemo(() => {
		// Avoid zero values which cause issues in pie charts
		const redisValue = Math.max(stats.redisAvg, 0.001)
		const dbValue = Math.max(stats.dbAvg, 0.001)
		
		return [
			{ name: 'Redis', value: redisValue, color: REDIS_COLOR },
			{ name: 'Database', value: dbValue, color: DB_COLOR }
		]
	}, [stats])

	// Distribution of operation types
	const operationDistribution = useMemo(() => {
		const counts = {
			get: results.filter(r => r.type === 'get').length,
			set: results.filter(r => r.type === 'set').length,
			mixed: results.filter(r => r.type === 'mixed').length
		}
		
		// Convert to data array for pie chart
		return [
			{ name: 'GET', value: counts.get || 0.001, color: ACCENT_COLORS[0] },
			{ name: 'SET', value: counts.set || 0.001, color: ACCENT_COLORS[1] },
			{ name: 'MIXED', value: counts.mixed || 0.001, color: ACCENT_COLORS[2] }
		]
	}, [results])

	// Data for scatter plot comparing duration vs ops/second
	const scatterData = useMemo(() => {
		return [
			{
				name: 'Redis',
				data: results
					.filter(r => r.storage === 'redis')
					.map(r => ({ 
						x: r.duration || 0, 
						y: r.opsPerSecond || 0, 
						name: r.name || r.id,
						type: r.type
					})),
				color: REDIS_COLOR
			},
			{
				name: 'Database',
				data: results
					.filter(r => r.storage === 'db')
					.map(r => ({ 
						x: r.duration || 0, 
						y: r.opsPerSecond || 0, 
						name: r.name || r.id,
						type: r.type
					})),
				color: DB_COLOR
			}
		]
	}, [results])

	// Data for radar chart comparing different aspects
	const radarData = useMemo(() => {
		// Normalize values to be on similar scales
		const maxOps = Math.max(...results.map(r => r.opsPerSecond || 0))
		const maxDuration = Math.max(...results.map(r => r.duration || 0))
		const maxRequests = Math.max(...results.map(r => r.requests || 0))
		
		return [
			{
				subject: 'Ops/Second',
				redis: (stats.redisAvg / (maxOps || 1)) * 100,
				db: (stats.dbAvg / (maxOps || 1)) * 100,
				fullMark: 100
			},
			{
				subject: 'Speed',
				redis: maxDuration > 0 ? (1 - (redisAvgDuration() / maxDuration)) * 100 : 0,
				db: maxDuration > 0 ? (1 - (dbAvgDuration() / maxDuration)) * 100 : 0,
				fullMark: 100
			},
			{
				subject: 'Consistency',
				redis: calculateConsistency('redis'),
				db: calculateConsistency('db'),
				fullMark: 100
			},
			{
				subject: 'Efficiency',
				redis: calculateEfficiency('redis'),
				db: calculateEfficiency('db'),
				fullMark: 100
			},
			{
				subject: 'Scalability',
				redis: 90, // Theoretical value
				db: 60,    // Theoretical value
				fullMark: 100
			}
		]
	}, [results, stats])

	// Helper function to calculate average duration for Redis
	function redisAvgDuration() {
		const redisResults = results.filter(r => r.storage === 'redis')
		return redisResults.length > 0
			? redisResults.reduce((sum, r) => sum + (r.duration || 0), 0) / redisResults.length
			: 0
	}

	// Helper function to calculate average duration for DB
	function dbAvgDuration() {
		const dbResults = results.filter(r => r.storage === 'db')
		return dbResults.length > 0
			? dbResults.reduce((sum, r) => sum + (r.duration || 0), 0) / dbResults.length
			: 0
	}

	// Helper function to calculate consistency score (lower std deviation = higher consistency)
	function calculateConsistency(storageType) {
		const filteredResults = results.filter(r => r.storage === storageType)
		if (filteredResults.length < 2) return 50 // Default score

		const values = filteredResults.map(r => r.opsPerSecond || 0)
		const mean = values.reduce((sum, v) => sum + v, 0) / values.length
		const squareDiffs = values.map(v => (v - mean) ** 2)
		const stdDev = Math.sqrt(squareDiffs.reduce((sum, sq) => sum + sq, 0) / values.length)
		
		// Convert to a 0-100 scale (lower stdDev = higher consistency)
		const maxPossibleStdDev = mean // Assume the worst case stdDev could be equal to the mean
		const consistencyScore = Math.max(0, Math.min(100, 100 - ((stdDev / maxPossibleStdDev) * 100)))
		
		return consistencyScore || 50 // Default to 50 if calculation fails
	}

	// Helper function to calculate efficiency (ops per second per request)
	function calculateEfficiency(storageType) {
		const filteredResults = results.filter(r => r.storage === storageType)
		if (filteredResults.length === 0) return 50 // Default score

		// Average efficiency score
		const efficiencies = filteredResults.map(r => {
			const reqCount = r.requests || 1
			return (r.opsPerSecond || 0) / reqCount
		})
		
		const avgEfficiency = efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length
		
		// Scale to 0-100 (this is arbitrary but gives us a relative measure)
		// We'll say 1 op/sec per request = 50% efficiency
		const normalizedEfficiency = Math.min(100, avgEfficiency * 50)
		
		return normalizedEfficiency || 50 // Default to 50 if calculation fails
	}

	// Historical trend data
	const trendData = useMemo(() => {
		// Sort by timestamp
		const sortedResults = [...results].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		)
		
		// Group by day for the chart
		const groupedByDay = {}
		sortedResults.forEach(result => {
			const date = new Date(result.timestamp).toISOString().split('T')[0]
			if (!groupedByDay[date]) {
				groupedByDay[date] = { 
					redis: [], 
					db: [] 
				}
			}
			
			if (result.storage === 'redis') {
				groupedByDay[date].redis.push(result.opsPerSecond || 0)
			} else if (result.storage === 'db') {
				groupedByDay[date].db.push(result.opsPerSecond || 0)
			}
		})
		
		// Calculate averages for each day
		return Object.keys(groupedByDay).map(date => {
			const redisAvg = groupedByDay[date].redis.length > 0
				? groupedByDay[date].redis.reduce((a, b) => a + b, 0) / groupedByDay[date].redis.length
				: 0
				
			const dbAvg = groupedByDay[date].db.length > 0
				? groupedByDay[date].db.reduce((a, b) => a + b, 0) / groupedByDay[date].db.length
				: 0
				
			return {
				date,
				redis: redisAvg,
				db: dbAvg,
				ratio: dbAvg > 0 ? redisAvg / dbAvg : 0
			}
		})
	}, [results])

	return (
		<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
			<div className="flex flex-col md:flex-row justify-between mb-6 items-center">
				<h2 className="text-xl font-semibold dark:text-white">Benchmark Results</h2>
				
				<div className="flex flex-wrap mt-4 md:mt-0 gap-2">
					<select
						className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
						value={operationType}
						onChange={(e) => setOperationType(e.target.value)}
					>
						<option value="all">All Operations</option>
						<option value="set">SET Operations</option>
						<option value="get">GET Operations</option>
						<option value="mixed">Mixed Operations</option>
					</select>

					<select
						className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
						value={chartType}
						onChange={(e) => setChartType(e.target.value)}
					>
						<option value="line">Line Chart</option>
						<option value="bar">Bar Chart</option>
						<option value="area">Area Chart</option>
					</select>
					
					<select
						className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
						value={selectedTimeFrame}
						onChange={(e) => setSelectedTimeFrame(e.target.value)}
					>
						<option value="all">All Time</option>
						<option value="day">Last 24 Hours</option>
						<option value="week">Last Week</option>
						<option value="month">Last Month</option>
					</select>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
					<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Ops/Second</h3>
					<p className="text-2xl font-bold dark:text-white">{stats.avgOpsPerSecond.toFixed(2)}</p>
				</div>
				<div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
					<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Ops/Second</h3>
					<p className="text-2xl font-bold dark:text-white">{stats.maxOpsPerSecond.toFixed(2)}</p>
				</div>
				<div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
					<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Redis/DB Speed Ratio</h3>
					<p className="text-2xl font-bold dark:text-white">{stats.speedupRatio.toFixed(2)}x</p>
				</div>
				<div className="bg-gray-50 p-4 rounded-lg dark:bg-gray-700">
					<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</h3>
					<p className="text-2xl font-bold dark:text-white">{stats.totalRequests.toLocaleString()}</p>
				</div>
			</div>

			{/* Main Chart */}
			<div className="h-80 mb-8">
				<ResponsiveContainer width="100%" height="100%">
					{chartType === 'line' ? (
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="name" />
							<YAxis label={{ value: 'Operations per Second', angle: -90, position: 'insideLeft' }} />
							<Tooltip formatter={(value) => [value.toFixed(2), 'Ops/Second']} />
							<Legend />
							<Line
								type="monotone"
								dataKey="opsPerSecond"
								name="Ops/Second"
								stroke={MIXED_COLOR}
								strokeWidth={2}
								dot={{ 
									stroke: (entry) => entry.storage === 'redis' ? REDIS_COLOR : DB_COLOR,
									strokeWidth: 2, 
									r: 4 
								}}
								activeDot={{ r: 8 }}
							/>
						</LineChart>
					) : chartType === 'bar' ? (
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="name" />
							<YAxis label={{ value: 'Operations per Second', angle: -90, position: 'insideLeft' }} />
							<Tooltip formatter={(value) => [value.toFixed(2), 'Ops/Second']} />
							<Legend />
							<Bar
								dataKey="opsPerSecond"
								name="Ops/Second"
								fill={(entry) => entry.storage === 'redis' ? REDIS_COLOR : DB_COLOR}
							/>
						</BarChart>
					) : (
						<AreaChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="name" />
							<YAxis label={{ value: 'Operations per Second', angle: -90, position: 'insideLeft' }} />
							<Tooltip formatter={(value) => [value.toFixed(2), 'Ops/Second']} />
							<Legend />
							<Area
								type="monotone"
								dataKey="opsPerSecond"
								name="Ops/Second"
								stroke={MIXED_COLOR}
								fill={MIXED_COLOR}
								fillOpacity={0.3}
							/>
						</AreaChart>
					)}
				</ResponsiveContainer>
			</div>

			{/* Storage Comparison & Operation Type */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Redis vs Database Comparison</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={comparisonData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="name" />
								<YAxis label={{ value: 'Avg Ops/Second', angle: -90, position: 'insideLeft' }} />
								<Tooltip formatter={(value) => [value.toFixed(2), 'Avg Ops/Second']} />
								<Legend />
								<Bar 
									dataKey="ops" 
									name="Avg Ops/Second" 
									fill={(entry) => entry.name.includes('Redis') ? REDIS_COLOR : DB_COLOR} 
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Performance by Operation Type</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={operationTypeData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="name" />
								<YAxis />
								<Tooltip 
									formatter={(value, name) => [
										value.toFixed(2), 
										name === 'redis' ? 'Redis Ops/Sec' : name === 'db' ? 'DB Ops/Sec' : 'Speed Ratio'
									]}
								/>
								<Legend />
								<Bar dataKey="redis" name="Redis (Cached)" fill={REDIS_COLOR} />
								<Bar dataKey="db" name="Database (Uncached)" fill={DB_COLOR} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Pie Chart & Scatter Plot */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Performance Distribution</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									labelLine={true}
									outerRadius={80}
									fill="#8884d8"
									dataKey="value"
									nameKey="name"
									label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
								>
									{pieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip formatter={(value) => [value.toFixed(2), 'Ops/Second']} />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>
				
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Operation Type Distribution</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={operationDistribution}
									cx="50%"
									cy="50%"
									labelLine={true}
									outerRadius={80}
									fill="#8884d8"
									dataKey="value"
									nameKey="name"
									label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
								>
									{operationDistribution.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip formatter={(value) => [value, 'Tests']} />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Performance Scatter Plot & Radar Chart */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Duration vs Performance</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
								<CartesianGrid />
								<XAxis 
									type="number" 
									dataKey="x" 
									name="Duration" 
									unit="s" 
									label={{ 
										value: 'Duration (s)', 
										position: 'insideBottomRight', 
										offset: -5 
									}}
								/>
								<YAxis 
									type="number" 
									dataKey="y" 
									name="Operations/Second" 
									label={{ 
										value: 'Ops/Second', 
										angle: -90, 
										position: 'insideLeft' 
									}}
								/>
								<Tooltip 
									cursor={{ strokeDasharray: '3 3' }}
									formatter={(value, name) => [value.toFixed(2), name === 'x' ? 'Duration (s)' : 'Ops/Second']}
									content={({ active, payload }) => {
										if (active && payload && payload.length) {
											const data = payload[0].payload
											return (
												<div className="bg-white p-2 border border-gray-300 rounded shadow dark:bg-gray-800 dark:border-gray-600">
													<p className="font-medium">{data.name}</p>
													<p>Type: {data.type}</p>
													<p>Duration: {data.x.toFixed(2)}s</p>
													<p>Ops/Second: {data.y.toFixed(2)}</p>
												</div>
											)
										}
										return null
									}}
								/>
								<Legend />
								{scatterData.map((s, index) => (
									<Scatter 
										key={`scatter-${index}`}
										name={s.name} 
										data={s.data} 
										fill={s.color} 
										shape="circle"
									/>
								))}
							</ScatterChart>
						</ResponsiveContainer>
					</div>
				</div>
				
				<div className="bg-gray-50 p-4 rounded-lg shadow dark:bg-gray-700">
					<h3 className="text-lg font-medium mb-4 dark:text-white">Performance Metrics Comparison</h3>
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<RadarChart outerRadius={90} data={radarData}>
								<PolarGrid />
								<PolarAngleAxis dataKey="subject" />
								<PolarRadiusAxis angle={30} domain={[0, 100]} />
								<Radar 
									name="Redis (Cached)" 
									dataKey="redis" 
									stroke={REDIS_COLOR} 
									fill={REDIS_COLOR} 
									fillOpacity={0.5} 
								/>
								<Radar 
									name="Database (Uncached)" 
									dataKey="db" 
									stroke={DB_COLOR} 
									fill={DB_COLOR} 
									fillOpacity={0.5} 
								/>
								<Legend />
								<Tooltip formatter={(value) => [value.toFixed(1), 'Score (0-100)']} />
							</RadarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Historical Trends */}
			<div className="bg-gray-50 p-4 rounded-lg shadow mb-6 dark:bg-gray-700">
				<h3 className="text-lg font-medium mb-4 dark:text-white">Performance Trends Over Time</h3>
				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={trendData}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis yAxisId="left" label={{ value: 'Operations per Second', angle: -90, position: 'insideLeft' }} />
							<YAxis yAxisId="right" orientation="right" label={{ value: 'Speed Ratio', angle: 90, position: 'insideRight' }} />
							<Tooltip formatter={(value, name) => [
								value.toFixed(2), 
								name === 'redis' ? 'Redis Ops/Sec' : 
								name === 'db' ? 'DB Ops/Sec' : 
								'Redis/DB Ratio'
							]} />
							<Legend />
							<Line 
								yAxisId="left"
								type="monotone" 
								dataKey="redis" 
								name="Redis (Cached)" 
								stroke={REDIS_COLOR} 
								activeDot={{ r: 8 }} 
							/>
							<Line 
								yAxisId="left"
								type="monotone" 
								dataKey="db" 
								name="Database (Uncached)" 
								stroke={DB_COLOR} 
								activeDot={{ r: 8 }} 
							/>
							<Line 
								yAxisId="right"
								type="monotone" 
								dataKey="ratio" 
								name="Speed Ratio" 
								stroke="#10b981" 
								strokeDasharray="5 5"
								activeDot={{ r: 8 }} 
							/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

