#! /bin/bash

docker image ls --format '{{.Repository}}/{{.Tag}} {{.Size}}' | grep 'product'
