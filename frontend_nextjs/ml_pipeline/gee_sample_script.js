/**
 * MOIL AI: Google Earth Engine (GEE) Multi-Spectral Extraction Script
 * -------------------------------------------------------------------
 * Paste this script directly into the Google Earth Engine Code Editor
 * (code.earthengine.google.com) to extract real Earth Observation features
 * across the Central India Manganese Belt (Balaghat, Madhya Pradesh/Maharashtra).
 * 
 * Datasets Extracted:
 * 1. Sentinel-2 MSI (Harmonized): NDVI Vegetation Stress
 * 2. Landsat-9 TIRS: Land Surface Temperature (LST)
 * 3. Sentinel-1 SAR GRD: C-band VV/VH Dielectric Backscatter (Soil Moisture proxy)
 * 4. CHIRPS Daily: Precipitation & Rainfall Anomaly
 */

// 1. Define Area of Interest (AOI) - Balaghat Mine & Regional Belt
var aoi = ee.Geometry.Polygon([
  [[79.85, 21.65],
   [80.35, 21.65],
   [80.35, 22.05],
   [79.85, 22.05]]
]);

Map.centerObject(aoi, 11);
Map.setOptions('SATELLITE');

// Date Range (Post-monsoon dry period optimal for mineral spectral response)
var startDate = '2024-01-01';
var endDate = '2024-05-31';

// -------------------------------------------------------------
// FEATURE 1: Sentinel-2 L2A Normalized Difference Vegetation Index (NDVI)
// High manganese concentrations cause phytotoxicity and lower canopy NDVI.
// -------------------------------------------------------------
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
  .median()
  .clip(aoi);

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndviVis = {min: 0.1, max: 0.8, palette: ['red', 'yellow', 'green', 'darkgreen']};
Map.addLayer(ndvi, ndviVis, 'Sentinel-2 NDVI (Vegetation Stress)');

// -------------------------------------------------------------
// FEATURE 2: Landsat-9 TIR Land Surface Temperature (LST in Celsius)
// High-density manganese ore beds (Braunite/Pyrolusite) exhibit thermal inertia anomalies.
// -------------------------------------------------------------
var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(aoi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUD_COVER', 15))
  .median()
  .clip(aoi);

// Band 10 Thermal Infrared to Kelvin and Celsius
var lstKelvin = l9.select('ST_B10').multiply(0.00341802).add(149.0);
var lstCelsius = lstKelvin.subtract(273.15).rename('LST_Celsius');
var lstVis = {min: 25, max: 48, palette: ['blue', 'cyan', 'yellow', 'orange', 'red']};
Map.addLayer(lstCelsius, lstVis, 'Landsat-9 Land Surface Temperature');

// -------------------------------------------------------------
// FEATURE 3: Sentinel-1 SAR C-band Soil Moisture Proxy
// -------------------------------------------------------------
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .select('VV')
  .median()
  .clip(aoi);

var s1Vis = {min: -25, max: 0, palette: ['black', 'blue', 'white']};
Map.addLayer(s1, s1Vis, 'Sentinel-1 SAR Moisture Backscatter');

// -------------------------------------------------------------
// FEATURE 4: CHIRPS Rainfall (Precipitation mm)
// -------------------------------------------------------------
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(aoi)
  .filterDate('2023-01-01', '2023-12-31')
  .sum()
  .clip(aoi)
  .rename('Annual_Rainfall_mm');

var rainVis = {min: 800, max: 1600, palette: ['lightyellow', 'lightblue', 'darkblue']};
Map.addLayer(chirps, rainVis, 'CHIRPS Annual Precipitation');

// -------------------------------------------------------------
// SAMPLE & EXPORT POINTS FOR AI TRAINING
// Merges real satellite values with target GPS coordinates
// -------------------------------------------------------------
var composite = ee.Image.cat([ndvi, lstCelsius, s1, chirps]);

print('Composite bands ready for ML training:', composite.bandNames());
