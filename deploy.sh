#!/bin/bash
echo "Remove zip file first";
rm -rf alexa.zip
echo "Create zip file first";
zip -r alexa.zip index.js functions.js node_modules/ areas/ apl/
echo "alexa.zip created";
echo "Attempting to deploy project in lamda function";
sudo aws lambda update-function-code \
--function-name myPanther \
--zip-file fileb://alexa.zip
echo "Deploy done to lamda function";
