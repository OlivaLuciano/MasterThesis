#! /bin/bash

services='product-catalog-api product-catalog-builder product-photos-assign product-photos-message product-photos-receive product-photos-record product-photos-report product-photos-success product-purchase-authenticate product-purchase-authorize-cc product-purchase-get-price product-purchase-publish product-photos product-purchase'

for service in $services
do
	multitime -n 30 -r 'sleep 30'  kubectl delete pod --selector=faas_function=${service} -n openfaas-fn
done
