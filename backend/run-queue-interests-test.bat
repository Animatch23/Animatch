@echo off
cd /d "%~dp0"
npm test -- queueControllerInterests.test.js
