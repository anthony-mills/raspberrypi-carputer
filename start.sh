#/bin/bash

# Start websockify and the inbuilt PHP server
websockify/run 8800 localhost:6600 &
cd www
php -S localhost:8000 