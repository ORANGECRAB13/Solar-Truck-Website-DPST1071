import fetch from "node-fetch";
import fs from "fs";

const BASE = "https://services1.arcgis.com/IwZZTMxZCmAmFYvF/arcgis/rest/services/Detailed_Bridge_Inventory_Final/FeatureServer/1/query";

async function fetchBridges(offset = 0) {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",  // or a more specific condition
    outFields: "*",
    returnGeometry: "true",
    resultOffset: offset.toString(),
    resultRecordCount: "1000"  // you can adjust batch size
  });

  const url = `${BASE}?${params.toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.features || [];
}

async function scrapeAll() {
  let all = [];
  let offset = 0;
  while(true) {
    console.log("Fetching offset", offset);
    const feats = await fetchBridges(offset);
    if (feats.length === 0) break;
    all = all.concat(feats);
    offset += feats.length;
  }

  const output = all.map(f => ({
    id: f.attributes.OBJECTID,
    attributes: f.attributes,
    longitude: f.geometry.x,
    latitude: f.geometry.y
  }));

  fs.writeFileSync("bridges_dpwh.json", JSON.stringify(output, null, 2));
  console.log("Done, saved", output.length);
}

scrapeAll().catch(err => {
  console.error("Error:", err);
});
