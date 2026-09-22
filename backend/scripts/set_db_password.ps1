param(
    [Parameter(Mandatory=$false)]
    [string]$Password
)

$envFile = Join-Path $PSScriptRoot "..\.env"

if (-not $Password) {
    $secPass = Read-Host "Enter your local PostgreSQL password" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

if (-not (Test-Path $envFile)) {
    Write-Error "Could not find .env file at $envFile"
    exit 1
}

$content = Get-Content $envFile -Raw
$newContent = $content -replace "postgresql\+psycopg://postgres:[^@]*@", "postgresql+psycopg://postgres:$Password@"
Set-Content -Path $envFile -Value $newContent

Write-Host "[+] Successfully updated PostgreSQL password in backend/.env"
Write-Host "[*] Now testing connection and initializing database..."
& "$PSScriptRoot\..\.venv\Scripts\python.exe" -m scripts.init_db
