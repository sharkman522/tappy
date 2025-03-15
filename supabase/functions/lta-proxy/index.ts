// Follow this Deno implementation guide: https://deno.com/deploy/docs/hello-world

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestParams {
  endpoint: string;
  method: string;
  params?: Record<string, string>;
}

const LTA_API_URL = Deno.env.get("LTA_API_URL") || "https://datamall2.mytransport.sg/ltaodataservice";
const LTA_API_KEY = "b2d1c0c5484579307d9d4570dad72b77";

serve(async (req) => {
  console.log('[lta-proxy] Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('[lta-proxy] Handling CORS preflight request');
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const requestBody = await req.json();
      console.log('[lta-proxy] Request body:', JSON.stringify(requestBody));
      
      const { endpoint, method, params = {} } = requestBody as RequestParams;
      console.log(`[lta-proxy] Processing request for endpoint: ${endpoint}, method: ${method}`);
      console.log('[lta-proxy] Request params:', params);
      
      // Validate endpoint to prevent arbitrary API calls
      const validEndpoints = [
        "BusStops", 
        "BusServices", 
        "BusRoutes", 
        "v3/BusArrival"
      ];
      
      if (!validEndpoints.includes(endpoint)) {
        console.error(`[lta-proxy] Invalid endpoint requested: ${endpoint}`);
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log(`[lta-proxy] Endpoint ${endpoint} validated successfully`);

      // Build URL with query parameters
      let url = `${LTA_API_URL}/${endpoint}`;
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
      }
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      console.log({url})

      // Make request to LTA API
      const response = await fetch(url, {
        method: method || "GET",
        headers: {
          "AccountKey": "Gu215Gq6T2aTP4pPR4WvHQ==",
          "Accept": "application/json"
        }
      });

      // Check if the response is successful
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        return new Response(
          JSON.stringify({ 
            error: "API request failed", 
            status: response.status,
            statusText: response.statusText 
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // Check if response is empty
      const responseText = await response.text();
      if (!responseText) {
        return new Response(
          JSON.stringify({ error: "Empty response from API" }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // Parse JSON safely
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        const parseError = error as Error;
        console.error("JSON parsing error:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Invalid JSON response from API", 
            details: parseError.message,
            responseText: responseText.substring(0, 100) // Include part of the response for debugging
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      // Return response from LTA API
      return new Response(
        JSON.stringify(data),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});