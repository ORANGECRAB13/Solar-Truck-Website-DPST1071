// fetchRoad.js
// Run: node fetchRoad.js

// 👉 If you're on Node 18+, fetch is built-in. No need for node-fetch.
// For Node 16 or older: npm install node-fetch@2 && use import fetch from "node-fetch";
import fetch from "node-fetch";

// --------- CONFIG ---------
const lat = 14.6891;  // Latitude
const lon = 120.9459; // Longitude
const buffer = 50;    // Buffer size in meters

// DPWH ArcGIS REST API endpoint
const url = "https://apps2.dpwh.gov.ph/server/rest/services/DPWH_Public/RoadNetwork_RoadClassification/MapServer/1/query";




/* --------- PUPPETEER ---------
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({headless: false});
const page = await browser.newPage();

//navigate to DPWH arcgis
await page.goto('https://www.arcgis.com/apps/webappviewer/index.html?id=4bc4f2dc3a5644088c57de02108a8fd3');
await page.setViewport({width: 1920, height: 1080});


//zoom into the map
await page.
*/
// --------- FUNCTIONS ---------

// Convert from lat/lon (EPSG:4326) to Web Mercator (EPSG:102100)
function lonLatToWebMercator(lon, lat) {
  const x = (lon * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
}

async function fetchRoad(lon, lat) {
  const { x, y } = lonLatToWebMercator(lon, lat);

  // Build envelope
  const geometry = {
    xmin: x - buffer,
    ymin: y - buffer,
    xmax: x + buffer,
    ymax: y + buffer,
    spatialReference: { wkid: 102100 }
  };

  const params = new URLSearchParams({
    f: "json",
    returnGeometry: "true",
    spatialRel: "esriSpatialRelIntersects",
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryEnvelope",
    inSR: "102100",
    outFields: "*",
    outSR: "4326"
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Node.js fetch)",
        "Accept": "application/json"
      }
    });

    // Grab raw text first (helps debugging if it's HTML instead of JSON)
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ Server did not return JSON. Raw response was:\n", text.slice(0, 500));
      return;
    }

    if (!data.features || data.features.length === 0) {
      console.log("⚠️ No road features found near this location.");
      return;
    }

    console.log(`✅ Found ${data.features.length} feature(s)\n`);

    data.features.forEach((f, i) => {
      console.log(`Road ${i + 1}: ${f.attributes.ROAD_NAME || "Unknown road"}`);
      if (f.geometry?.paths) {
        f.geometry.paths.forEach(path => {
          path.forEach(([lon, lat]) => {
            console.log([lon, lat]);
            console.log(',');
          });
        });
      }
      console.log("----");
    });
  } catch (err) {
    console.error("❌ Fetch failed:", err);
  }
}

const result_arr = [fetchRoad(lon, lat)];
console.log(result_arr);

/* --------- RUN ---------

const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: fetchRoad(lon, lat)
      },
      properties: {}
    }
  ]
};
s
console.log(JSON.stringify(geojson));
*/