#!/bin/bash
# Expo start script that bypasses authentication
unset CI
cd /app/frontend
export EXPO_NO_TELEMETRY=1
export EXPO_NO_REDIRECT=1
yarn expo start --tunnel --port 3000
