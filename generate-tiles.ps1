# Генератор сохранённых данных OSM для tapcard-spots.
# Источник — официальный OSM API (api.openstreetmap.org), который доступен даже там,
# где Overpass заблокирован. Город нарезается на плитки ~600 м, из них вытаскиваются
# только объекты с нужными тегами и складываются в data/<slug>.js.

param(
  [string[]]$Only = @(),
  [int]$Radius = 2500,
  [int]$Cell = 600,
  [string]$Slug = '',
  [string]$Name = '',
  [double]$Lat = 0,
  [double]$Lon = 0
)

$ErrorActionPreference = 'Stop'
$ci = [Globalization.CultureInfo]::InvariantCulture
$root = $PSScriptRoot
$dataDir = Join-Path $root 'data'
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$ua = 'tapcard-spots/1.0 (OSM POI snapshot; contact: vladsuhorucov00@gmail.com)'

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

if ($Slug) {
  $cities = @(@{ name = $Name; slug = $Slug; lat = $Lat; lon = $Lon })
} elseif ($Only.Count -gt 0) {
  $cities = @($cities | Where-Object { $Only -contains $_.slug })
}

# порядок и id должны совпадать с RULES в app.js
$rules = @(
  @{ id='restaurant'  }, @{ id='hairdresser' }, @{ id='beauty'      }, @{ id='dentist'     },
  @{ id='hotel'       }, @{ id='cafe'        }, @{ id='spa'         }, @{ id='clinic'      },
  @{ id='veterinary'  }, @{ id='carservice'  }, @{ id='fitness'     }, @{ id='tattoo'      },
  @{ id='bar'         }, @{ id='carwash'     }, @{ id='carshow'     }, @{ id='fastfood'    },
  @{ id='bakery'      }, @{ id='optician'    }, @{ id='photo'       }, @{ id='jewelry'     },
  @{ id='cleaning'    }, @{ id='coworking'   }, @{ id='florist'     }, @{ id='pet'         },
  @{ id='furniture'   }, @{ id='travel'      }, @{ id='clothes'     }, @{ id='pharmacy'    },
  @{ id='supermarket' }
)

function Match-Index($t) {
  $a = $t['amenity']; $s = $t['shop']; $l = $t['leisure']; $o = $t['office']; $h = $t['healthcare']; $tr = $t['tourism']; $cr = $t['craft']
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

function Attr($attrs, $name) {
  $m = [regex]::Match($attrs, $name + '\s*=\s*"([^"]*)"')
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Tags-Of($block) {
  $t = @{}
  foreach ($m in [regex]::Matches($block, '<tag\b([^>]*)/>')) {
    $k = Attr $m.Groups[1].Value 'k'
    $v = Attr $m.Groups[1].Value 'v'
    if ($k) { $t[$k] = [System.Net.WebUtility]::HtmlDecode($v) }
  }
  return $t
}

function Fetch-Tile($minLon, $minLat, $maxLon, $maxLat, $path) {
  $bbox = @($minLon, $minLat, $maxLon, $maxLat) | ForEach-Object { $_.ToString('F6', $ci) }
  $url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ($bbox -join ',')
  for ($i = 1; $i -le 3; $i++) {
    $code = & curl.exe -s -o $path -w '%{http_code}' --max-time 120 -A $ua $url 2>$null
    $code = ($code -join '').Trim()
    if ($code -eq '200') { return 'ok' }
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    if ($code -eq '400') { return 'too-big' }
    Start-Sleep -Seconds (3 * $i)
  }
  return 'fail'
}

function Haversine($lat1, $lon1, $lat2, $lon2) {
  $R = 6371000.0
  $dLat = ($lat2 - $lat1) * [math]::PI / 180.0
  $dLon = ($lon2 - $lon1) * [math]::PI / 180.0
  $a = [math]::Sin($dLat / 2) * [math]::Sin($dLat / 2) +
       [math]::Cos($lat1 * [math]::PI / 180.0) * [math]::Cos($lat2 * [math]::PI / 180.0) *
       [math]::Sin($dLon / 2) * [math]::Sin($dLon / 2)
  return 2 * $R * [math]::Asin([math]::Sqrt($a))
}

$ruleIdsJson = ($rules | ForEach-Object { JStr $_.id }) -join ','

foreach ($city in $cities) {
  $lat = [double]$city.lat; $lon = [double]$city.lon
  $cacheDir = Join-Path $env:TEMP ('tapcard_tiles\' + $city.slug + '_' + $Radius)
  if (!(Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }

  $dLat = $Radius / 111320.0
  $dLon = $Radius / (111320.0 * [math]::Cos($lat * [math]::PI / 180.0))
  $nLat = [Math]::Max(1, [Math]::Ceiling(2 * $dLat / ($Cell / 111320.0)))
  $nLon = [Math]::Max(1, [Math]::Ceiling(2 * $dLon / ($Cell / (111320.0 * [math]::Cos($lat * [math]::PI / 180.0)))))

  Write-Host ("=== {0}: плиток {1}x{2} = {3}, радиус {4} м ===" -f $city.name, $nLat, $nLon, ($nLat * $nLon), $Radius) -ForegroundColor Cyan

  $seen = @{}
  $rows = New-Object System.Collections.Generic.List[string]
  $tileNo = 0
  $fail = 0

  for ($iy = 0; $iy -lt $nLat; $iy++) {
    for ($ix = 0; $ix -lt $nLon; $ix++) {
      $tileNo++
      $minLat = $lat - $dLat + $iy * ($Cell / 111320.0) / [Math]::Cos(0) * 1.0
      # широта: шаг Cell/111320; долгота: шаг Cell/(111320*cos(lat))
      $stepLat = $Cell / 111320.0
      $stepLon = $Cell / (111320.0 * [math]::Cos($lat * [math]::PI / 180.0))
      $minLat = $lat - $dLat + $iy * $stepLat
      $minLon = $lon - $dLon + $ix * $stepLon
      $maxLat = [Math]::Min($lat + $dLat, $minLat + $stepLat)
      $maxLon = [Math]::Min($lon + $dLon, $minLon + $stepLon)

      if (($maxLat - $minLat) -le 0 -or ($maxLon - $minLon) -le 0) { continue }

      $path = Join-Path $cacheDir ('{0}_{1}.osm' -f $iy, $ix)
      if (!(Test-Path $path) -or (Get-Item -LiteralPath $path).Length -lt 200) {
        $res = Fetch-Tile $minLon $minLat $maxLon $maxLat $path
        if ($res -ne 'ok') {
          Write-Host ("  плитка {0}/{1}: {2}" -f $tileNo, ($nLat * $nLon), $res) -ForegroundColor DarkYellow
          if ($res -eq 'fail') { $fail++ }
          continue
        }
      }

      $text = [System.IO.File]::ReadAllText($path)
      if ($text.Length -lt 200 -or $text.IndexOf('<osm') -lt 0) {
        Remove-Item -LiteralPath $path -Force
        continue
      }

      $nodePos = @{}
      foreach ($m in [regex]::Matches($text, '<node\b([^>]*)>')) {
        $a = $m.Groups[1].Value
        $id = Attr $a 'id'
        $la = Attr $a 'lat'
        $lo = Attr $a 'lon'
        if ($id -and $la -and $lo) {
          $nodePos[$id] = @([double]::Parse($la, $ci), [double]::Parse($lo, $ci))
        }
      }

      # точки с тегами
      foreach ($m in [regex]::Matches($text, '(?s)<node\b([^>]*)>(.*?)</node>')) {
        $block = $m.Groups[2].Value
        if ($block.IndexOf('<tag') -lt 0) { continue }
        $a = $m.Groups[1].Value
        $id = 'node/' + (Attr $a 'id')
        if ($seen.ContainsKey($id)) { continue }
        $la = Attr $a 'lat'; $lo = Attr $a 'lon'
        if (-not $la) { continue }
        $pl = [double]::Parse($la, $ci); $pn = [double]::Parse($lo, $ci)
        if ((Haversine $lat $lon $pl $pn) -gt $Radius) { continue }
        $t = Tags-Of $block
        $ri = Match-Index $t
        if ($ri -lt 0) { continue }
        $nm = $t['name']; if (-not $nm) { $nm = $t['name:ru'] }; if (-not $nm) { $nm = $t['brand'] }; if (-not $nm) { $nm = $t['operator'] }
        if (-not $nm) { continue }
        $addr = (@($t['addr:street'], $t['addr:housenumber']) | Where-Object { $_ }) -join ', '
        $ph = $t['phone']; if (-not $ph) { $ph = $t['contact:phone'] }
        if ($ph) { $ph = ($ph -replace '[^\d+]', '') }
        $site = $t['website']; if (-not $site) { $site = $t['contact:website'] }; if (-not $site) { $site = $t['url'] }
        $brand = 0; if ($t['brand'] -or $t['brand:wikidata']) { $brand = 1 }
        $rows.Add('[' + $ri + ',' + (JStr $nm) + ',' + $pl.ToString('F5', $ci) + ',' + $pn.ToString('F5', $ci) + ',' + (JStr $addr) + ',' + (JStr $ph) + ',' + (JStr $site) + ',' + (JStr $t['opening_hours']) + ',' + $brand + ']')
        $seen[$id] = 1
      }

      # здания/площадки с тегами
      foreach ($m in [regex]::Matches($text, '(?s)<way\b([^>]*)>(.*?)</way>')) {
        $block = $m.Groups[2].Value
        if ($block.IndexOf('<tag') -lt 0) { continue }
        $a = $m.Groups[1].Value
        $id = 'way/' + (Attr $a 'id')
        if ($seen.ContainsKey($id)) { continue }
        $t = Tags-Of $block
        $ri = Match-Index $t
        if ($ri -lt 0) { continue }
        $nm = $t['name']; if (-not $nm) { $nm = $t['name:ru'] }; if (-not $nm) { $nm = $t['brand'] }; if (-not $nm) { $nm = $t['operator'] }
        if (-not $nm) { continue }

        $sumLat = 0.0; $sumLon = 0.0; $cnt = 0
        foreach ($nd in [regex]::Matches($block, '<nd\b([^>]*)/>')) {
          $ref = Attr $nd.Groups[1].Value 'ref'
          if ($ref -and $nodePos.ContainsKey($ref)) {
            $sumLat += $nodePos[$ref][0]; $sumLon += $nodePos[$ref][1]; $cnt++
          }
        }
        if ($cnt -eq 0) { continue }
        $pl = $sumLat / $cnt; $pn = $sumLon / $cnt
        if ((Haversine $lat $lon $pl $pn) -gt $Radius) { continue }

        $addr = (@($t['addr:street'], $t['addr:housenumber']) | Where-Object { $_ }) -join ', '
        $ph = $t['phone']; if (-not $ph) { $ph = $t['contact:phone'] }
        if ($ph) { $ph = ($ph -replace '[^\d+]', '') }
        $site = $t['website']; if (-not $site) { $site = $t['contact:website'] }; if (-not $site) { $site = $t['url'] }
        $brand = 0; if ($t['brand'] -or $t['brand:wikidata']) { $brand = 1 }
        $rows.Add('[' + $ri + ',' + (JStr $nm) + ',' + $pl.ToString('F5', $ci) + ',' + $pn.ToString('F5', $ci) + ',' + (JStr $addr) + ',' + (JStr $ph) + ',' + (JStr $site) + ',' + (JStr $t['opening_hours']) + ',' + $brand + ']')
        $seen[$id] = 1
      }

      if ($tileNo % 5 -eq 0) {
        Write-Host ("  {0}/{1} плиток, точек: {2}" -f $tileNo, ($nLat * $nLon), $rows.Count)
      }
    }
  }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('window.TAPCARD_CITY=window.TAPCARD_CITY||{};')
  [void]$sb.Append('window.TAPCARD_CITY[' + (JStr $city.name) + ']={')
  [void]$sb.Append('city:' + (JStr $city.name) + ',updated:"' + (Get-Date -Format 'yyyy-MM-dd') + '",radius:' + $Radius)
  [void]$sb.Append(',center:[' + $lat.ToString('F5', $ci) + ',' + $lon.ToString('F5', $ci) + ']')
  [void]$sb.Append(',rules:[' + $ruleIdsJson + ']')
  [void]$sb.Append(',pois:[' + ($rows -join ',') + ']};')

  $outFile = Join-Path $dataDir ($city.slug + '.js')
  [System.IO.File]::WriteAllText($outFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("  сохранено: {0} ({1:N0} КБ, {2} точек, ошибок плиток: {3})" -f (Split-Path $outFile -Leaf), ((Get-Item -LiteralPath $outFile).Length / 1KB), $rows.Count, $fail) -ForegroundColor Green
}

Write-Host 'Готово.' -ForegroundColor Green
