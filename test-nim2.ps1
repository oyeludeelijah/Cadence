if (-not $env:NVIDIA_API_KEY) { Write-Host "NVIDIA_API_KEY is NOT set in this window"; return }
$h = @{Authorization="Bearer $env:NVIDIA_API_KEY"}

function Test-Model($label, $m, $extra, $timeout) {
  $body = @{ model=$m; max_tokens=200; messages=@(@{role="user";content="Reply with exactly: OK"}) }
  if ($extra) { foreach ($k in $extra.Keys) { $body[$k] = $extra[$k] } }
  $json = $body | ConvertTo-Json -Depth 6
  $t = Get-Date
  try {
    $r = Invoke-RestMethod "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Headers $h -ContentType "application/json" -Body $json -TimeoutSec $timeout
    $c = $r.choices[0]
    "{0} | {1:N1}s | finish={2} | content={3} | reasoning={4}" -f $label, ((Get-Date)-$t).TotalSeconds, $c.finish_reason, $c.message.content, [bool]$c.message.reasoning_content
  } catch {
    "{0} | FAIL {1} | {2}" -f $label, $_.Exception.Response.StatusCode.value__, $_.Exception.Message
  }
}

$off = @{ chat_template_kwargs = @{ enable_thinking = $false } }

Test-Model "lightning THINKING OFF" "nvidia/nemotron-3.5-lightning-30b-a3b" $off 60
Test-Model "lightning default (contrast)" "nvidia/nemotron-3.5-lightning-30b-a3b" $null 60
Test-Model "nemotron-3-super THINKING OFF" "nvidia/nemotron-3-super-120b-a12b" $off 60
Test-Model "gemma-4-31b default" "google/gemma-4-31b-it" $null 60
"done"