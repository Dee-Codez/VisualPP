import json
import os
import time
import argparse
import random
import string
from datetime import datetime
import sys
import uuid

class FileBackedKeyValueStore:
    def __init__(self, filename='kv_store.json', results_file='benchmark_results.json'):
        self.filename = filename
        self.results_file = results_file
        self.store = {}  # Main storage
        self.cache = {}  # Cache storage
        self.load_from_file()

    def load_from_file(self):
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    data = json.load(f)
                    # Convert the flat structure to our internal format
                    for key, item in data.items():
                        if isinstance(item, dict) and 'value' in item and 'cached' in item:
                            self.store[key] = item
                        else:
                            # Handle legacy data format
                            self.store[key] = {'value': item, 'cached': False}
            except Exception as e:
                sys.stderr.write(f"Error loading data file: {e}\n")
                self.store = {}

    def save_to_file(self):
        try:
            with open(self.filename, 'w') as f:
                json.dump(self.store, f)
        except Exception as e:
            sys.stderr.write(f"Error saving data file: {e}\n")

    def save_benchmark_result(self, result):
        """Save a benchmark result to the results file"""
        results = []
        
        # Load existing results if available
        if os.path.exists(self.results_file):
            try:
                with open(self.results_file, 'r') as f:
                    results = json.load(f)
            except Exception as e:
                sys.stderr.write(f"Error loading results file: {e}\n")
                results = []
        
        # Add new result
        results.append(result)
        
        # Save updated results
        try:
            with open(self.results_file, 'w') as f:
                json.dump(results, f, indent=2)
            return True
        except Exception as e:
            sys.stderr.write(f"Error saving results file: {e}\n")
            return False

    def get_benchmark_results(self):
        """Get all saved benchmark results"""
        if os.path.exists(self.results_file):
            try:
                with open(self.results_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                sys.stderr.write(f"Error reading results file: {e}\n")
        return []

    def set(self, key, value, cached=False):
        self.store[key] = {'value': value, 'cached': cached}
        self.save_to_file()
        return True

    def get(self, key):
        if key not in self.store:
            return None
            
        item = self.store[key]
        
        # If the item is not cached, simulate a delay
        if not item['cached']:
            sys.stderr.write(f"Data for key '{key}' is not cached. Retrieving from storage...\n")
            # Simulate a delay for non-cached items (between 0.5 and 2 seconds)
            delay = random.uniform(0.5, 2.0)
            time.sleep(delay)
            sys.stderr.write(f"Retrieved after {delay:.2f} seconds.\n")
        else:
            sys.stderr.write(f"Data for key '{key}' is cached. Instant retrieval.\n")
            
        return item['value']

    def getset(self, key, value, cached=False):
        old_value = None
        if key in self.store:
            old_value = self.store[key]['value']
            
        self.store[key] = {'value': value, 'cached': cached}
        self.save_to_file()
        return old_value
        
    def set_cached(self, key, cached=True):
        """Update the cached status of a key"""
        if key in self.store:
            self.store[key]['cached'] = cached
            self.save_to_file()
            return True
        return False
        
    def get_cached_status(self, key):
        """Get the cached status of a key"""
        if key in self.store:
            return self.store[key]['cached']
        return None

class RedisCLI:
    def __init__(self, filename='kv_store.json', results_file='benchmark_results.json'):
        self.kv_store = FileBackedKeyValueStore(filename, results_file)
    
    def set_value(self, key, value, cached=False):
        return self.kv_store.set(key, value, cached)
    
    def get_value(self, key):
        return self.kv_store.get(key)
    
    def getset_value(self, key, value, cached=False):
        return self.kv_store.getset(key, value, cached)
        
    def set_cached_status(self, key, cached=True):
        return self.kv_store.set_cached(key, cached)
        
    def get_cached_status(self, key):
        return self.kv_store.get_cached_status(key)
        
    def get_benchmark_results(self):
        return self.kv_store.get_benchmark_results()
    
    def benchmark_set(self, num_requests=10000, data_size=3, cached_ratio="0:1", storage_type="redis", name=None, quiet=False):
        """Benchmark SET operations with a mix of cached and non-cached values"""
        if not quiet:
            sys.stderr.write(f"Benchmarking SET operations with {num_requests} requests and {data_size} bytes payload\n")
        
        cached_ratio_parts = list(map(int, cached_ratio.split(':')))
        cached_probability = cached_ratio_parts[0] / sum(cached_ratio_parts) if sum(cached_ratio_parts) > 0 else 0
        
        # For DB storage, always use uncached
        if storage_type == "db":
            cached_probability = 0
        
        start_time = time.time()
        
        for i in range(num_requests):
            key = f"benchmark:set:{i}"
            value = ''.join(random.choices(string.ascii_letters + string.digits, k=data_size))
            is_cached = random.random() < cached_probability
            self.set_value(key, value, is_cached)
        
        end_time = time.time()
        duration = end_time - start_time
        ops_per_second = num_requests / duration
        
        result = {
            "id": f"run-{uuid.uuid4().hex[:8]}",
            "name": name or f"{storage_type.upper()} SET Benchmark",
            "type": "set",
            "storage": storage_type,
            "requests": num_requests,
            "size": data_size,
            "cachedRatio": cached_ratio,
            "duration": round(duration, 2),
            "opsPerSecond": round(ops_per_second, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        if not quiet:
            sys.stderr.write(f"SET: {num_requests} operations completed in {duration:.2f} seconds\n")
            sys.stderr.write(f"SET: {ops_per_second:.2f} operations per second\n")
        
        # Save result to file
        self.kv_store.save_benchmark_result(result)
        
        # Print result as JSON for API consumption
        print(json.dumps(result))
        
        return result
    
    def benchmark_get(self, num_requests=10000, cached_ratio="0:1", storage_type="redis", name=None, quiet=False):
        """Benchmark GET operations on existing keys"""
        if not quiet:
            sys.stderr.write(f"Benchmarking GET operations with {num_requests} requests\n")
        keys = [f"benchmark:set:{i}" for i in range(num_requests)]
        
        start_time = time.time()
        
        for key in keys:
            self.get_value(key)
        
        end_time = time.time()
        duration = end_time - start_time
        ops_per_second = num_requests / duration
        
        result = {
            "id": f"run-{uuid.uuid4().hex[:8]}",
            "name": name or f"{storage_type.upper()} GET Benchmark",
            "type": "get",
            "storage": storage_type,
            "requests": num_requests,
            "cachedRatio": cached_ratio,
            "duration": round(duration, 2),
            "opsPerSecond": round(ops_per_second, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        if not quiet:
            sys.stderr.write(f"GET: {num_requests} operations completed in {duration:.2f} seconds\n")
            sys.stderr.write(f"GET: {ops_per_second:.2f} operations per second\n")
        
        # Save result to file
        self.kv_store.save_benchmark_result(result)
        
        # Print result as JSON for API consumption
        print(json.dumps(result))
        
        return result
    
    def benchmark_mixed(self, num_requests=10000, data_size=3, set_get_ratio="1:1", cached_ratio="1:1", storage_type="redis", name=None, quiet=False):
        """Benchmark mixed SET and GET operations with cached/non-cached mix"""
        set_ratio, get_ratio = map(int, set_get_ratio.split(':'))
        total_ratio = set_ratio + get_ratio
        set_ops = int((set_ratio / total_ratio) * num_requests)
        get_ops = num_requests - set_ops
        
        cached_ratio_parts = list(map(int, cached_ratio.split(':')))
        cached_probability = cached_ratio_parts[0] / sum(cached_ratio_parts) if sum(cached_ratio_parts) > 0 else 0
        
        # For DB storage, always use uncached
        if storage_type == "db":
            cached_probability = 0
        
        if not quiet:
            sys.stderr.write(f"Benchmarking mixed operations with ratio {set_get_ratio} ({set_ops} SET, {get_ops} GET)\n")
            sys.stderr.write(f"Cached ratio: {cached_ratio} ({cached_probability*100:.1f}% cached)\n")
        
        keys = [f"benchmark:mixed:{i}" for i in range(num_requests)]
        
        # Pre-populate some keys for GET operations
        for i in range(min(get_ops, num_requests // 2)):
            key = f"benchmark:mixed:{i}"
            value = ''.join(random.choices(string.ascii_letters + string.digits, k=data_size))
            is_cached = random.random() < cached_probability
            self.set_value(key, value, is_cached)
        
        start_time = time.time()
        
        for i in range(num_requests):
            if i < set_ops:
                # Perform SET operation
                key = random.choice(keys)
                value = ''.join(random.choices(string.ascii_letters + string.digits, k=data_size))
                is_cached = random.random() < cached_probability
                self.set_value(key, value, is_cached)
            else:
                # Perform GET operation
                key = random.choice(keys)
                self.get_value(key)
        
        end_time = time.time()
        duration = end_time - start_time
        ops_per_second = num_requests / duration
        
        result = {
            "id": f"run-{uuid.uuid4().hex[:8]}",
            "name": name or f"{storage_type.upper()} Mixed Benchmark",
            "type": "mixed",
            "storage": storage_type,
            "requests": num_requests,
            "size": data_size,
            "ratio": set_get_ratio,
            "cachedRatio": cached_ratio,
            "duration": round(duration, 2),
            "opsPerSecond": round(ops_per_second, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        if not quiet:
            sys.stderr.write(f"MIXED: {num_requests} operations completed in {duration:.2f} seconds\n")
            sys.stderr.write(f"MIXED: {ops_per_second:.2f} operations per second\n")
        
        # Save result to file
        self.kv_store.save_benchmark_result(result)
        
        # Print result as JSON for API consumption
        print(json.dumps(result))
        
        return result

def main():
    parser = argparse.ArgumentParser(description='Key-Value CLI with file-based storage, caching, and benchmarking capabilities')
    parser.add_argument('--file', default='kv_store.json', help='JSON file for storage')
    parser.add_argument('--results', default='benchmark_results.json', help='JSON file for benchmark results')
    parser.add_argument('--quiet', action='store_true', help='Suppress verbose output')
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # SET command
    set_parser = subparsers.add_parser('set', help='Set a key-value pair')
    set_parser.add_argument('key', help='Key to set')
    set_parser.add_argument('value', help='Value to set')
    set_parser.add_argument('--cached', action='store_true', help='Mark the value as cached')
    
    # GET command
    get_parser = subparsers.add_parser('get', help='Get a value by key')
    get_parser.add_argument('key', help='Key to get')
    
    # GETSET command
    getset_parser = subparsers.add_parser('getset', help='Get old value and set new value')
    getset_parser.add_argument('key', help='Key to get and set')
    getset_parser.add_argument('value', help='New value to set')
    getset_parser.add_argument('--cached', action='store_true', help='Mark the value as cached')
    
    # CACHE command to update cache status
    cache_parser = subparsers.add_parser('cache', help='Update cache status for a key')
    cache_parser.add_argument('key', help='Key to update cache status')
    cache_parser.add_argument('--status', choices=['true', 'false'], default='true', 
                             help='Cache status (true/false)')
    
    # STATUS command to check cache status
    status_parser = subparsers.add_parser('status', help='Check cache status for a key')
    status_parser.add_argument('key', help='Key to check cache status')
    
    # RESULTS command to get all benchmark results
    results_parser = subparsers.add_parser('results', help='Get all benchmark results')
    results_parser.add_argument('--format', choices=['json', 'table'], default='json',
                              help='Output format')
    
    # Benchmark commands
    bench_parser = subparsers.add_parser('benchmark', help='Run benchmarks')
    bench_parser.add_argument('type', choices=['set', 'get', 'mixed'], help='Benchmark type')
    bench_parser.add_argument('--storage', choices=['redis', 'db'], default='redis',
                            help='Storage type (redis for cached, db for uncached)')
    bench_parser.add_argument('--requests', type=int, default=1000, help='Number of requests')
    bench_parser.add_argument('--size', type=int, default=3, help='Data size in bytes')
    bench_parser.add_argument('--ratio', default='1:1', help='SET:GET ratio for mixed benchmark')
    bench_parser.add_argument('--cached-ratio', default='1:1', 
                             help='Cached:Non-cached ratio for values')
    bench_parser.add_argument('--name', help='Name for this benchmark run')
    
    args = parser.parse_args()
    
    redis_cli = RedisCLI(args.file, args.results)
    
    if args.command == 'set':
        result = redis_cli.set_value(args.key, args.value, args.cached)
        cache_status = "cached" if args.cached else "not cached"
        if not args.quiet:
            sys.stderr.write(f"SET {args.key}: {result} ({cache_status})\n")
    
    elif args.command == 'get':
        result = redis_cli.get_value(args.key)
        if not args.quiet:
            sys.stderr.write(f"GET {args.key}: {result}\n")
    
    elif args.command == 'getset':
        result = redis_cli.getset_value(args.key, args.value, args.cached)
        cache_status = "cached" if args.cached else "not cached"
        if not args.quiet:
            sys.stderr.write(f"GETSET {args.key}: old value = {result}, new value = {args.value} ({cache_status})\n")
    
    elif args.command == 'cache':
        status = args.status.lower() == 'true'
        result = redis_cli.set_cached_status(args.key, status)
        if result:
            if not args.quiet:
                sys.stderr.write(f"Cache status for {args.key} set to {status}\n")
        else:
            if not args.quiet:
                sys.stderr.write(f"Key {args.key} not found\n")
    
    elif args.command == 'status':
        status = redis_cli.get_cached_status(args.key)
        if status is not None:
            if not args.quiet:
                sys.stderr.write(f"Cache status for {args.key}: {'cached' if status else 'not cached'}\n")
        else:
            if not args.quiet:
                sys.stderr.write(f"Key {args.key} not found\n")
    
    elif args.command == 'results':
        results = redis_cli.get_benchmark_results()
        if args.format == 'json':
            print(json.dumps(results, indent=2))
        else:
            # Print as table
            if not results:
                sys.stderr.write("No benchmark results found.\n")
            else:
                sys.stderr.write(f"{'ID':<12} {'Name':<25} {'Type':<8} {'Storage':<8} {'Ops/Sec':<10} {'Duration':<10} {'Date':<20}\n")
                sys.stderr.write("-" * 100 + "\n")
                for r in results:
                    sys.stderr.write(f"{r.get('id', 'N/A'):<12} {r.get('name', 'N/A')[:25]:<25} {r.get('type', 'N/A'):<8} {r.get('storage', 'N/A'):<8} {r.get('opsPerSecond', 0):<10.2f} {r.get('duration', 0):<10.2f} {r.get('timestamp', 'N/A')[:19]:<20}\n")
    
    elif args.command == 'benchmark':
        if not args.quiet:
            sys.stderr.write(f"Starting benchmark at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        if args.type == 'set':
            redis_cli.benchmark_set(
                args.requests, 
                args.size, 
                args.cached_ratio, 
                args.storage,
                args.name,
                args.quiet
            )
        
        elif args.type == 'get':
            # Populate keys first
            if not args.quiet:
                sys.stderr.write("Pre-populating keys for GET benchmark...\n")
            redis_cli.benchmark_set(
                args.requests, 
                args.size, 
                args.cached_ratio, 
                args.storage,
                None,  # No name for pre-population
                True   # Quiet mode for pre-population
            )
            
            # Run GET benchmark
            redis_cli.benchmark_get(
                args.requests,
                args.cached_ratio,
                args.storage,
                args.name,
                args.quiet
            )
        
        elif args.type == 'mixed':
            redis_cli.benchmark_mixed(
                args.requests, 
                args.size, 
                args.ratio, 
                args.cached_ratio,
                args.storage,
                args.name,
                args.quiet
            )
        
        if not args.quiet:
            sys.stderr.write(f"Benchmark completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

if __name__ == "__main__":
    main()