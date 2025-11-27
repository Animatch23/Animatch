@echo off
cd /d "%~dp0"
echo Running Full Integration Tests...
echo.
npm test -- fullIntegration.test.js
