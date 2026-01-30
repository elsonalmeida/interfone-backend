#!/bin/bash
apt-get update
apt-get install -y wget unzip
wget https://storage.googleapis.com/chrome-for-testing-public/144.0.7559.0/linux64/chrome-linux64.zip
unzip chrome-linux64.zip
mv chrome-linux64 chrome
chmod +x chrome/chrome
