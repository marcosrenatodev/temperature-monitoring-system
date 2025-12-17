#!/bin/bash

for i in {1..100}; do
  curl -s http://localhost:3000/health | jq '.timestamp'
  sleep 1
done
