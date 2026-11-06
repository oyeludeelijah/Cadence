if (-not $env:NVIDIA_API_KEY) { Write-Host "NVIDIA_API_KEY is NOT set in this window"; return }
$h = @{Authorization="Bearer $env:NVIDIA_API_KEY"}

function Test-Model($m) {
  $body = @{ model=$m; max_tokens=200; messages=@(@{role="user";content="Reply with exactly: OK"}) } | ConvertTo-Json -Depth 5
  $t = Get-Date
  try {
    $r = Invoke-RestMethod "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Headers $h -ContentType "application/json" -Body $body -TimeoutSec 20
    $c = $r.choices[0]
    "{0} | {1:N1}s | finish={2} | content={3} | reasoning={4}" -f $m, ((Get-Date)-$t).TotalSeconds, $c.finish_reason, $c.message.content, [bool]$c.message.reasoning_content
  } catch {
    "{0} | FAIL {1}" -f $m, $_.Exception.Response.StatusCode.value__
  }
}

"CONTROL:"
Test-Model "openai/gpt-oss-20b"

$ids = (Invoke-RestMethod "https://integrate.api.nvidia.com/v1/models" -Headers $h).data.id | Sort-Object -Unique
$skip = 'embed|rerank|guard|reward|vision|-vl|vlm|parse|clip|safety|translate|detector|pose|deplot|kosmos|fuyu|neva|vila|riva|calibration|cosmos|retriev|reason|thinking|kimi|minimax|deepseek|gpt-oss|glm|nemotron-3|laguna|diffusion|flux|code|starcoder'
$cands = $ids | Where-Object { $_ -notmatch $skip }
"$($ids.Count) models listed, testing $($cands.Count)..."
foreach ($m in $cands) { Test-Model $m }
"done"