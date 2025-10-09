import fetch from "node-fetch";
import fs from "fs";

const BASE =
  "https://apps2.dpwh.gov.ph/server/rest/services/DPWH_Public/RoadNetwork_RoadClassification/MapServer/1/query";

// Function to fetch roads in batches
async function fetchRoads(offset = 0) {
  const params = new URLSearchParams({
    f: "json",                        // request JSON format
    where: "1=1",                     // fetch all records
    outFields: "*",                   // get all attribute fields
    returnGeometry: "true",           // include coordinates
    resultOffset: offset.toString(),  // pagination offset
    resultRecordCount: "1000"         // ArcGIS max batch size (1000–2000 typical)
  });

  const url = `${BASE}?${params.toString()}`;
  console.log("Fetching:", url);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // Safety checks
  if (!json.features || !Array.isArray(json.features)) {
    console.warn("⚠️  No features found at offset", offset);
    return [];
  }

  return json.features;
}

// Main function to scrape all records
async function scrapeAll() {
  let all = [];
  let offset = 0;

  while (true) {
    console.log(`🔄 Fetching batch starting at offset ${offset}...`);
    const feats = await fetchRoads(offset);

    if (feats.length === 0) {
      console.log("✅ No more features found. Exiting loop.");
      break;
    }

    all = all.concat(feats);
    console.log(`📦 Total so far: ${all.length}`);
    offset += feats.length;
  }

  // Transform results into a cleaner JSON structure
const output = all.map((f) => ({
  id: f.attributes?.OBJECTID,
  attributes: f.attributes,
  coordinates: f.geometry?.paths || []
}));


  fs.writeFileSync("roads_dpwh.json", JSON.stringify(output, null, 2));
  console.log(`✅ Done! Saved ${output.length} records to roads_dpwh.json`);
}

// Run the scraper
scrapeAll().catch((err) => {
  console.error("❌ Error:", err);
});
