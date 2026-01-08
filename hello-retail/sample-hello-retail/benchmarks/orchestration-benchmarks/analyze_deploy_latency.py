#!/usr/bin/env python3

import argparse
import json
from datetime import datetime

def get_events_from_file(event_file_path):
    events = []
    with open(event_file_path, 'r') as event_file:
        events = json.load(event_file)['items']
    return events


def aggregate_events_by_pod(events):
    events_by_pod = {}
    for event in events:
        if event['involvedObject']['kind'] != 'Pod':
            continue
        if 'product-' not in event['involvedObject']['name']:
            continue
        if event['involvedObject']['name'] not in events_by_pod:
            events_by_pod[event['involvedObject']['name']] = []
        events_by_pod[event['involvedObject']['name']].append(event)
    return events_by_pod


def get_function_name(pod):
    return '-'.join(pod.split('-')[:-2])


def analyze_file(event_file_path):
    startup_times = {}

    events = get_events_from_file(event_file_path)
    events_by_pod = aggregate_events_by_pod(events)
    for pod in events_by_pod:
        scheduled_time = None
        start_time = None
        for event in events_by_pod[pod]:
            if event['reason'] == 'Scheduled':
                scheduled_time = datetime.strptime(event['metadata']['creationTimestamp'], '%Y-%m-%dT%H:%M:%SZ')
            elif event['reason'] == 'Started':
                start_time = datetime.strptime(event['metadata']['creationTimestamp'], '%Y-%m-%dT%H:%M:%SZ')
        startup_time = int((start_time - scheduled_time).total_seconds())
        function_name = get_function_name(pod)
        startup_times[function_name] = startup_time

    return startup_times


def average_startup_times(all_startup_times):
    avg_startup_times = {}

    for startup_times in all_startup_times:
        for function_name in startup_times:
            if function_name not in avg_startup_times:
                avg_startup_times[function_name] = 0
            avg_startup_times[function_name] += startup_times[function_name]
    
    for function_name in avg_startup_times:
        avg_startup_times[function_name] /= len(all_startup_times)

    return avg_startup_times


def main(event_file_prefix, count):
    all_startup_times = [analyze_file(f'{event_file_prefix}_{i}.json') for i in range(1, count + 1)]
    avg_startup_times = average_startup_times(all_startup_times)

    for function_name in avg_startup_times:
        print(f'{function_name}: {avg_startup_times[function_name]} seconds')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Analyze the kube events for deploy and teardown latency')
    parser.add_argument('--input-prefix', default='outputs/deploy_kube_events', help='The kube event input file prefix')
    parser.add_argument('--count', default=30, help='The number of files with the prefix')
    args = parser.parse_args()
    main(args.input_prefix, args.count)
