/**
 * 找找台灣鏡頭君 — Cloudflare Worker API 中介層
 * 用於在邊緣網路處理 CORS 跨網域請求並代理轉發至 Google Apps Script Web App
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };

    // 處理 OPTIONS 預檢請求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // 健康檢查端點
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Taiwan Live Cam Explorer Cloudflare Edge Proxy',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 僅處理 /api/checkin POST 請求
    if (url.pathname === '/api/checkin' && request.method === 'POST') {
      try {
        const payload = await request.json();

        // 檢查環境變數中的 GAS URL
        const gasUrl = env.GAS_WEBHOOK_URL;
        if (!gasUrl) {
          return new Response(
            JSON.stringify({
              success: false,
              verified: false,
              error: 'Cloudflare Worker 未設定 GAS_WEBHOOK_URL 環境變數。',
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // 發送至 Google Apps Script 並自動處理 302 重新導向
        const gasResponse = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });

        const gasResultText = await gasResponse.text();

        return new Response(gasResultText, {
          status: gasResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Edge Worker 轉發錯誤: ' + err.message,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};
