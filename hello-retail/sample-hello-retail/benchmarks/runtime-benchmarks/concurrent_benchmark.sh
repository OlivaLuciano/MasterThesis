#! /bin/bash

run_benchmark() {
	good=$(( 10 * $1 ))
	bad=$(( 10 * $2 ))
	echo -e "\n\nRunning benchamark for: good = $good, bad = $bad"

	pids=""

	ab -n $bad -c $bad -p requests/product-purchase.json -T 'application/json' -H 'Authorization: ' http://127.0.0.1:31112/function/product-purchase &
	pids="$pids $!"

	ab -n $good -c $good -p requests/product-purchase.json -T 'application/json' -H 'Authorization: admin' http://127.0.0.1:31112/function/product-purchase &
	pids="$pids $!"

	wait $pids

	pgrep ab | xargs kill &> /dev/null
}

for i in {1..9}; do
	run_benchmark $(( 10 - $i )) $(( $i ))
	sleep 10
done
