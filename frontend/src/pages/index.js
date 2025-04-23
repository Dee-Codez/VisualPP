import { useState } from 'react'
import Head from 'next/head'
import BenchmarkForm from '../components/BenchmarkForm'
import ResultsCharts from '../components/ResultsCharts'
import Leaderboard from '../components/Leaderboard'
import Tabs from '../components/Tabs'

export default function Home() {
	const [activeTab, setActiveTab] = useState('benchmark')
	const [results, setResults] = useState([])
	const [isLoading, setIsLoading] = useState(false)

	const tabs = [
		{ id: 'benchmark', label: 'Run Benchmark' },
		{ id: 'results', label: 'Charts' },
		{ id: 'leaderboard', label: 'Leaderboard' }
	]

	const runBenchmark = async (benchmarkConfig) => {
		setIsLoading(true)
		try {
			const response = await fetch('/api/benchmark', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(benchmarkConfig)
			})

			if (!response.ok) {
				throw new Error('Benchmark failed')
			}

			const result = await response.json()
			
			// Add timestamp and ID
			const newResult = {
				...result,
				id: `run-${Date.now()}`,
				timestamp: new Date().toISOString()
			}
			
			// Add to results and save to API
			const updatedResults = [...results, newResult]
			setResults(updatedResults)
			
			// Save to "database"
			await fetch('/api/results', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newResult)
			})
			
			// Switch to results tab
			setActiveTab('results')
		} catch (error) {
			console.error('Error running benchmark:', error)
			alert('Failed to run benchmark')
		} finally {
			setIsLoading(false)
		}
	}

	// Load saved results on initial load
	useState(() => {
		const loadResults = async () => {
			try {
				const response = await fetch('http://localhost:3000/api/results')
				if (response.ok) {
					const data = await response.json()
					setResults(data)
				}
			} catch (error) {
				console.error('Error loading results:', error)
			}
		}
		
		loadResults()
	}, [])

	return (
		<div className="min-h-screen bg-gray-50">
			<Head>
				<title>KV Store Benchmark Dashboard</title>
				<meta name="description" content="Benchmark your key-value store" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
					<h1 className="text-3xl font-bold text-gray-900">KV Store Benchmark Dashboard</h1>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
				<Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

				<div className="mt-6">
					{activeTab === 'benchmark' && (
						<BenchmarkForm onSubmit={runBenchmark} isLoading={isLoading} />
					)}
					
					{activeTab === 'results' && (
						<ResultsCharts results={results} />
					)}
					
					{activeTab === 'leaderboard' && (
						<Leaderboard results={results} />
					)}
				</div>
			</main>
		</div>
	)
}