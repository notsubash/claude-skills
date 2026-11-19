# PowerShell shim: add this repo's bin\ to PATH, then run `skills ...`
node (Join-Path $PSScriptRoot '..\cli\skills.mjs') @args
exit $LASTEXITCODE
