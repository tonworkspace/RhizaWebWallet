# PowerShell script to apply two-tier activation fixes to StoreUI.tsx

$file = "components/StoreUI.tsx"
$content = Get-Content $file -Raw

Write-Host "Applying two-tier activation fixes to StoreUI.tsx..." -ForegroundColor Cyan

# Fix #1: Update activation condition from >= 18 to >= storeActivationThreshold
$content = $content -replace 'if \(!walletActivated && costUsd >= 18\)', 'if (!walletActivated && costUsd >= storeActivationThreshold)'

# Fix #2: Update metadata tracking
$content = $content -replace 'auto_activated: !walletActivated && costUsd >= 18', 'auto_activated: !walletActivated && costUsd >= storeActivationThreshold,
                            node_activated: nodeMilestoneStatus?.nodeActivated || false,
                            total_spent: nodeMilestoneStatus?.totalSpent || costUsd'

# Fix #3: Update button text condition
$content = $content -replace '\{!walletActivated && costUsd >= 18 \? ''Buy RZC \+ Activate Wallet'' : ''Buy RZC Now''\}', '{!walletActivated && costUsd >= storeActivationThreshold 
                                                    ? (costUsd >= nodeMilestoneThreshold 
                                                        ? ''Buy RZC + Activate + Node Milestone'' 
                                                        : ''Buy RZC + Activate Wallet'')
                                                    : ''Buy RZC Now''}'

Write-Host "✓ Applied regex-based fixes" -ForegroundColor Green

# Save the file
$content | Set-Content $file -NoNewline

Write-Host "✓ Saved changes to $file" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Manual fixes still required!" -ForegroundColor Yellow
Write-Host "Please review STOREUI_TWO_TIER_FIXES_FINAL.md for:" -ForegroundColor Yellow
Write-Host "  - Activation logic replacement (uses RPC function)" -ForegroundColor Yellow
Write-Host "  - Success message updates" -ForegroundColor Yellow
Write-Host "  - Auto-activation notice updates" -ForegroundColor Yellow
Write-Host "  - Progress bar addition" -ForegroundColor Yellow
Write-Host ""
Write-Host "Run 'npm run build' to verify compilation" -ForegroundColor Cyan
