import { useState } from 'react'

export default function BenchmarkForm({ onSubmit, isLoading }) {
	const [formData, setFormData] = useState({
		type: 'mixed',
		storage: 'redis', // 'redis' or 'db'
		requests: 1000,
		size: 3,
		ratio: '1:1',
		cachedRatio: '1:1',
		name: ''
	})
	const [runningBenchmark, setRunningBenchmark] = useState(false)
	const [progress, setProgress] = useState(0)
	const [predefinedTests, setPredefinedTests] = useState([
		{ name: 'Redis GET (100% Cached)', type: 'get', storage: 'redis', requests: 1000, size: 3, cachedRatio: '1:0' },
		{ name: 'DB GET (Uncached)', type: 'get', storage: 'db', requests: 1000, size: 3 },
		{ name: 'Redis SET', type: 'set', storage: 'redis', requests: 1000, size: 3, cachedRatio: '1:0' },
		{ name: 'DB SET', type: 'set', storage: 'db', requests: 1000, size: 3 },
		{ name: 'Redis Mixed 50/50', type: 'mixed', storage: 'redis', requests: 1000, size: 3, ratio: '1:1', cachedRatio: '1:0' },
		{ name: 'DB Mixed 50/50', type: 'mixed', storage: 'db', requests: 1000, size: 3, ratio: '1:1' }
	])

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData(prevData => ({
			...prevData,
			[name]: value
		}))
	}

	const handleNumberChange = (e) => {
		const { name, value } = e.target
		setFormData(prevData => ({
			...prevData,
			[name]: parseInt(value) || 0
		}))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		
		setRunningBenchmark(true)
		setProgress(0)
		
		// Simulate progress updates while benchmark is running
		const progressInterval = setInterval(() => {
			setProgress(prev => {
				const newProgress = prev + (5 + Math.random() * 10)
				return newProgress > 95 ? 95 : newProgress // Cap at 95% until complete
			})
		}, 300)
		
		try {
			await onSubmit(formData)
		} finally {
			clearInterval(progressInterval)
			setProgress(100)
			setTimeout(() => {
				setRunningBenchmark(false)
				setProgress(0)
			}, 1000)
		}
	}

	const handlePredefinedTest = (test) => {
		setFormData({
			...test,
			name: test.name // Use predefined test name
		})
	}

	const runAllBenchmarks = async () => {
		setRunningBenchmark(true)
		setProgress(0)
		
		// Run each predefined test sequentially
		for (let i = 0; i < predefinedTests.length; i++) {
			const test = predefinedTests[i]
			setFormData(test)
			
			// Update progress based on current test
			setProgress((i / predefinedTests.length) * 100)
			
			// Run the benchmark
			try {
				await onSubmit(test)
			} catch (error) {
				console.error(`Error running benchmark ${test.name}:`, error)
				// Continue with next test despite errors
			}
		}
		
		setProgress(100)
		setTimeout(() => {
			setRunningBenchmark(false)
			setProgress(0)
		}, 1000)
	}

	return (
		<div className="space-y-6">
			{/* Predefined Tests Section */}
			<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
				<h2 className="text-xl font-semibold mb-4 dark:text-white">Quick Benchmark Tests</h2>
				<p className="text-gray-600 mb-4 dark:text-gray-400">Run predefined benchmark configurations with a single click</p>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{predefinedTests.map((test, index) => (
						<div 
							key={index} 
							className={`p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
								test.storage === 'redis' ? 'border-l-4 border-blue-500' : 'border-l-4 border-red-500'
							}`}
							onClick={() => handlePredefinedTest(test)}
						>
							<h3 className="font-medium dark:text-white">{test.name}</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{test.type.toUpperCase()} • {test.requests.toLocaleString()} requests • {test.size} bytes
							</p>
							<div className="mt-2">
								<button
									className={`px-3 py-1 text-sm rounded ${
										test.storage === 'redis' 
											? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70'
											: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70'
									}`}
									onClick={(e) => {
										e.stopPropagation()
										onSubmit(test)
									}}
									disabled={isLoading}
								>
									Run Test
								</button>
							</div>
						</div>
					))}
				</div>
				
				<div className="mt-6 text-center">
					<button
						className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-6 rounded-md shadow transition-all"
						onClick={runAllBenchmarks}
						disabled={isLoading || runningBenchmark}
					>
						{isLoading || runningBenchmark ? 'Running All Benchmarks...' : 'Run All Benchmarks'}
					</button>
				</div>
			</div>
			
			{/* Custom Benchmark Form */}
			<div className="bg-white shadow rounded-lg p-6 dark:bg-gray-800">
				<h2 className="text-xl font-semibold mb-4 dark:text-white">Custom Benchmark</h2>
				<p className="text-gray-600 mb-4 dark:text-gray-400">Configure and run a custom benchmark with specific parameters</p>

				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
								Benchmark Name
							</label>
							<input
								type="text"
								name="name"
								className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
								value={formData.name}
								onChange={handleChange}
								placeholder="My Benchmark Run"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
								Storage Type
							</label>
							<div className="grid grid-cols-2 gap-4">
								<div
									className={`border rounded-md px-4 py-3 flex items-center cursor-pointer ${
										formData.storage === 'redis'
											? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500'
											: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
									}`}
									onClick={() => setFormData(prev => ({ ...prev, storage: 'redis' }))}
								>
									<div className={`w-4 h-4 rounded-full mr-2 ${formData.storage === 'redis' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
									<div>
										<div className="font-medium dark:text-white">Redis</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">Cached Operations</div>
									</div>
								</div>
								
								<div
									className={`border rounded-md px-4 py-3 flex items-center cursor-pointer ${
										formData.storage === 'db'
											? 'bg-red-50 border-red-500 dark:bg-red-900/30 dark:border-red-500'
											: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
									}`}
									onClick={() => setFormData(prev => ({ ...prev, storage: 'db' }))}
								>
									<div className={`w-4 h-4 rounded-full mr-2 ${formData.storage === 'db' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
									<div>
										<div className="font-medium dark:text-white">Database</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">Uncached Operations</div>
									</div>
								</div>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
								Benchmark Type
							</label>
							<div className="grid grid-cols-3 gap-2">
								{['get', 'set', 'mixed'].map(type => (
									<div
										key={type}
										className={`border rounded-md px-3 py-2 text-center cursor-pointer ${
											formData.type === type
												? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-500'
												: 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
										}`}
										onClick={() => setFormData(prev => ({ ...prev, type }))}
									>
										<div className="font-medium dark:text-white">{type.toUpperCase()}</div>
									</div>
								))}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
								Number of Requests
							</label>
							<input
								type="number"
								name="requests"
								className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
								value={formData.requests}
								onChange={handleNumberChange}
								min="100"
								max="100000"
							/>
							<div className="mt-2">
								<input
									type="range"
									name="requests"
									min="100"
									max="10000"
									step="100"
									value={formData.requests}
									onChange={handleNumberChange}
									className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
								/>
								<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
									<span>100</span>
									<span>10,000</span>
								</div>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
								Data Size (bytes)
							</label>
							<input
								type="number"
								name="size"
								className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
								value={formData.size}
								onChange={handleNumberChange}
								min="1"
								max="1024"
							/>
							<div className="mt-2">
								<input
									type="range"
									name="size"
									min="1"
									max="100"
									value={formData.size}
									onChange={handleNumberChange}
									className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
								/>
								<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
									<span>1</span>
									<span>100</span>
								</div>
							</div>
						</div>

						{formData.type === 'mixed' && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
									SET:GET Ratio
								</label>
								<select
									name="ratio"
									className="w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
									value={formData.ratio}
									onChange={handleChange}
								>
									<option value="1:0">All Cached</option>
									<option value="3:1">Mostly Cached (75%)</option>
									<option value="1:1">Half Cached (50%)</option>
									<option value="1:3">Mostly Uncached (25%)</option>
									<option value="0:1">All Uncached</option>
								</select>
							</div>
						)}
					</div>

					<div className="mt-6">
						{runningBenchmark || isLoading ? (
							<div className="space-y-2">
								<div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
									<div 
										className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
										style={{ width: `${progress}%` }}
									></div>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Running benchmark... {Math.round(progress)}%
								</p>
							</div>
						) : (
							<button
								type="submit"
								className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow transition-colors"
							>
								Run Benchmark
							</button>
						)}
					</div>
				</form>
			</div>
			
			{/* Benchmark Info Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
					<h3 className="font-medium text-lg mb-2 dark:text-white">Redis Performance</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Redis benchmarks simulate a cached key-value store with instant or near-instant retrieval times for cached items. This represents optimized database access patterns.
					</p>
				</div>
				
				<div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
					<h3 className="font-medium text-lg mb-2 dark:text-white">Database Performance</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Database benchmarks simulate uncached database access with simulated IO latency. This represents the worst-case scenario for database interactions.
					</p>
				</div>
				
				<div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
					<h3 className="font-medium text-lg mb-2 dark:text-white">Benchmark Parameters</h3>
					<p className="text-gray-600 dark:text-gray-400">
						Test with different operation types (GET, SET, MIXED), request counts, data sizes, and caching ratios to evaluate performance under various conditions.
					</p>
				</div>
			</div>
		</div>
	)
}