
const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// 約定的自訂資料欄位，用於從傳送者傳遞 DRM token
const CUSTOM_DATA_DRM_TOKEN_FIELD = 'widevineToken';

/**
 * 錯誤的 MediaPlaybackInfoHandler
 * 這個處理程式會無差別地將 Widevine DRM 設定應用於所有載入請求，
 * 包括 VMAP 廣告，從而導致問題。
 */
playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
  console.log('setMediaPlaybackInfoHandler triggered for:', loadRequestData.media.contentId);

  // 從自訂資料中取得 DRM Token (模擬)
  const drmToken = loadRequestData.media.customData && loadRequestData.media.customData[CUSTOM_DATA_DRM_TOKEN_FIELD];

  // ***** 錯誤的實作開始 *****
  // 無論是主內容還是廣告，都套用 Widevine DRM 設定
  playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
  playbackConfig.licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';

  // 如果有提供 Token，則加入到授權請求中
  if (drmToken) {
    playbackConfig.licenseRequestHandler = requestInfo => {
      requestInfo.headers = requestInfo.headers || {};
      requestInfo.headers['Authorization'] = 'Bearer ' + drmToken;
      console.log('Widevine license request for:', requestInfo.url);
    };
  } else {
     console.warn('No DRM token provided in customData');
  }
  console.log('Applied Widevine DRM config to:', loadRequestData.media.contentId);
  // ***** 錯誤的實作結束 *****

  /*
  // 正確的實作應該要判斷內容類型
  // 例如，可以依賴 contentId 或 customData 中的標記來區分廣告和主內容
  if (isDrmProtectedMainContent(loadRequestData.media)) {
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      playbackConfig.licenseUrl = 'YOUR_WIDEVINE_LICENSE_URL';
      if (drmToken) {
          playbackConfig.licenseRequestHandler = requestInfo => {
              requestInfo.headers = requestInfo.headers || {};
              requestInfo.headers['Authorization'] = 'Bearer ' + drmToken;
          };
      }
      console.log('Applied Widevine DRM config to MAIN CONTENT:', loadRequestData.media.contentId);
  } else {
      console.log('Skipping DRM config for AD:', loadRequestData.media.contentId);
  }
  */

  return playbackConfig;
});

// 為了方便測試，攔截 LOAD 指令並載入問題場景
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (request) => {
    console.log('LOAD interceptor:', request);

    // 模擬傳送端傳送的媒體資訊
    const mediaInformation = new cast.framework.messages.MediaInformation();
    mediaInformation.contentId = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
    mediaInformation.streamType = cast.framework.messages.StreamType.BUFFERED;
    mediaInformation.contentType = 'application/dash+xml';

    // *** 造成問題的設定 ***
    // 1. VMAP 廣告請求
    mediaInformation.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
    // 使用 Google 提供的測試 VMAP pre-roll
    mediaInformation.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';

    // 2. 廣告拼接時間軸
    mediaInformation.stitchedContentTimeline = true;

    // 3. 模擬 DRM Token
    mediaInformation.customData = {
      [CUSTOM_DATA_DRM_TOKEN_FIELD]: 'YOUR_FAKE_DRM_TOKEN' // 如有需要，替換為有效的測試 token
    };

    // 4. CSAI 類型 (雖然 CAF 可能主要看 vmapAdsRequest)
    mediaInformation.adsType = "CSAI";

    request.media = mediaInformation;
    return request;
  }
);

// 接收器啟動選項
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true; // 測試時防止逾時

context.start(options);
console.log('Cast Receiver Context Started');

/*
// 輔助函數 (用於正確的實作)
function isDrmProtectedMainContent(media) {
    // 這裡需要一個可靠的方法來判斷是否為主要內容
    // 例如，檢查 contentId 是否符合主要內容的模式，或者檢查 customData 中的特定標記
    // 範例：假設所有非廣告 URL 都需要 DRM
    return !media.contentId.includes('googleads.g.doubleclick.net');
}
*/
