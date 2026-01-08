#! /bin/bash

(
	cd ../../

	for i in {1..30}
	do
		./deploy_netes.sh
		sleep 10
		kubectl get events --namespace=openfaas-fn -o json > ./sample-hello-retail/benchmarks/outputs/deploy_kube_events_${i}.json
		./teardown_netes.sh
		sleep 30
	done
)
