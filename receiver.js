const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

// --- Logging for CaC Tool ---
function sendCacLog(message) {
  const logPayload = {
    timestamp: new Date().toLocaleTimeString(),
    level: 'LOG',
    message: message,
  };
  const senders = context.getSenders();
  if (senders && senders.length > 0) {
    // Flush queued logs if any
    while (window.queuedCacLogs.length > 0) {
      const queuedPayload = window.queuedCacLogs.shift();
      senders.forEach(sender => {
        try {
          context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload);
        } catch (e) { console.error('sendCacLog flush error:', e); }
      });
    }
    // Send the current message
    senders.forEach(sender => {
      try {
        context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload);
      } catch (e) { console.error('sendCacLog current error:', e); }
    });
  } else {
    window.queuedCacLogs.push(logPayload);
    console.log('Queued CAC Log:', message);
  }
}

sendCacLog('Receiver: Script Loaded (Simplest DRM).');

try {
  context.onSenderConnected = (event) => {
    sendCacLog('Receiver: Event - Sender Connected: ' + (event ? event.senderId : 'N/A'));
  };
  sendCacLog('Receiver: onSenderConnected handler set.');

  // --- MediaPlaybackInfoHandler for DRM ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    sendCacLog('Receiver: setMediaPlaybackInfoHandler START');
    const media = loadRequestData.media;

    if (media && media.customData && media.customData.drm) {
      const drmConfig = media.customData.drm;
      if (drmConfig.protectionSystem === 'widevine' && drmConfig.licenseUrl) {
        sendCacLog('Receiver: Handler - APPLYING Widevine.');
        playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
        playbackConfig.licenseUrl = drmConfig.licenseUrl;
        sendCacLog('Receiver: Handler - License URL: ' + playbackConfig.licenseUrl);

        playbackConfig.shakaPlayerConfig = {
          drm: {
            servers: { 'com.widevine.alpha': playbackConfig.licenseUrl }
          }
        };
      } else {
        sendCacLog('Receiver: Handler - customData.drm present but not valid for Widevine.');
      }
    } else {
      sendCacLog('Receiver: Handler - NO DRM config in customData.');
    }
    sendCacLog('Receiver: setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });
  sendCacLog('Receiver: MediaPlaybackInfoHandler Set.');

  // --- Basic Player Event Listeners ---
  playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
    sendCacLog('Receiver: Player Event - ERROR: ' + JSON.stringify(event));
  });
  playerManager.addEventListener(cast.framework.events.EventType.PLAYING, (event) => {
    sendCacLog('Receiver: Player Event - PLAYING');
  });
  sendCacLog('Receiver: Basic event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
