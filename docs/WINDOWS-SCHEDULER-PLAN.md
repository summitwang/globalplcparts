# GPLP-AUTO-001 Windows Scheduler Implementation Plan

## Status and approval boundary

This document is a plan for Task 10B-2. It does not register, enable, run, test, or remove a scheduled task.

The repository remains in supervised mode. Creating the task, triggering it manually, changing its definition, or removing it requires explicit approval for that exact operation. `AGENTS.md` and the production guardrails, test/preview strategy, scripts registry, autonomous workflow, and daily-health contract remain authoritative.

## 1. Exact task identity

| Field | Proposed value |
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

| Action field | Proposed value |
|---|---|
| Execute | `powershell.exe` |
| Working directory | `C:\Projects\globalplcparts` |
| Arguments | `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Projects\globalplcparts\automation\run-daily-health.ps1"` |

The arguments are fixed. The task accepts no user-supplied command, path, or argument. The PowerShell process invokes only the approved runner, and the runner is separately constrained to `npm.cmd run health-check`.

`ExecutionPolicy Bypass` applies only to this PowerShell process. It does not alter machine or user execution-policy configuration.

## 3. Account and security context

Proposed principal:

- Use the current dedicated Windows user resolved at implementation time from `WindowsIdentity.GetCurrent().Name`.
- Logon type: `Password` — run whether that user is logged on or not.
- Run level: `Limited`.
- Do not use `SYSTEM`, a service account, or highest privileges.
- Windows Task Scheduler may require the dedicated user's credential during registration. The user must enter it directly into the interactive Windows credential prompt used in Task 10B-2.
- Do not embed GitHub, Supabase, Resend, Vercel, Cloudflare, email, network, or other credentials.
- Do not grant filesystem rights or configure network credentials.

This logon model permits the task to run while the dedicated user is logged out or the machine is at the login screen. Windows manages the configured task credential; the password must never be placed in the repository, written into PowerShell source, added to documentation, printed in logs, included in command arguments, or pasted into Codex. Task 10B-2 must not request the password through chat or a non-Windows prompt. If the interactive Windows credential step is unavailable or registration cannot proceed without exposing the credential, stop and use a separately reviewed Windows-native registration method.

The registration API may transiently require a plaintext representation of the interactively entered password in process memory. It must be passed directly to `Register-ScheduledTask`, never printed or persisted, and its variables must be cleared in a `finally` block. This unavoidable registration-time handling does not authorize Codex to receive, inspect, or store the credential.

The task itself does not need administrator privileges and must run with limited rights. Registering a root-folder scheduled task should first be attempted from a normal interactive PowerShell session controlled by the user. If Windows denies registration, stop and request specific approval before using an elevated session; elevation for registration must not change the task principal or run level.

## 4. Scheduler settings

| Setting | Proposed configuration | Reason |
|---|---|---|
| Enabled | Yes, only after Task 10B-2 approval | Registration is the enablement action |
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
| PC hibernating at 3:00 AM | Wake behavior depends on Windows and hardware support and must be verified during Task 10B-2 implementation/testing. |
| PC powered off at 3:00 AM | The task cannot run at 3:00 AM. After boot, `StartWhenAvailable` may permit one missed execution. |
| Windows restarts | A running instance ends with the restart. No failure retry is configured. `StartWhenAvailable` may permit one missed execution after Windows becomes available again. |
| Network unavailable | No network condition blocks the task. The local runner and health-check should operate normally because external access is prohibited. |
| Repository path missing | The runner classifies the missing prerequisite as BLOCKED and exits with its prerequisite failure code; it performs no repair. |
| `npm.cmd` unavailable | The runner classifies the missing prerequisite as BLOCKED and performs no installation or repair. |
| Previous execution still running | `IgnoreNew` prevents a second scheduler instance. The existing instance remains subject to both runner and scheduler five-minute limits. |

`StartWhenAvailable` remains enabled so Windows may run one missed task after the machine becomes available. The scheduler plan enables the task's wake request but must not modify Windows power plans, enable wake timers globally, or change battery, sign-in, or other system settings. If Windows power policy blocks wake timers, Task 10B-2 must report that as an implementation blocker rather than changing the policy automatically.

## 6. Preferred implementation method

Use the PowerShell `ScheduledTasks` cmdlets with an interactive Windows credential-entry step. They provide structured, reviewable objects for the action, trigger, principal, and settings and are easier to inspect deterministically than GUI-only configuration. Microsoft documents `ExecutionTimeLimit`, `MultipleInstances`, `StartWhenAvailable`, and `WakeToRun` as task settings, and documents `Password` and `Limited` as principal choices.

The GUI may be used afterward for visual inspection, not as the primary creation method. `schtasks.exe` is not preferred because expressing and auditing the full settings/principal policy is less direct.

## 7. Exact proposed Task 10B-2 creation code

The following code is proposed for a separately approved Task 10B-2. **Do not execute it during planning.**

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "GlobalPLCParts-Daily-Health"
$taskPath = "\"
$repositoryPath = "C:\Projects\globalplcparts"
$runnerPath = "C:\Projects\globalplcparts\automation\run-daily-health.ps1"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

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
    -UserId $currentUser `
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
    -UserName $currentUser `
    -Message "Enter the dedicated Windows user's credential directly into this Windows prompt."

if ($credential.UserName -ne $currentUser) {
    throw "Credential user does not match the approved dedicated Windows user."
}

$registrationPassword = $null
try {
    $registrationPassword = $credential.GetNetworkCredential().Password

    Register-ScheduledTask `
        -TaskName $taskName `
        -TaskPath $taskPath `
        -InputObject $definition `
        -User $currentUser `
        -Password $registrationPassword
}
finally {
    $registrationPassword = $null
    $credential = $null
}
```

The credential prompt must be completed locally by the user during Task 10B-2. The password value must not be sent to Codex, copied into the command, saved in a script, written to a transcript, or echoed. PowerShell transcript/log capture must not be enabled for the registration session unless it is proven to redact credential material safely.

No restart count or restart interval is supplied. `WakeToRun` is enabled. `AllowStartIfOnBatteries` and `DontStopIfGoingOnBatteries` remain intentionally absent, leaving those battery capabilities disabled under the proposed policy.

## 8. Task 10B-2 verification procedure

Task 10B-2 should stop immediately if registration fails or the registered definition differs from this plan.

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

11. Inspect only approved report fields and confirm HEALTHY, runner exit code 0, and approximately 15 PASS / 4 WARN / 0 FAIL. Treat changed counts according to the contract instead of inventing a result.

12. As a separate controlled verification, log out or use the Windows login screen and confirm the exact task can run under the configured dedicated user credential without enabling highest privileges. This test must not expose or re-request the password through Codex.

13. Run read-only Git status and confirm the repository remains clean. Do not clean unexpected changes.

14. Confirm no Supabase, Resend, production, customer, RFQ, business-data, high-risk-script, Git publication, or deployment side effect occurred.

The manual test is a separately approval-gated action. Registration approval alone does not authorize starting it.

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
- Hibernation wake behavior must be verified during Task 10B-2.
- A powered-off PC cannot run the task at 3:00 AM; `StartWhenAvailable` provides only a later opportunity.
- The scheduler does not repair a missing repository, runner, Node installation, npm resolution, or health failure.
- Zero retries means transient local failures remain visible for human review.
- The five-minute scheduler limit may terminate the runner at approximately the same boundary as its internal timeout; the external report may be incomplete if Task Scheduler terminates first.
- Task Scheduler history must be enabled separately if detailed Windows event history is desired; this plan does not change that system setting.
- `ExecutionPolicy Bypass` does not authenticate the script. Repository integrity and change control remain essential.
- Registration permissions vary by Windows policy. A denied non-elevated registration is a stop condition, not permission to elevate automatically.

## 11. Task 10B-2 approval checklist

Before implementation, explicitly approve:

- [ ] Exact task name and root task path
- [ ] Daily 3:00 AM Windows local trigger
- [ ] `Pacific Standard Time` timezone verification
- [ ] Current dedicated user account
- [ ] Password logon model and `Limited` run level
- [ ] User-entered Windows credential prompt and no credential disclosure to Codex
- [ ] Logged-out execution verification
- [ ] Principal is the dedicated Windows user and not `SYSTEM`
- [ ] Highest privileges remain disabled unless separately approved
- [ ] No plaintext credential in repository, scripts, documentation, arguments, or logs
- [ ] `WakeToRun` enabled without changing Windows power plans or global wake-timer policy
- [ ] Start-when-available behavior
- [ ] AC/battery behavior
- [ ] Five-minute execution limit
- [ ] `IgnoreNew` multiple-instance policy
- [ ] Zero restart/retry policy
- [ ] Exact fixed PowerShell action and arguments
- [ ] ScheduledTasks cmdlet implementation method
- [ ] Whether registration may be attempted non-elevated
- [ ] Separate authorization for one manual scheduler test
- [ ] Exact rollback procedure

Until these are approved, **NO scheduled task may be created or run**.

## References

- Microsoft Learn: `New-ScheduledTaskSettingsSet`
- Microsoft Learn: `New-ScheduledTaskPrincipal`
- Microsoft Learn: `Register-ScheduledTask`
- Microsoft Learn: `Unregister-ScheduledTask`
