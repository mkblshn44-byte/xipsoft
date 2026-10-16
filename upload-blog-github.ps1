# ============================================================================
# XipSoft Blog Dosyalarini GitHub'a Yukleyen PowerShell Scripti
# Kullanim: .\upload-blog-github.ps1
# Token: GITHUB_TOKEN ortam degiskeninden alinir veya istem sorulur
# ============================================================================

$ErrorActionPreference = "Stop"

$owner = "xiplarexs"
$repo  = "XipSoft"
$branch = "master"

# Blog dosyalarinin yerel yollari (goreceli)
$blogFiles = @(
    "src/app/[locale]/(site)/blog/BlogPageClient.tsx",
    "src/app/[locale]/(site)/blog/post/BlogPostClient.tsx",
    "src/app/[locale]/(site)/blog/post/BlogDetailServer.tsx",
    "src/app/[locale]/(site)/blog/edit/BlogEditClient.tsx",
    "src/app/[locale]/(site)/blog/write/BlogWriteClient.tsx",
    "src/app/(admin)/admin/blog/AdminBlogClient.tsx",
    "src/app/[locale]/(site)/blog/components/BlogCard.tsx",
    "src/app/[locale]/(site)/blog/post/components/BlogContent.tsx",
    "src/app/[locale]/(site)/blog/post/components/BlogActions.tsx",
    "src/app/[locale]/(site)/blog/post/components/BlogHeader.tsx",
    "src/types/blog.ts",
    "src/lib/schema/blog.ts",
    "src/lib/content/handlers/blog.ts",
    "src/lib/blog-slug.ts",
    "src/lib/blog-post-page.ts",
    "src/lib/blog-content.ts",
    "src/lib/blog-cache.ts",
    "src/lib/redis/blog-cache.ts",
    "src/app/_actions/blog-actions.ts",
    "src/app/_actions/admin-blog-actions.ts"
)

# Token al
$token = $env:GITHUB_TOKEN
if (-not $token) {
    $token = Read-Host -Prompt "GitHub Personal Access Token (PAT) girin (repo kapsamli olmalı)"
}
if (-not $token) {
    Write-Error "Token girilmedi. Islem iptal edildi."
    exit 1
}

$headers = @{
    Authorization = "token $token"
    Accept        = "application/vnd.github+json"
    "User-Agent"  = "XipSoft-Blog-Upload"
}

$baseUrl = "https://api.github.com/repos/$owner/$repo/contents"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "XipSoft Blog dosyalari yukleniyor..." -ForegroundColor Cyan
Write-Host "Repo: $owner/$repo  Branch: $branch" -ForegroundColor Cyan
Write-Host "Toplam dosya: $($blogFiles.Count)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$success = 0
$failed  = 0

foreach ($file in $blogFiles) {
    try {
        # Dosya icerigini oku ve base64'e donustur
        if (-not (Test-Path $file)) {
            Write-Warning "YOK (atlandi): $file"
            $failed++
            continue
        }

        $contentBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file).Path)
        $contentBase64 = [Convert]::ToBase64String($contentBytes)

        # API yolu (encode et: [locale] gibi koseli parantezler icin)
        $encodedPath = [System.Web.HttpUtility]::UrlEncode($file)
        $apiUrl = "$baseUrl/$encodedPath?ref=$branch"

        # Mevcut dosya var mi? (SHA almak icin GET)
        $existing = $null
        try {
            $resp = Invoke-RestMethod -Method GET -Uri $apiUrl -Headers $headers -ErrorAction Stop
            $existing = $resp
        } catch {
            # 404 = dosya yok, yeni olusturulacak
        }

        $commitMessage = "feat: blog dosyası eklendi - $file"
        $body = @{
            message     = $commitMessage
            content     = $contentBase64
            branch      = $branch
            committer   = @{
                name  = "XipSoft"
                email = "xipla@xipsoft.local"
            }
        }
        if ($existing) {
            $body.sha = $existing.sha
        }

        $result = Invoke-RestMethod -Method PUT -Uri $apiUrl -Headers $headers -Body ($body | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop

        Write-Host "OK: $file" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "HATA: $file" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkRed
        if ($_.ErrorDetails) {
            $_.ErrorDetails | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkRed }
        }
        $failed++
    }
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Tamamlandi!" -ForegroundColor Cyan
Write-Host "Basarili: $success  Basarisiz: $failed" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}