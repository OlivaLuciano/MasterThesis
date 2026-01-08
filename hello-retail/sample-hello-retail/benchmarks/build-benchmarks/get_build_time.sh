#! /bin/bash

services='product-catalog-api product-catalog-builder product-photos-assign product-photos-message product-photos-receive product-photos-record product-photos-report product-photos-success product-purchase-authenticate product-purchase-authorize-cc product-purchase-get-price product-purchase-publish product-photos product-purchase'

for service in $services
do
	tag="${service}:latest"
	echo Building $tag
	(cd ../$service && multitime -n 30 docker build --no-cache -t $tag . > /dev/null)
	printf '\n'
done
