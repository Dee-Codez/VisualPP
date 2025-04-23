import json
import os
import time
import argparse
import random
import string
from datetime import datetime

class FileBackedKeyValueStore:
    def __init__(self, filename='kv_store.json'):
        self.filename = filename
        self.store = {}  # Main storage
        self.cache = {}  # Cache storage
        self.load_from_file()

    def load_from_file(self):
        if os.path.exists(self.filename):
            with open(self.filename, 'r') as f:
                data = json.load(f)
                # Convert the flat structure to our internal format
                for key, item in data.items():
                    if isinstance(item, dict) and 'value' in item and 'cached' in item:
                        self.store[key] = item
                    else:
                        # Handle legacy data format
                        self.store[key] = {'value': item, 'cached': False}

    def save_to_file(self):
        with open(self.filename, 'w') as f:
            json.dump(self.store, f)

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
            print(f"Data for key '{key}' is not cached. Retrieving from storage...")
            # Simulate a delay for non-cached items (between 0.5 and 2 seconds)
            delay = random.uniform(0.5, 2.0)
            time.sleep(delay)
            print(f"Retrieved after {delay:.2f} seconds.")
        else:
            print(f"Data for key '{key}' is cached. Instant retrieval.")
            
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
    def __init__(self, filename='kv_store.json'):
        self.kv_store = FileBackedKeyValueStore(filename)
    
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
    
    def benchmark_set(self, num_requests=10000, data_size=3, cached_ratio="0:1"):
        """Benchmark SET operations with a mix of cached and non-cached values"""
        print(f"Benchmarking SET operations with {num_requests} requests and {data_size} bytes payload")
        
        cached_ratio_parts = list(map(int, cached_ratio.split(':')))
        cached_probability = cached_ratio_parts[0] / sum(cached_ratio_parts)
        
        start_time = time.time()
        
        for i in range(num_requests):
            key = f"benchmark:set:{i}"
            value = ''.join(random.choices(string.ascii_letters + string.digits, k=data_size))
            is_cached = random.random() < cached_probability
            self.set_value(key, value, is_cached)
        
        end_time = time.time()
        duration = end_time - start_time
        ops_per_second = num_requests / duration
        
        print(f"SET: {num_requests} operations completed in {duration:.2f} seconds")
        print(f"SET: {ops_per_second:.2f} operations per second")
        return ops_per_second
    
    def benchmark_get(self, num_requests=10000):
        """Benchmark GET operations on existing keys"""
        print(f"Benchmarking GET operations with {num_requests} requests")
        keys = [f"benchmark:set:{i}" for i in range(num_requests)]
        
        start_time = time.time()
        
        for key in keys:
            self.get_value(key)
        
        end_time = time.time()
        duration = end_time - start_time
        ops_per_second = num_requests / duration
        
        print(f"GET: {num_requests} operations completed in {duration:.2f} seconds")
        print(f"GET: {ops_per_second:.2f} operations per second")
        return ops_per_second
    
    def benchmark_mixed(self, num_requests=10000, data_size=3, set_get_ratio="1:1", cached_ratio="1:1"):
        """Benchmark mixed SET and GET operations with cached/non-cached mix"""
        set_ratio, get_ratio = map(int, set_get_ratio.split(':'))
        total_ratio = set_ratio + get_ratio
        set_ops = int((set_ratio / total_ratio) * num_requests)
        get_ops = num_requests - set_ops
        
        cached_ratio_parts = list(map(int, cached_ratio.split(':')))
        cached_probability = cached_ratio_parts[0] / sum(cached_ratio_parts)
        
        print(f"Benchmarking mixed operations with ratio {set_get_ratio} ({set_ops} SET, {get_ops} GET)")
        print(f"Cached ratio: {cached_ratio} ({cached_probability*100:.1f}% cached)")
        
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
        
        print(f"MIXED: {num_requests} operations completed in {duration:.2f} seconds")
        print(f"MIXED: {ops_per_second:.2f} operations per second")
        return ops_per_second

def main():
    parser = argparse.ArgumentParser(description='Key-Value CLI with file-based storage, caching, and benchmarking capabilities')
    parser.add_argument('--file', default='kv_store.json', help='JSON file for storage')
    
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
    
    # Benchmark commands
    bench_parser = subparsers.add_parser('benchmark', help='Run benchmarks')
    bench_parser.add_argument('type', choices=['set', 'get', 'mixed'], help='Benchmark type')
    bench_parser.add_argument('--requests', type=int, default=10000, help='Number of requests')
    bench_parser.add_argument('--size', type=int, default=3, help='Data size in bytes')
    bench_parser.add_argument('--ratio', default='1:1', help='SET:GET ratio for mixed benchmark')
    bench_parser.add_argument('--cached-ratio', default='1:1', 
                             help='Cached:Non-cached ratio for values')
    
    args = parser.parse_args()
    
    redis_cli = RedisCLI(args.file)
    
    if args.command == 'set':
        result = redis_cli.set_value(args.key, args.value, args.cached)
        cache_status = "cached" if args.cached else "not cached"
        print(f"SET {args.key}: {result} ({cache_status})")
    
    elif args.command == 'get':
        result = redis_cli.get_value(args.key)
        print(f"GET {args.key}: {result}")
    
    elif args.command == 'getset':
        result = redis_cli.getset_value(args.key, args.value, args.cached)
        cache_status = "cached" if args.cached else "not cached"
        print(f"GETSET {args.key}: old value = {result}, new value = {args.value} ({cache_status})")
    
    elif args.command == 'cache':
        status = args.status.lower() == 'true'
        result = redis_cli.set_cached_status(args.key, status)
        if result:
            print(f"Cache status for {args.key} set to {status}")
        else:
            print(f"Key {args.key} not found")
    
    elif args.command == 'status':
        status = redis_cli.get_cached_status(args.key)
        if status is not None:
            print(f"Cache status for {args.key}: {'cached' if status else 'not cached'}")
        else:
            print(f"Key {args.key} not found")
    
    elif args.command == 'benchmark':
        print(f"Starting benchmark at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if args.type == 'set':
            redis_cli.benchmark_set(args.requests, args.size, args.cached_ratio)
        
        elif args.type == 'get':
            redis_cli.benchmark_set(args.requests, args.size, args.cached_ratio)  # Populate keys first
            redis_cli.benchmark_get(args.requests)
        
        elif args.type == 'mixed':
            redis_cli.benchmark_mixed(args.requests, args.size, args.ratio, args.cached_ratio)
        
        print(f"Benchmark completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
