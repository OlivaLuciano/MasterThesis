#! /usr/bin/env python3

import os
import json
import requests


REQUEST_BODY_BASE = 'requests/'
REQUEST_URI_BASE = 'http://127.0.0.1:31112/function'

TRIALS = 1000

FUNCTIONS = [
    ('product-catalog-builder', 'product'),
    ('product-catalog-api', 'products'),
    ('product-purchase', '')
]


def _measure_latency(function, path=''):
    body = {}
    with open(os.path.join(REQUEST_BODY_BASE, f'{function}.json')) as body_file:
        body = json.load(body_file)
    headers = {
        'Authorization': 'admin',
        'Content-Type': 'application/json'
    }
    response = requests.post(f'{REQUEST_URI_BASE}/{function}/{path}', headers=headers, json=body)
    # print('RESPONSE:', response.json())
    return response.elapsed.total_seconds()

def measure_latency(function, path='', trials=TRIALS):
    latency = 0.0
    for i in range(0, trials):
        latency += _measure_latency(function, path)
    return latency / trials


def main():
    for (function, path) in FUNCTIONS:
        latency = measure_latency(function, path)
        print('FUNCTION:', function, 'LATENCY (seconds):', latency)


if __name__ == '__main__':
    main()
