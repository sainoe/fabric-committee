#!/usr/bin/env bash

set -e
set -x

# If chaincode source change do:
docker restart cli

docker exec cli peer chaincode install -n committee -v 1.4 -p "github.com/committee-contract"

docker exec cli peer chaincode upgrade -n committee -v 1.4 -o orderer.example.com:7050 -C mychannel -c '{"Args":["init"]}'


