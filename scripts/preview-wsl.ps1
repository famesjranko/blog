param(
    [Parameter(Mandatory = $true)]
    [int]$Port
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$adminRole = [Security.Principal.WindowsBuiltInRole]::Administrator

if (-not $principal.IsInRole($adminRole)) {
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Port $Port"
    Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList $arguments
    exit $LASTEXITCODE
}

$wslIp = (wsl.exe hostname -I).Trim().Split()[0]
if ([string]::IsNullOrWhiteSpace($wslIp)) {
    throw "Unable to determine the WSL IP address."
}

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port | Out-Null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$Port connectaddress=$wslIp connectport=$Port

$ruleName = "Blog WSL Preview"
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($null -ne $rule) {
    Remove-NetFirewallRule -DisplayName $ruleName
}
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Any | Out-Null

Write-Host "Forwarded Windows port $Port to WSL $wslIp."
