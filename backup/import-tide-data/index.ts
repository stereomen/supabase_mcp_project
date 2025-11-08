import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function importTideData() {
  console.log('Starting tide data import process...');
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  try {
    // 1. Read the JSON file from Supabase Storage
    const bucketName = 'tidedatadb.tidedata.json';
    const filePathInStorage = 'Results_ tideDataDB.tideData.json';
    console.log(`Attempting to download file from Storage: ${bucketName}/${filePathInStorage}`);
    const { data: fileData, error: downloadError } = await supabaseClient.storage.from(bucketName).download(filePathInStorage);
    if (downloadError) {
      console.error('Error downloading file from Storage:', downloadError);
      throw new Error(`Storage Download Error: ${downloadError.message}`);
    }
    if (!fileData) {
      throw new Error('Downloaded file data is null.');
    }
    const jsonContent = await fileData.text();
    const rawData = JSON.parse(jsonContent);
    const dataToInsert = [];
    for (const entry of rawData){
      const locationCode = entry.location?.code;
      const locationName = entry.location?.name;
      const tideDataArray = entry.tideData;
      if (!locationCode || !locationName || !tideDataArray) {
        console.warn('Skipping entry due to missing location or tideData:', entry);
        continue;
      }
      for (const tideItem of tideDataArray){
        const obsDate = tideItem.date;
        const obsPostName = tideItem.data?.obsPostName;
        const rawObsLon = tideItem.data?.obsLon;
        const rawObsLat = tideItem.data?.obsLat;
        // Validate and parse obsLon, obsLat
        const obsLon = !isNaN(parseFloat(rawObsLon)) ? parseFloat(rawObsLon) : null;
        const obsLat = !isNaN(parseFloat(rawObsLat)) ? parseFloat(rawObsLat) : null;
        if (!obsDate || !obsPostName || obsLon === null || obsLat === null) {
          console.warn('Skipping tideItem due to missing or invalid essential data (date, postName, lon, lat):', tideItem);
          continue;
        }
        const now = new Date();
        const updatedAt = now.toISOString();
        const updatedAtKr = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
        const lvl1 = tideItem.data?.lvl1 || null;
        const lvl2 = tideItem.data?.lvl2 || null;
        const lvl3 = tideItem.data?.lvl3 || null;
        const lvl4 = tideItem.data?.lvl4 || null;
        dataToInsert.push({
          location_code: locationCode,
          location_name: locationName,
          obs_date: obsDate,
          obs_post_name: obsPostName,
          obs_lon: obsLon,
          obs_lat: obsLat,
          lvl1: lvl1,
          lvl2: lvl2,
          lvl3: lvl3,
          lvl4: lvl4,
          updated_at: updatedAt,
          updated_at_kr: updatedAtKr
        });
      }
    }
    console.log(`Prepared ${dataToInsert.length} records for insertion.`);
    const batchSize = 1000; // Adjust batch size as needed
    for(let i = 0; i < dataToInsert.length; i += batchSize){
      const batch = dataToInsert.slice(i, i + batchSize);
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataToInsert.length / batchSize)} with ${batch.length} records...`);
      const { error: dbError } = await supabaseClient.from('tide_data').upsert(batch, {
        onConflict: 'obs_date,obs_post_name'
      });
      if (dbError) {
        console.error('Supabase upsert error:', dbError);
        throw new Error(`Database Error: ${dbError.message}`);
      }
    }
    console.log('Tide data import process finished successfully.');
  } catch (err) {
    console.error('An error occurred during tide data import:', err.message);
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Initiate the import process in the background
  const timer = setTimeout(importTideData, 0);
  Deno.unrefTimer(timer);
  return new Response(JSON.stringify({
    message: "Tide data import process initiated in the background."
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status: 202
  });
});
