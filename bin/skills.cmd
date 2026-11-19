@echo off
rem cmd.exe / PowerShell shim: add this repo's bin\ to PATH, then run `skills ...`
node "%~dp0..\cli\skills.mjs" %*
