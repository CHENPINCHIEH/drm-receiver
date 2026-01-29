
// ****** smple test for checking vedio play ****** //
// const context = cast.framework.CastReceiverContext.getInstance();
// const playerManager = context.getPlayerManager();
// const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
// window.queuedCacLogs = window.queuedCacLogs || [];

// // --- CaC Tool Log 工具 (含隊列功能) ---
// function sendCacLog(message) {
//   const logPayload = {
//     timestamp: new Date().toLocaleTimeString(),
//     level: 'LOG',
//     message: "[Receiver] " + message,
//   };
//   const senders = context.getSenders();
//   if (senders && senders.length > 0) {
//     while (window.queuedCacLogs.length > 0) {
//       const queuedPayload = window.queuedCacLogs.shift();
//       senders.forEach(sender => {
//         try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload); } catch (e) { console.error('sendCacLog flush error:', e); }
//       });
//     }
//     senders.forEach(sender => {
//       try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload); } catch (e) { console.error('sendCacLog current error:', e); }
//     });
//   } else {
//     window.queuedCacLogs.push(logPayload);
//     console.log('Queued CAC Log:', message);
//   }
// }

// sendCacLog('Script Loaded');

// try {
//   context.onSenderConnected = (event) => {
//     sendCacLog('Event - Sender Connected: ' + (event ? event.senderId : 'N/A'));
//   };
//   sendCacLog('onSenderConnected handler set.');

//   // --- 攔截所有 LOAD 請求 ---
//   // 不論 CaC Tool 傳送什麼，都強制播放固定的 DRM 影片
//   playerManager.setMessageInterceptor(
//     cast.framework.messages.MessageType.LOAD,
//     (request) => {
//       sendCacLog('LOAD Interceptor START');
//       request.media = {
//         contentId: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
//         contentType: 'application/dash+xml',
//         streamType: 'BUFFERED',
//         title: 'Hardcoded DRM Test'
//       };
//       sendCacLog('LOAD Interceptor - Media forced to Angel One DRM');
//       return request;
//     }
//   );
//   sendCacLog('LOAD Message Interceptor Set.');

//   // --- 固定的 DRM 資訊處理 ---
//   playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
//     sendCacLog('setMediaPlaybackInfoHandler START');
//     const contentId = loadRequestData.media && loadRequestData.media.contentId;
//     sendCacLog('Handler - Content ID: ' + contentId);

//     sendCacLog('Handler - APPLYING Hardcoded Widevine DRM settings.');
//     playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
//     playbackConfig.licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';
//     playbackConfig.shakaPlayerConfig = {
//       drm: {
//         servers: { 'com.widevine.alpha': playbackConfig.licenseUrl }
//       }
//     };
//     sendCacLog('setMediaPlaybackInfoHandler END');
//     return playbackConfig;
//   });
//   sendCacLog('MediaPlaybackInfoHandler Set.');

//   // --- 基本的播放器事件監聽 ---
//   playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
//     sendCacLog('Player Event - ERROR: ' + JSON.stringify(event));
//   });
//   playerManager.addEventListener(cast.framework.events.EventType.PLAYING, (event) => {
//     sendCacLog('Player Event - PLAYING');
//   });
//   playerManager.addEventListener(cast.framework.events.EventType.LOAD_START, (event) => {
//     sendCacLog('Player Event - LOAD_START');
//   });
//   sendCacLog('Basic event listeners added.');

//   // --- 啟動 Receiver ---
//   sendCacLog('Calling context.start()...');
//   context.start({ disableIdleTimeout: true });
//   sendCacLog('Context Started.');

// } catch (err) {
//   const errorMsg = 'FATAL ERROR during setup: ' + err.message;
//   sendCacLog(errorMsg);
//   console.error(errorMsg, err);
// }


// ****** fix version **** //
const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

// --- Configuration ---
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
const WIDEVINE_LICENSE_SERVER = 'https://cwip-shaka-proxy.appspot.com/no_auth';
const TEST_VMAP_AD_TAG = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';

// --- Logging for CaC Tool ---
function sendCacLog(message) {
  const logPayload = {
    timestamp: new Date().toLocaleTimeString(),
    level: 'LOG',
    message: "[Receiver] " + message,
  };
  const senders = context.getSenders();
  if (senders && senders.length > 0) {
    while (window.queuedCacLogs.length > 0) {
      const queuedPayload = window.queuedCacLogs.shift();
      senders.forEach(sender => {
        try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload); } catch (e) { console.error('sendCacLog flush error:', e); }
      });
    }
    senders.forEach(sender => {
      try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload); } catch (e) { console.error('sendCacLog current error:', e); }
    });
  } else {
    window.queuedCacLogs.push(logPayload);
    console.log('Queued CAC Log:', message);
  }
}

sendCacLog('Script Loaded: DRM with VMAP Test');

try {
  context.onSenderConnected = (event) => {
    sendCacLog('Event - Sender Connected');
  };

  // --- Interceptor to force DRM + VMAP + Stitching ---
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('LOAD Interceptor: Forcing DRM + VMAP');
      request.media = {
        contentId: MAIN_DRM_CONTENT_ID,
        contentType: 'application/dash+xml',
        streamType: 'BUFFERED',
        title: 'DRM with VMAP Ad Test',
        vmapAdsRequest: {
          adTagUrl: TEST_VMAP_AD_TAG
        },
      };
      sendCacLog('LOAD Interceptor - Media set: ' + JSON.stringify(request.media));
      return request;
    }
  );
  sendCacLog('LOAD Message Interceptor Set.');

  // --- FIXED MediaPlaybackInfoHandler ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    sendCacLog('setMediaPlaybackInfoHandler START');
    const media = loadRequestData.media;
    const contentId = media && media.contentId ? media.contentId : 'UNKNOWN';
    sendCacLog('Handler - Content ID: ' + contentId);

    // *** THE FIX for b/475285747 ***
    // Only apply DRM if the contentId matches the MAIN DRM content.
    if (contentId === MAIN_DRM_CONTENT_ID) {
      sendCacLog('Handler - APPLYING Widevine for MAIN Content.');
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      playbackConfig.licenseUrl = WIDEVINE_LICENSE_SERVER;
      playbackConfig.shakaPlayerConfig = {
        drm: {
          servers: { 'com.widevine.alpha': WIDEVINE_LICENSE_SERVER }
        }
      };
    } else {
      sendCacLog('Handler - SKIPPING DRM for Ad Content: ' + contentId);
      playbackConfig.protectionSystem = undefined;
      playbackConfig.licenseUrl = undefined;
    }
    sendCacLog('setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });
  sendCacLog('MediaPlaybackInfoHandler Set (Conditional DRM).');

 

  // --- Player Event Listeners ---
  playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
    sendCacLog('Player Event - ERROR: ' + JSON.stringify(event));
  });
  playerManager.addEventListener(cast.framework.events.EventType.PLAYING, (event) => {
    sendCacLog('Player Event - PLAYING');
  });
  playerManager.addEventListener(cast.framework.events.EventType.LOAD_START, (event) => {
    sendCacLog('Player Event - LOAD_START');
  });
  playerManager.addEventListener(cast.framework.events.EventType.BREAK_STARTED, (event) => {
    sendCacLog('Player Event - BREAK_STARTED (Ad is starting)');
  });
  playerManager.addEventListener(cast.framework.events.EventType.BREAK_ENDED, (event) => {
    sendCacLog('Player Event - BREAK_ENDED (Ad finished)');
  });
  sendCacLog('Basic event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Calling context.start()...');
  context.start({ disableIdleTimeout: true });
  sendCacLog('Context Started.');

} catch (err) {
  const errorMsg = 'FATAL ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
