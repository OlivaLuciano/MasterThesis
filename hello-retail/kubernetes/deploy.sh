#! /bin/bash
faas-cli ls || (echo "faas-cli missing or not logged in" && exit 1)
export OPENFAAS_URL=http://127.0.0.1:8080

echo 'deploying sql database'
kubectl apply -f ./mysql.yaml

echo 'waiting for mysql to come up...'
sleep 30

echo 'initializing up database'
kubectl run -i --rm --namespace=openfaas-fn --restart=Never --image=mysql:5.6 mysql-client -- mysql -h mysql -ppass -e "CREATE DATABASE IF NOT EXISTS helloRetail"
sleep 2

cd ../sample-hello-retail
sudo ./build.sh
cd ../kubernetes

echo 'deploying hello-retail'
faas-cli deploy -f ./hello-retail.yaml
sleep 5

echo 'waiting for hello-retail to come up...'
kubectl wait pod --all --for=condition=Ready --namespace=openfaas-fn

#echo 'testing hello-retail workflows'
#curl -XPOST $OPENFAAS_URL/function/product-catalog-builder/product -H 'Content-Type: application/json' -H 'Authorization: inventory-manager' --data '{"schema": "com.nordstrom/retail-stream/1-0-0", "origin": "hello-retail/product-producer-automation", "timeOrigin": "2017-01-12T18:29:25.171Z", "price: ": "123", "data": {"schema": "com.nordstrom/product/create/1-0-0", "id": "4579874", "brand": "POLO RALPH LAUREN", "name": "Polo Ralph Lauren 3-Pack Socks", "description": "PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874", "category": "Socks for Men", "price": "123"}}'
#curl -XPOST $OPENFAAS_URL/function/product-catalog-api/products -H 'Content-Type: application/json' --data '{"queryStringParameters":{"category": "Socks for Men"}}'
#curl -XPOST $OPENFAAS_URL/function/product-purchase -H 'Content-Type: application/json' -H 'Authorization: customer' --data '{"id":"4579874", "creditCard": "1234-5678-9", "user": "prabkumar"}'
