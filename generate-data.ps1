# Генератор сохранённых данных OSM для tapcard-spots.
# Тянет POI через зеркало maps.mail.ru и кладёт срез в data/<slug>.js,
# чтобы сайт работал без внешних запросов (там, где Overpass блокируется).

param(
  [string[]]$Only = @(),          # slug'и городов, например: moscow,spb
  [int]$Radius = 3000,
  [int]$BatchSize = 2,
  [int]$MaxTries = 5,
  [int]$MaxSeconds = 70
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dataDir = Join-Path $root 'data'
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$endpoint = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'

$cities = @(
  @{ name = 'Москва';          slug = 'moscow';       lat = 55.7558; lon = 37.6173 },
  @{ name = 'Санкт-Петербург'; slug = 'spb';          lat = 59.9386; lon = 30.3141 },
  @{ name = 'Новосибирск';     slug = 'novosibirsk';  lat = 55.0084; lon = 82.9357 },
  @{ name = 'Екатеринбург';    slug = 'ekaterinburg'; lat = 56.8389; lon = 60.6057 },
  @{ name = 'Казань';          slug = 'kazan';        lat = 55.7963; lon = 49.1088 },
  @{ name = 'Нижний Новгород'; slug = 'nizhny';       lat = 56.3269; lon = 44.0059 },
  @{ name = 'Челябинск';       slug = 'chelyabinsk';  lat = 55.1644; lon = 61.4368 },
  @{ name = 'Самара';          slug = 'samara';       lat = 53.1959; lon = 50.1002 },
  @{ name = 'Омск';            slug = 'omsk';         lat = 54.9885; lon = 73.3242 },
  @{ name = 'Ростов-на-Дону';  slug = 'rostov';       lat = 47.2225; lon = 39.7188 },
  @{ name = 'Уфа';             slug = 'ufa';          lat = 54.7388; lon = 55.9721 },
  @{ name = 'Красноярск';      slug = 'krasnoyarsk';  lat = 56.0097; lon = 92.8526 },
  @{ name = 'Пермь';           slug = 'perm';         lat = 58.0105; lon = 56.2502 },
  @{ name = 'Воронеж';         slug = 'voronezh';     lat = 51.6720; lon = 39.1843 },
  @{ name = 'Волгоград';       slug = 'volgograd';    lat = 48.7080; lon = 44.5133 },
  @{ name = 'Краснодар';       slug = 'krasnodar';    lat = 45.0355; lon = 38.9753 },
  @{ name = 'Саратов';         slug = 'saratov';      lat = 51.5336; lon = 46.0343 },
  @{ name = 'Тюмень';          slug = 'tyumen';       lat = 57.1522; lon = 65.5272 },
  @{ name = 'Сочи';            slug = 'sochi';        lat = 43.5855; lon = 39.7231 },
  @{ name = 'Владивосток';     slug = 'vladivostok';  lat = 43.1155; lon = 131.8855 }
)

# порядок и id должны совпадать с RULES в app.js
$rules = @(
  @{ id='restaurant';  f='["amenity"="restaurant"]' },
  @{ id='hairdresser'; f='["shop"="hairdresser"]' },
  @{ id='beauty';      f='["shop"="beauty"]' },
  @{ id='dentist';     f='["amenity"="dentist"]' },
  @{ id='hotel';       f='["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"]' },
  @{ id='cafe';        f='["amenity"="cafe"]' },
  @{ id='spa';         f='["leisure"="spa"]' },
  @{ id='clinic';      f='["amenity"~"^(clinic|doctors)$"]' },
  @{ id='veterinary';  f='["amenity"="veterinary"]' },
  @{ id='carservice';  f='["shop"~"^(car_repair|tyres)$"]' },
  @{ id='fitness';     f='["leisure"~"^(fitness_centre|sports_centre)$"]' },
  @{ id='tattoo';      f='["shop"="tattoo"]' },
  @{ id='bar';         f='["amenity"~"^(bar|pub|biergarten)$"]' },
  @{ id='carwash';     f='["amenity"="car_wash"]' },
  @{ id='carshow';     f='["shop"="car"]' },
  @{ id='fastfood';    f='["amenity"="fast_food"]' },
  @{ id='bakery';      f='["shop"~"^(bakery|pastry|confectionery)$"]' },
  @{ id='optician';    f='["shop"="optician"]' },
  @{ id='photo';       f='["shop"="photo"]' },
  @{ id='jewelry';     f='["shop"="jewelry"]' },
  @{ id='cleaning';    f='["shop"~"^(dry_cleaning|laundry)$"]' },
  @{ id='coworking';   f='["office"="coworking"]' },
  @{ id='florist';     f='["shop"="florist"]' },
  @{ id='pet';         f='["shop"="pet"]' },
  @{ id='furniture';   f='["shop"="furniture"]' },
  @{ id='travel';      f='["shop"="travel_agency"]' },
  @{ id='clothes';     f='["shop"~"^(clothes|shoes)$"]' },
  @{ id='pharmacy';    f='["amenity"="pharmacy"]' },
  @{ id='supermarket'; f='["shop"~"^(supermarket|convenience)$"]' }
)
$ruleIds = @{}
for ($i = 0; $i -lt $rules.Count; $i++) { $ruleIds[$rules[$i].id] = $i }

# категория -> индекс правила (для строки среза)
function Match-Index($t) {
  $a = $t.amenity; $s = $t.shop; $l = $t.leisure; $o = $t.office; $h = $t.healthcare; $tr = $t.tourism; $cr = $t.craft
  if ($a -eq 'restaurant') { return 0 }
  if ($s -eq 'hairdresser') { return 1 }
  if ($s -eq 'beauty') { return 2 }
  if ($a -eq 'dentist' -or $h -eq 'dentist') { return 3 }
  if ($tr -in @('hotel','guest_house','hostel','motel','apartment')) { return 4 }
  if ($a -eq 'cafe') { return 5 }
  if ($l -eq 'spa' -or $s -eq 'massage') { return 6 }
  if ($a -in @('clinic','doctors','doctor') -or $h -in @('clinic','doctor','centre')) { return 7 }
  if ($a -eq 'veterinary' -or $h -eq 'veterinary') { return 8 }
  if ($s -in @('car_repair','tyres') -or $a -eq 'car_repair') { return 9 }
  if ($l -in @('fitness_centre','sports_centre') -or $a -eq 'gym') { return 10 }
  if ($s -eq 'tattoo') { return 11 }
  if ($a -in @('bar','pub','biergarten')) { return 12 }
  if ($a -eq 'car_wash') { return 13 }
  if ($s -eq 'car') { return 14 }
  if ($a -eq 'fast_food') { return 15 }
  if ($s -in @('bakery','pastry','confectionery')) { return 16 }
  if ($s -eq 'optician') { return 17 }
  if ($s -eq 'photo' -or $cr -eq 'photographer') { return 18 }
  if ($s -eq 'jewelry') { return 19 }
  if ($s -in @('dry_cleaning','laundry')) { return 20 }
  if ($o -eq 'coworking' -or $a -eq 'coworking_space') { return 21 }
  if ($s -eq 'florist') { return 22 }
  if ($s -eq 'pet') { return 23 }
  if ($s -eq 'furniture') { return 24 }
  if ($s -eq 'travel_agency' -or $o -eq 'travel_agent') { return 25 }
  if ($s -in @('clothes','shoes')) { return 26 }
  if ($a -eq 'pharmacy') { return 27 }
  if ($s -in @('supermarket','convenience')) { return 28 }
  return -1
}

function JStr($s) {
  if ($null -eq $s) { return '""' }
  $x = [string]$s
  $x = $x.Replace('\', '\\').Replace('"', '\"').Replace("`r", ' ').Replace("`n", ' ').Replace("`t", ' ')
  return '"' + $x + '"'
}

function Invoke-Overpass($query, $tmp, $label) {
  for ($i = 1; $i -le $MaxTries; $i++) {
    $code = & curl.exe -s -o $tmp -w '%{http_code}' --max-time $MaxSeconds -X POST $endpoint `
      -H 'Content-Type: application/x-www-form-urlencoded' `
      --data ('data=' + [uri]::EscapeDataString($query)) 2>$null
    $code = ($code -join '').Trim()
    if ($code -eq '200' -and (Test-Path $tmp)) { return $true }
    Write-Host ("    {0}: попытка {1} -> HTTP {2}" -f $label, $i, $code) -ForegroundColor DarkYellow
    Start-Sleep -Seconds (4 * $i)
  }
  return $false
}

if ($Only.Count -gt 0) {
  $cities = @($cities | Where-Object { $Only -contains $_.slug })
}

$batches = @()
for ($i = 0; $i -lt $rules.Count; $i += $BatchSize) {
  $batches += ,@($rules[$i..([Math]::Min($i + $BatchSize - 1, $rules.Count - 1))])
}
$totalBatches = $batches.Count
Write-Host ("Городов: {0}, категорий: {1}, пачек на город: {2}" -f $cities.Count, $rules.Count, $totalBatches) -ForegroundColor Cyan

foreach ($city in $cities) {
  $lat = [double]$city.lat; $lon = [double]$city.lon
  $dLat = $Radius / 111320.0
  $dLon = $Radius / (111320.0 * [math]::Cos($lat * [math]::PI / 180.0))
  $bbox = '{0:F5},{1:F5},{2:F5},{3:F5}' -f ($lat - $dLat), ($lon - $dLon), ($lat + $dLat), ($lon + $dLon)

  Write-Host ("=== {0} ({1}) ===" -f $city.name, $bbox) -ForegroundColor Cyan
  $seen = @{}
  $lines = New-Object System.Collections.Generic.List[string]
  $bi = 0

  foreach ($batch in $batches) {
    $bi++
    $body = ($batch | ForEach-Object { '  nwr' + $_.f + '(' + $bbox + ');' }) -join "`n"
    $query = "[out:json][timeout:120];`n(`n$body`n);`nout center 20000;"

    $tmp = Join-Path $env:TEMP ("ov_" + $city.slug + "_" + $bi + ".json")
    if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Force }
    $label = "пачка $bi/$totalBatches"
    if (-not (Invoke-Overpass $query $tmp $label)) {
      Write-Host ("  {0}: не удалось" -f $label) -ForegroundColor Red
      continue
    }

    try { $json = Get-Content -LiteralPath $tmp -Raw -Encoding UTF8 | ConvertFrom-Json } catch {
      Write-Host ("  {0}: битый JSON" -f $label) -ForegroundColor Red
      continue
    }

    $added = 0
    foreach ($el in $json.elements) {
      $t = $el.tags
      if (-not $t) { continue }
      $id = "$($el.type)/$($el.id)"
      if ($seen.ContainsKey($id)) { continue }
      $plat = if ($null -ne $el.lat) { $el.lat } else { $el.center.lat }
      $plon = if ($null -ne $el.lon) { $el.lon } else { $el.center.lon }
      if ($null -eq $plat -or $null -eq $plon) { continue }
      $ri = Match-Index $t
      if ($ri -lt 0) { continue }
      $name = $t.name; if (-not $name) { $name = $t.'name:ru' }; if (-not $name) { $name = $t.brand }; if (-not $name) { $name = $t.operator }
      if (-not $name) { continue }

      $addr = (@($t.'addr:street', $t.'addr:housenumber') | Where-Object { $_ }) -join ', '
      $ph = $t.phone; if (-not $ph) { $ph = $t.'contact:phone' }
      if ($ph) { $ph = ($ph -replace '[^\d+]', '') }
      $site = $t.website; if (-not $site) { $site = $t.'contact:website' }; if (-not $site) { $site = $t.url }
      $brand = 0; if ($t.brand -or $t.'brand:wikidata') { $brand = 1 }

      $lines.Add('[' + $ri + ',' + (JStr $name) + ',' + [math]::Round([double]$plat, 5).ToString([Globalization.CultureInfo]::InvariantCulture) + ',' + [math]::Round([double]$plon, 5).ToString([Globalization.CultureInfo]::InvariantCulture) + ',' + (JStr $addr) + ',' + (JStr $ph) + ',' + (JStr $site) + ',' + (JStr $t.opening_hours) + ',' + $brand + ']')
      $seen[$id] = 1
      $added++
    }
    Write-Host ("  {0}: +{1}, всего {2}" -f $label, $added, $lines.Count)
    Start-Sleep -Seconds 1
  }

  $rulesJson = ($rules | ForEach-Object { JStr $_.id }) -join ','
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('window.TAPCARD_CITY=window.TAPCARD_CITY||{};')
  [void]$sb.Append('window.TAPCARD_CITY[' + (JStr $city.name) + ']={')
  [void]$sb.Append('city:' + (JStr $city.name) + ',updated:"' + (Get-Date -Format 'yyyy-MM-dd') + '",radius:' + $Radius)
  [void]$sb.Append(',center:[' + $lat.ToString([Globalization.CultureInfo]::InvariantCulture) + ',' + $lon.ToString([Globalization.CultureInfo]::InvariantCulture) + ']')
  [void]$sb.Append(',rules:[' + $rulesJson + ']')
  [void]$sb.Append(',pois:[' + ($lines -join ',') + ']};')

  $outFile = Join-Path $dataDir ($city.slug + '.js')
  [System.IO.File]::WriteAllText($outFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("  сохранено: {0} ({1:N0} КБ, {2} точек)" -f (Split-Path $outFile -Leaf), ((Get-Item -LiteralPath $outFile).Length / 1KB), $lines.Count) -ForegroundColor Green
}

Write-Host 'Готово.' -ForegroundColor Green
