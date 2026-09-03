# GPLP-AUTO-001 Windows Scheduler Configuration Record

## Status and approval boundary

The Windows scheduled task `GlobalPLCParts-Daily-Health` has been registered, and manual Task Scheduler execution has been successfully verified. The latest verified result is HEALTHY with exit code 0 and 16 PASS / 3 WARN / 0 FAIL.

The repository remains in supervised mode. Any future manual run, definition change, disablement, removal, or other scheduler operation requires explicit approval for that exact action. `AGENTS.md` and the production guardrails, test/preview strategy, scripts registry, autonomous workflow, and daily-health contract remain authoritative. The next operational checkpoint is the first unattended scheduled execution.

## 1. Exact task identity

| Field | Registered value |
|---|---|
| Task name | `GlobalPLCParts-Daily-Health` |
| Task path | `\` (Task Scheduler root folder) |
| Contract task ID | `GPLP-AUTO-001` |
| Description | `GPLP-AUTO-001 — Daily read-only GlobalPLCParts repository health check.` |
| Trigger | Daily at 3:00 AM Windows local time |
| Windows timezone ID | `Pacific Standard Time` |
| Display timezone | Pacific Time (US & Canada) |
| Daylight saving time | Handled by Windows according to the configured system timezone |
| Repository | `C:\Projects\globalplcparts` |
| Runner | `C:\Projects\globalplcparts\automation\run-daily-health.ps1` |

The trigger uses Windows local time. It does not depend on the IANA identifier `America/Los_Angeles`.

## 2. Exact action

The task has exactly one action:

| Action field | Registered value |
|---|---|
| Execute | `powershell.exe` |
| Working directory | `C:\Projects\globalplcparts` |
| Arguments | `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Projects\globalplcparts\automation\run-daily-health.ps1"` |

The arguments are fixed. The task accepts no user-supplied command, path, or argument. The PowerShell process invokes only the approved runner, and the runner is separately constrained to `npm.cmd run health-check`.

`ExecutionPolicy Bypass` applies only to this PowerShell process. It does not alter machine or user execution-policy configuration.

## 3. Account and security context

Verified principal:

- Dedicated Windows account: `DESKTOP-EVEM1EN\GlobalPLCAuto`.
- Logon type: `Password` — run whether that user is logged on or not.
- Run level: `Limited`.
- Do not use `SYSTEM`, a service account, or highest privileges.
- Windows Task Scheduler credential handling remains internal to Windows. The credential must never be provided to Codex or recorded in repository content or logs.
- Do not embed GitHub, Supabase, Resend, Vercel, Cloudflare, email, network, or other credentials.
- Do not grant filesystem rights or configure network credentials.

This logon model permits the task to run while the dedicated user is logged out or the machine is at the login screen. Windows manages the configured task credential; the password must never be placed in the repository, written into PowerShell source, added to documentation, printed in logs, included in command arguments, or pasted into Codex. No future scheduler operation may request the password through chat or a non-Windows prompt.

The registration API may transiently require a plaintext representation of the interactively entered password in process memory. It must be passed directly to `Register-ScheduledTask`, never printed or persisted, and its variables must be cleared in a `finally` block. This unavoidable registration-time handling does not authorize Codex to receive, inspect, or store the credential.

The registered task runs with limited rights and highest privileges are not enabled. Any future change in privilege level requires separate approval.

## 4. Scheduler settings

| Setting | Registered configuration | Reason |
|---|---|---|
| Enabled | Yes | The task is registered and scheduled |
| Run whether user is logged on or not | Yes (`Password`) | Supports unattended execution using the dedicated user's Windows-managed task credential |
| Wake computer to run | Yes (`WakeToRun`) | Allows the scheduler to wake the dedicated computer from supported sleep states so the check can run near 3:00 AM |
| Start task if schedule is missed | Yes (`StartWhenAvailable`) | Permits one delayed run after sleep, shutdown, or restart |
| Start only on AC power | Yes | Conservative default for a dedicated computer |
| Stop if switching to battery | Yes | Prevents continued background work on battery |
| Run only if network available | No | The health check is local and must not require network access |
| Run only if idle | No | Avoids an indefinite idle-condition delay |
| Execution time limit | 5 minutes | Matches the approved 300-second contract maximum |
| Multiple instances | `IgnoreNew` | A new trigger is ignored while the prior instance runs |
| Restart on failure | Disabled | The contract permits zero automatic retries |
| Restart count | 0 / not configured | Prevents scheduler-added retries |
| Automatic retries | 0 | Matches the contract |
| Hard termination at limit | Allowed | Enables enforcement of the five-minute limit |

`StartWhenAvailable` is delayed execution, not a retry. It must not be paired with restart settings or overlapping catch-up runs.

## 5. PC availability behavior

| Condition | Expected behavior |
|---|---|
| Windows user logged in | The task runs normally under the configured dedicated user credential. |
| Windows user logged out / machine at login screen | The task may run under the configured dedicated user credential. |
| PC sleeping at 3:00 AM | The scheduler may wake the computer where Windows and hardware wake support permit. |
| PC hibernating at 3:00 AM | Wake behavior depends on Windows and hardware support and remains a separate operational verification. |
| PC powered off at 3:00 AM | The task cannot run at 3:00 AM. After boot, `StartWhenAvailable` may permit one missed execution. |
| Windows restarts | A running instance ends with the restart. No failure retry is configured. `StartWhenAvailable` may permit one missed execution after Windows becomes available again. |
| Network unavailable | No network condition blocks the task. The local runner and health-check should operate normally because external access is prohibited. |
| Repository path missing | The runner classifies the missing prerequisite as BLOCKED and exits with its prerequisite failure code; it performs no repair. |
| `npm.cmd` unavailable | The runner classifies the missing prerequisite as BLOCKED and performs no installation or repair. |
| Previous execution still running | `IgnoreNew` prevents a second scheduler instance. The existing instance remains subject to both runner and scheduler five-minute limits. |

`StartWhenAvailable` remains enabled so Windows may run one missed task after the machine becomes available. The registered task enables the wake request but must not modify Windows power plans, enable wake timers globally, or change battery, sign-in, or other system settings. If Windows power policy blocks wake timers, report the condition rather than changing policy automatically.

## 6. Preferred implementation method

Use the PowerShell `ScheduledTasks` cmdlets with an interactive Windows credential-entry step. They provide structured, reviewable objects for the action, trigger, principal, and settings and are easier to inspect deterministically than GUI-only configuration. Microsoft documents `ExecutionTimeLimit`, `MultipleInstances`, `StartWhenAvailable`, and `WakeToRun` as task settings, and documents `Password` and `Limited` as principal choices.

The GUI may be used afterward for visual inspection, not as the primary creation method. `schtasks.exe` is not preferred because expressing and auditing the full settings/principal policy is less direct.

## 7. Registration reference

The following code is retained as an auditable registration reference. **Do not re-run it against the existing registered task.**

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "GlobalPLCParts-Daily-Health"
$taskPath = "\"
$repositoryPath = "C:\Projects\globalplcparts"
$runnerPath = "C:\Projects\globalplcparts\automation\run-daily-health.ps1"
$taskUser = "DESKTOP-EVEM1EN\GlobalPLCAuto"

if ((Get-TimeZone).Id -ne "Pacific Standard Time") {
    throw "Windows timezone is not Pacific Standard Time."
}

if (-not (Test-Path -LiteralPath $repositoryPath -PathType Container)) {
    throw "Approved repository path is missing."
}

if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) {
    throw "Approved runner is missing."
}

if (Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue) {
    throw "The exact scheduled task already exists; refusing to overwrite it."
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Projects\globalplcparts\automation\run-daily-health.ps1"' `
    -WorkingDirectory $repositoryPath

$trigger = New-ScheduledTaskTrigger -Daily -At "3:00 AM"

$principal = New-ScheduledTaskPrincipal `
    -UserId $taskUser `
    -LogonType Password `
    -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -WakeToRun `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -MultipleInstances IgnoreNew

$definition = New-ScheduledTask `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "GPLP-AUTO-001 — Daily read-only GlobalPLCParts repository health check."

$credential = Get-Credential `
    -UserName $taskUser `
    -Message "Enter the dedicated Windows user's credential directly into this Windows prompt."

if ($credential.UserName -ne $taskUser) {
    throw "Credential user does not match the approved dedicated Windows user."
}

$registrationPassword = $null
try {
    $registrationPassword = $credential.GetNetworkCredential().Password

    Register-ScheduledTask `
        -TaskName $taskName `
        -TaskPath $taskPath `
        -InputObject $definition `
        -User $taskUser `
        -Password $registrationPassword
}
finally {
    $registrationPassword = $null
    $credential = $null
}
```

The reference shows the approved native credential boundary used for registration. The password value must never be sent to Codex, copied into a command, saved in a script, written to a transcript, or echoed.

No restart count or restart interval is supplied. `WakeToRun` is enabled. `AllowStartIfOnBatteries` and `DontStopIfGoingOnBatteries` remain intentionally absent, leaving those battery capabilities disabled under the registered policy.

## 8. Verification record and remaining procedure

Registration and one manual Task Scheduler execution have completed successfully. The steps below are retained as the verification procedure for future approved audits; they must not be repeated automatically.

1. Retrieve only the exact task:

   ```powershell
   $task = Get-ScheduledTask -TaskName "GlobalPLCParts-Daily-Health" -TaskPath "\" -ErrorAction Stop
   $info = Get-ScheduledTaskInfo -TaskName "GlobalPLCParts-Daily-Health" -TaskPath "\" -ErrorAction Stop
   ```

2. Verify identity and enablement:
   - `TaskName` equals `GlobalPLCParts-Daily-Health`.
   - `TaskPath` equals `\`.
   - State is not unexpectedly Running before the manual test.

3. Verify the trigger:
   - Exactly one trigger exists.
   - It is daily with a one-day interval.
   - Start boundary represents 3:00 AM Windows local time.
   - `(Get-TimeZone).Id` equals `Pacific Standard Time`.

4. Verify the action:
   - Exactly one action exists.
   - Execute equals `powershell.exe`.
   - Arguments exactly equal `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Projects\globalplcparts\automation\run-daily-health.ps1"`.
   - Working directory exactly equals `C:\Projects\globalplcparts`.

5. Verify least privilege:
   - Principal user equals the approved dedicated Windows user.
   - Logon type permits execution while the user is logged out.
   - Run level is `Limited`.
   - Principal is not `SYSTEM`.
   - Highest privilege is not enabled unless separately approved.
   - No plaintext credential exists in repository files, task scripts, documentation, action arguments, or logs.

6. Verify settings:
   - `ExecutionTimeLimit` equals five minutes.
   - `MultipleInstances` equals `IgnoreNew`.
   - `RestartCount` equals zero and no restart interval is configured.
   - `WakeToRun` is true.
   - `StartWhenAvailable` is true.
   - Battery settings match the plan.
   - If the wake test fails because Windows power policy or hardware does not permit it, record the blocker without changing any power setting or enabling wake timers globally.

7. Record the external report directory contents or latest report timestamp without reading sensitive content.

8. Trigger exactly one approved manual scheduler test:

   ```powershell
   Start-ScheduledTask -TaskName "GlobalPLCParts-Daily-Health" -TaskPath "\"
   ```

9. Wait only within an approved bounded observation period. Confirm the task reaches a non-running state and inspect `LastTaskResult`.

10. Confirm exactly one new report appears under `C:\GlobalPLCParts-Automation\reports\`, outside the repository.

11. Inspect only approved report fields and confirm HEALTHY, runner exit code 0, and approximately 16 PASS / 3 WARN / 0 FAIL. Treat changed counts according to the contract instead of inventing a result.

12. Review the first unattended scheduled execution and confirm the exact task ran under the configured dedicated user credential without enabling highest privileges. This review must not expose or re-request the password through Codex.

13. Run read-only Git status and confirm the repository remains clean. Do not clean unexpected changes.

14. Confirm no Supabase, Resend, production, customer, RFQ, business-data, high-risk-script, Git publication, or deployment side effect occurred.

The initial manual test is complete. Any additional manual test remains a separately approval-gated action.

## 9. Rollback plan

Rollback removes only the exact root task named `GlobalPLCParts-Daily-Health`. It does not delete the runner, reports, repository files, or any unrelated scheduled task.

First inspect and verify the exact target:

```powershell
$taskName = "GlobalPLCParts-Daily-Health"
$taskPath = "\"
$task = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop

if ($task.TaskName -ne $taskName -or $task.TaskPath -ne $taskPath) {
    throw "Scheduled-task identity mismatch; refusing rollback."
}
```

After separate rollback approval, remove only that verified task:

```powershell
Unregister-ScheduledTask `
    -TaskName "GlobalPLCParts-Daily-Health" `
    -TaskPath "\" `
    -Confirm:$false
```

Then verify absence without modifying anything else:

```powershell
$remaining = Get-ScheduledTask `
    -TaskName "GlobalPLCParts-Daily-Health" `
    -TaskPath "\" `
    -ErrorAction SilentlyContinue

if ($null -ne $remaining) {
    throw "Rollback verification failed: the exact task still exists."
}
```

If the exact identity cannot be verified, stop. Never use wildcards or bulk task removal.

## 10. Known limitations

- Windows may require the dedicated user's credential at registration so the task can run while that user is logged out.
- `WakeToRun` requests wake from supported sleep states, but actual wake behavior depends on Windows power policy and hardware support.
- Hibernation wake behavior remains a separate operational verification.
- A powered-off PC cannot run the task at 3:00 AM; `StartWhenAvailable` provides only a later opportunity.
- The scheduler does not repair a missing repository, runner, Node installation, npm resolution, or health failure.
- Zero retries means transient local failures remain visible for human review.
- The five-minute scheduler limit may terminate the runner at approximately the same boundary as its internal timeout; the external report may be incomplete if Task Scheduler terminates first.
- Task Scheduler history must be enabled separately if detailed Windows event history is desired; this plan does not change that system setting.
- `ExecutionPolicy Bypass` does not authenticate the script. Repository integrity and change control remain essential.
- Registration permissions vary by Windows policy. A denied non-elevated registration is a stop condition, not permission to elevate automatically.

## 11. Implemented status and ongoing controls

Verified implementation facts:

- Task name: `GlobalPLCParts-Daily-Health`.
- Principal: dedicated Windows account `GlobalPLCAuto`.
- Logon model: run whether the user is logged on or not.
- Highest privileges: disabled.
- Schedule: daily at 3:00 AM Windows local time under `Pacific Standard Time`.
- `WakeToRun`: enabled.
- Runner: `automation/run-daily-health.ps1` in `C:\Projects\globalplcparts`.
- Reports: `C:\GlobalPLCParts-Automation\reports`.
- Manual Task Scheduler execution: successfully verified.
- Latest result: HEALTHY, exit code 0, 16 PASS / 3 WARN / 0 FAIL.
- Git safety under `GlobalPLCAuto`: PASS with a clean working tree.
- Automatic Repairs, Production Changes, and External Side Effects: `NONE`.

The first unattended scheduled execution remains to be verified. All configuration changes, additional manual runs, rollback operations, and expansions of scope remain approval-gated.

## References

- Microsoft Learn: `New-ScheduledTaskSettingsSet`
- Microsoft Learn: `New-ScheduledTaskPrincipal`
- Microsoft Learn: `Register-ScheduledTask`
- Microsoft Learn: `Unregister-ScheduledTask`
