import urllib.request
import json

url = 'https://essential-eats-api-demo.ruetzanita.workers.dev/api/grocery/parse'
data = {'rawText': 'test'}
req = urllib.request.Request(url, json.dumps(data).encode('utf-8'), {'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req) as f:
        print(f.status)
        print(f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
