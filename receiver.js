const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

function sendCacLog(message) {
  // ... (sendCacLog 函數與之前相同)
  try {
    const logPayload = {
      timestamp: new Date().toLocaleTimeString(),
      level: 'LOG',
      message: message,
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
  } catch (e) { console.error("sendCacLog failed:", e); }
}

sendCacLog('Receiver: Script Loaded (Simple DRM Test).');

try {
  context.onSenderConnected = (event) => {
    sendCacLog('Receiver: Event - Sender Connected.');
  };

  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    sendCacLog('Receiver: setMediaPlaybackInfoHandler START');
    const media = loadRequestData.media;
    if (media && media.contentId) {
        sendCacLog('Receiver: Handler - Content ID: ' + media.contentId);
        if (media.customData && media.customData.drm) {
          const drmConfig = media.customData.drm;
          if (drmConfig.protectionSystem === 'widevine' && drmConfig.licenseUrl) {
            sendCacLog('Receiver: Handler - APPLYING Widevine.');
            playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
            playbackConfig.licenseUrl = drmConfig.licenseUrl;
             playbackConfig.shakaPlayerConfig = {
              drm: { servers: { 'com.widevine.alpha': playbackConfig.licenseUrl } }
            };
          } else { sendCacLog('Receiver: Handler - Invalid customData.drm.'); }
        } else { sendCacLog('Receiver: Handler - NO DRM config in customData.'); }
    } else { sendCacLog('Receiver: Handler - No media or contentId.'); }
    sendCacLog('Receiver: setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });

  playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
    sendCacLog('Receiver: Player Event - ERROR: ' + JSON.stringify(event));
  });
  playerManager.addEventListener(cast.framework.events.EventType.PLAYING, (event) => {
    sendCacLog('Receiver: Player Event - PLAYING');
  });
   playerManager.addEventListener(cast.framework.events.EventType.LOAD_START, (event) => {
    sendCacLog('Receiver: Player Event - LOAD_START for contentId: ' + playerManager.getMediaInformation().contentId);
  });

  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  sendCacLog('Receiver: FATAL ERROR during setup: ' + err.message);
}
