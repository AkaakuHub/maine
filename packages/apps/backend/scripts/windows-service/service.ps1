[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)]
	[ValidateSet("install", "configure", "start", "stop", "restart", "status", "uninstall")]
	[string]$Action,

	[ValidateSet("error", "warn", "info", "debug", "trace")]
	[string]$LogLevel = "error"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$serviceId = "MaineBackend"
$serviceName = "Maine Backend"
$serviceDescription = "Maine backend API server"
$winswVersion = "v2.12.0"
$winswDownloadUrl = "https://github.com/winsw/winsw/releases/download/$winswVersion/WinSW-x64.exe"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = (Resolve-Path (Join-Path $scriptDirectory "../..")).Path
$runtimeDirectory = Join-Path $backendRoot "service-runtime"
$serviceExecutable = Join-Path $runtimeDirectory "$serviceId.exe"
$serviceConfig = Join-Path $runtimeDirectory "$serviceId.xml"
$logDirectory = Join-Path $runtimeDirectory "logs"
$entryPoint = Join-Path $backendRoot "dist/main.js"

function Assert-Windows {
	if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
		throw "Windows service operations can only run on Windows."
	}
}

function Assert-Administrator {
	$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
	$principal = [Security.Principal.WindowsPrincipal]::new($identity)
	if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
		throw "Run this command from an elevated PowerShell session."
	}
}

function Escape-XmlValue([string]$Value) {
	return [Security.SecurityElement]::Escape($Value)
}

function Invoke-BackendBuild {
	Push-Location $backendRoot
	try {
		& pnpm build
		if ($LASTEXITCODE -ne 0) {
			throw "Backend build failed."
		}
	}
	finally {
		Pop-Location
	}
}

function New-ServiceRuntime {
	New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
	New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

	if (-not (Test-Path $serviceExecutable)) {
		Invoke-WebRequest -Uri $winswDownloadUrl -OutFile $serviceExecutable
	}
}

function Write-ServiceConfig {
	$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
	if (-not (Test-Path $entryPoint)) {
		throw "Service entry point does not exist: $entryPoint"
	}

	$escapedServiceId = Escape-XmlValue $serviceId
	$escapedServiceName = Escape-XmlValue $serviceName
	$escapedServiceDescription = Escape-XmlValue $serviceDescription
	$escapedNodeExecutable = Escape-XmlValue $nodeExecutable
	$escapedEntryPoint = Escape-XmlValue $entryPoint
	$escapedBackendRoot = Escape-XmlValue $backendRoot
	$escapedLogDirectory = Escape-XmlValue $logDirectory
	$escapedLogLevel = Escape-XmlValue $LogLevel

	$config = @"
<service>
  <id>$escapedServiceId</id>
  <name>$escapedServiceName</name>
  <description>$escapedServiceDescription</description>
  <executable>$escapedNodeExecutable</executable>
  <arguments>&quot;$escapedEntryPoint&quot;</arguments>
  <workingdirectory>$escapedBackendRoot</workingdirectory>
  <env name="NODE_ENV" value="production" />
  <env name="MAINE_BACKEND_LOG_LEVEL" value="$escapedLogLevel" />
  <logpath>$escapedLogDirectory</logpath>
  <log mode="roll" />
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="10 sec" />
  <stoptimeout>30 sec</stoptimeout>
</service>
"@

	Set-Content -Path $serviceConfig -Value $config -Encoding UTF8
}

function Invoke-WinSw([string]$Command) {
	if (-not (Test-Path $serviceExecutable)) {
		throw "WinSW executable does not exist. Run service:install first."
	}

	& $serviceExecutable $Command
	if ($LASTEXITCODE -ne 0) {
		throw "WinSW command failed: $Command"
	}
}

Assert-Windows
Assert-Administrator

switch ($Action) {
	"install" {
		Invoke-BackendBuild
		New-ServiceRuntime
		Write-ServiceConfig
		Invoke-WinSw "install"
		Invoke-WinSw "start"
	}
	"configure" {
		New-ServiceRuntime
		Write-ServiceConfig
		Invoke-WinSw "restart"
	}
	"start" {
		Invoke-WinSw "start"
	}
	"stop" {
		Invoke-WinSw "stop"
	}
	"restart" {
		Invoke-WinSw "restart"
	}
	"status" {
		Invoke-WinSw "status"
	}
	"uninstall" {
		Invoke-WinSw "stop"
		Invoke-WinSw "uninstall"
	}
}
