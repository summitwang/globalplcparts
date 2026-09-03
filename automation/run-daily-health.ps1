# GPLP-AUTO-001 exit codes:
# 0 = HEALTHY or ATTENTION with a successful health check
# 1 = BLOCKED because the health check failed
# 2 = BLOCKED because a runner prerequisite failed
# 3 = BLOCKED because the health check timed out
# 4 = CRITICAL STOP because a detectable safety violation occurred

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$TaskId = "GPLP-AUTO-001"
$RepositoryPath = "C:\Projects\globalplcparts"
$ReportDirectory = "C:\GlobalPLCParts-Automation\reports"
$HealthCheckScript = Join-Path $RepositoryPath "scripts\health-check.js"
$PackageJson = Join-Path $RepositoryPath "package.json"
$TimeoutMilliseconds = 300000
$ExpectedPass = 16
$ExpectedWarn = 3
$ExpectedFail = 0

$StartTime = Get-Date
$EndTime = $StartTime
$RunnerExitCode = 2
$Status = "BLOCKED"
$HealthExitCode = "NOT RUN"
$StandardOutput = ""
$StandardError = ""
$ImportantFinding = "Runner prerequisites were not completed."
$ReportPath = $null

function Redact-SensitiveText {
    param([AllowEmptyString()][string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return $Text
    }

    $redacted = $Text
    $patterns = @(
        '(?i)\b(BEARER\s+)[A-Za-z0-9._~+/=-]{12,}',
        '(?i)\b((?:API[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|PASSWORD|SECRET|SERVICE[_-]?ROLE[_-]?KEY)\s*[:=]\s*)[^\s,;]+',
        '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
        '\b(?:sk|re)_[A-Za-z0-9_-]{12,}\b'
    )

    foreach ($pattern in $patterns) {
        $redacted = [regex]::Replace($redacted, $pattern, '$1[REDACTED]')
    }

    return $redacted
}

function Test-SensitiveOutput {
    param([AllowEmptyString()][string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return $false
    }

    $patterns = @(
        '(?i)\bBEARER\s+[A-Za-z0-9._~+/=-]{12,}',
        '(?i)\b(?:API[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|PASSWORD|SECRET|SERVICE[_-]?ROLE[_-]?KEY)\s*[:=]\s*[^\s,;]+',
        '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
        '\b(?:sk|re)_[A-Za-z0-9_-]{12,}\b'
    )

    foreach ($pattern in $patterns) {
        if ([regex]::IsMatch($Text, $pattern)) {
            return $true
        }
    }

    return $false
}

function Stop-HealthProcess {
    param([System.Diagnostics.Process]$Process)

    if ($Process.HasExited) {
        return
    }

    try {
        $Process.Kill($true)
    }
    catch [System.Management.Automation.MethodException] {
        $Process.Kill()
    }

    $Process.WaitForExit()
}

try {
    if (-not (Test-Path -LiteralPath $RepositoryPath -PathType Container)) {
        throw "Approved repository directory is missing."
    }

    if (-not (Test-Path -LiteralPath (Join-Path $RepositoryPath ".git"))) {
        throw "Approved directory is not a Git repository."
    }

    if (-not (Test-Path -LiteralPath $PackageJson -PathType Leaf)) {
        throw "package.json is missing."
    }

    if (-not (Test-Path -LiteralPath $HealthCheckScript -PathType Leaf)) {
        throw "scripts/health-check.js is missing."
    }

    $npmCommand = Get-Command "npm.cmd" -CommandType Application -ErrorAction Stop

    if (-not (Test-Path -LiteralPath $ReportDirectory -PathType Container)) {
        New-Item -ItemType Directory -Path $ReportDirectory -Force | Out-Null
    }

    $repositoryFullPath = [System.IO.Path]::GetFullPath($RepositoryPath).TrimEnd('\') + '\'
    $reportFullPath = [System.IO.Path]::GetFullPath($ReportDirectory).TrimEnd('\') + '\'
    if ($reportFullPath.StartsWith($repositoryFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $Status = "CRITICAL STOP"
        $RunnerExitCode = 4
        throw "Report directory resolves inside the repository."
    }

    $timestamp = $StartTime.ToString("yyyy-MM-dd-HHmmss")
    $ReportPath = Join-Path $ReportDirectory "$TaskId-$timestamp.txt"

    $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $npmCommand.Source
    $processInfo.Arguments = "run health-check"
    $processInfo.WorkingDirectory = $RepositoryPath
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $processInfo

    if (-not $process.Start()) {
        throw "Failed to start the approved health-check command."
    }

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $completed = $process.WaitForExit($TimeoutMilliseconds)

    if (-not $completed) {
        Stop-HealthProcess -Process $process
        $StandardOutput = $stdoutTask.GetAwaiter().GetResult()
        $StandardError = $stderrTask.GetAwaiter().GetResult()
        $HealthExitCode = "TIMEOUT"
        $Status = "BLOCKED"
        $RunnerExitCode = 3
        $ImportantFinding = "TIMEOUT after 300 seconds; no retry was attempted."
    }
    else {
        $process.WaitForExit()
        $StandardOutput = $stdoutTask.GetAwaiter().GetResult()
        $StandardError = $stderrTask.GetAwaiter().GetResult()
        $HealthExitCode = $process.ExitCode

        $combinedOutput = $StandardOutput + [Environment]::NewLine + $StandardError
        if (Test-SensitiveOutput -Text $combinedOutput) {
            $Status = "CRITICAL STOP"
            $RunnerExitCode = 4
            $ImportantFinding = "Secret-like output was detected and redacted before report persistence."
        }
        elseif ($process.ExitCode -ne 0) {
            $Status = "BLOCKED"
            $RunnerExitCode = 1
            $ImportantFinding = "Health-check returned a non-zero exit code."
        }
        else {
            $summaryPattern = 'Summary:\s*(\d+) PASS,\s*(\d+) WARN,\s*(\d+) FAIL'
            $summaryMatch = [regex]::Match($combinedOutput, $summaryPattern)

            if (-not $summaryMatch.Success) {
                $Status = "ATTENTION"
                $RunnerExitCode = 0
                $ImportantFinding = "Health-check succeeded, but its PASS/WARN/FAIL summary could not be parsed."
            }
            else {
                $passCount = [int]$summaryMatch.Groups[1].Value
                $warnCount = [int]$summaryMatch.Groups[2].Value
                $failCount = [int]$summaryMatch.Groups[3].Value

                if ($failCount -gt 0) {
                    $Status = "BLOCKED"
                    $RunnerExitCode = 1
                    $ImportantFinding = "Health-check reported one or more FAIL results."
                }
                elseif ($passCount -eq $ExpectedPass -and $warnCount -eq $ExpectedWarn -and $failCount -eq $ExpectedFail) {
                    $Status = "HEALTHY"
                    $RunnerExitCode = 0
                    $ImportantFinding = "Health-check matches the approved 16 PASS / 3 WARN / 0 FAIL baseline."
                }
                else {
                    $Status = "ATTENTION"
                    $RunnerExitCode = 0
                    $ImportantFinding = "Health-check succeeded, but its summary differs from the approved baseline."
                }
            }
        }
    }
}
catch {
    if ($Status -ne "CRITICAL STOP") {
        $Status = "BLOCKED"
        $RunnerExitCode = 2
    }
    $ImportantFinding = $_.Exception.Message
    $StandardError = $ImportantFinding
}
finally {
    $EndTime = Get-Date
    $duration = $EndTime - $StartTime

    if ($null -eq $ReportPath -and (Test-Path -LiteralPath $ReportDirectory -PathType Container)) {
        $timestamp = $StartTime.ToString("yyyy-MM-dd-HHmmss")
        $ReportPath = Join-Path $ReportDirectory "$TaskId-$timestamp.txt"
    }

    if ($null -ne $ReportPath) {
        $safeStdout = Redact-SensitiveText -Text $StandardOutput
        $safeStderr = Redact-SensitiveText -Text $StandardError
        $safeFinding = Redact-SensitiveText -Text $ImportantFinding
        $durationText = "{0:N3} seconds" -f $duration.TotalSeconds

        $report = @"
GlobalPLCParts Daily Health

Task ID: $TaskId
Start: $($StartTime.ToString("yyyy-MM-dd HH:mm:ss zzz"))
End: $($EndTime.ToString("yyyy-MM-dd HH:mm:ss zzz"))
Duration: $durationText
Status: $Status

Command:
npm.cmd run health-check

Exit Code: $HealthExitCode

Important Findings:
$safeFinding

Health Check Output:
[stdout]
$safeStdout
[stderr]
$safeStderr

Automatic Repairs:
NONE

Production Changes:
NONE

External Side Effects:
NONE
"@

        [System.IO.File]::WriteAllText($ReportPath, $report, [System.Text.UTF8Encoding]::new($false))
    }
}

Write-Output "Task ID: $TaskId"
Write-Output "Status: $Status"
Write-Output "Health-check exit code: $HealthExitCode"
if ($null -ne $ReportPath) {
    Write-Output "Report: $ReportPath"
}

exit $RunnerExitCode
