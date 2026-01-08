#! /bin/bash

services='init authenticate product-catalog-api product-catalog-builder product-photos-register product-photos-assign product-photos-message product-photos-receive product-photos-record product-photos-report product-photos-success product-purchase-authenticate product-purchase-authorize-cc product-purchase-get-price product-purchase-publish product-photos product-purchase'

for service in $services
do
	tag="localhost:5001/${service}:latest"
	echo Building $tag
	(cd $service && docker build -t $tag . && docker push $tag)
done
