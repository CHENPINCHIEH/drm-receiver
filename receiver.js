const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// --- Configuration ---
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
const WIDEVINE_LICENSE_SERVER = 'https://cwip-shaka-proxy.appspot.com/no_auth';

// --- Logging for CaC Tool ---
function sendCacLog(message) {
  try {
    const logPayload = {
      timestamp: new Date().toLocaleTimeString(),
      level: 'LOG',
      message: message,
    };
    const senders = context.getSenders();
    if (senders && senders.length > 0) {
      senders.forEach(sender => {
        context.sendCustomMessage('urn:x-cast:com.google.cast.cac', sender.id, logPayload);
      });
    }
  } catch (e) {
    console.error("sendCacLog failed:", e);
  }
}

sendCacLog('Receiver: Script Loaded.');

try {
  sendCacLog('Receiver: Setting up handlers...');

  // --- FIXED MediaPlaybackInfoHandler ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    sendCacLog('Receiver: setMediaPlaybackInfoHandler START');
    try {
      const media = loadRequestData ? loadRequestData.media : null;
      if (!media) {
        sendCacLog('Receiver: Handler WARN - No media object in loadRequestData.');
        return playbackConfig;
      }
      const contentId = media.contentId || 'UNKNOWN';
      sendCacLog('Receiver: Handler - Content ID: ' + contentId);
      sendCacLog('Receiver: Handler - loadRequestData.media: ' + JSON.stringify(media));

      if (contentId === MAIN_DRM_CONTENT_ID) {
        sendCacLog('Receiver: Handler - APPLYING Widevine for MAIN Content.');
        playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
        playbackConfig.licenseUrl = WIDEVINE_LICENSE_SERVER;
      } else {
        sendCacLog('Receiver: Handler - SKIPPING DRM for: ' + contentId);
        playbackConfig.protectionSystem = undefined;
        playbackConfig.licenseUrl = undefined;
      }
      sendCacLog('Receiver: Handler - Returning playbackConfig: ' + JSON.stringify(playbackConfig));
    } catch (e) {
      sendCacLog('Receiver: Handler ERROR: ' + e.message);
      console.error('Handler ERROR:', e);
    }
    sendCacLog('Receiver: setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });
  sendCacLog('Receiver: MediaPlaybackInfoHandler Set.');

  // --- Interceptor to force the test case ---
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('Receiver: LOAD Interceptor START');
      try {
        sendCacLog('Receiver: LOAD Interceptor - Original Request: ' + JSON.stringify(request));
        const media = request.media || new cast.framework.messages.MediaInformation();

        media.contentId = MAIN_DRM_CONTENT_ID;
        media.streamType = cast.framework.messages.StreamType.BUFFERED;
        media.contentType = 'application/dash+xml';
        media.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
        media.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';
        media.stitchedContentTimeline = true;
        media.customData = {};
        request.media = media;

        sendCacLog('Receiver: LOAD Interceptor - Modified Media: ' + JSON.stringify(request.media));
      } catch (e) {
        sendCacLog('Receiver: LOAD Interceptor ERROR: ' + e.message);
        console.error('LOAD Interceptor ERROR:', e);
      }
      sendCacLog('Receiver: LOAD Interceptor END');
      return request;
    }
  );
  sendCacLog('Receiver: LOAD Message Interceptor Set.');

  // --- Player Event Listeners for Debugging ---
  const eventTypes = cast.framework.events.EventType;
  for (const key in eventTypes) {
    const eventType = eventTypes[key];
    playerManager.addEventListener(eventType, (event) => {
      let eventDetail = 'W/O detail';
      try {
        // Avoid circular references in JSON.stringify
        const simpleEvent = {};
        for(const prop in event) {
            if (typeof event[prop] !== 'object') {
                 simpleEvent[prop] = event[prop];
            }
        }
        eventDetail = JSON.stringify(simpleEvent);
      } catch(e) { eventDetail = 'Failed to stringify event'; }
      sendCacLog('Receiver: Player Event - ' + eventType + ' | ' + eventDetail);
    });
  }
  sendCacLog('Receiver: Player event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  const options = new cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = true;
  context.start(options);
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message + ' | Stack: ' + err.stack;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
