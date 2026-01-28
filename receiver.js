const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
  const media = loadRequestData.media;

  if (media && media.customData && media.customData.drm) {
    const drmConfig = media.customData.drm;

    if (drmConfig.protectionSystem === 'widevine' && drmConfig.licenseUrl) {
      console.log('Receiver: Applying Widevine DRM from customData');
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      playbackConfig.licenseUrl = drmConfig.licenseUrl;

      playbackConfig.shakaPlayerConfig = playbackConfig.shakaPlayerConfig || {};
      playbackConfig.shakaPlayerConfig.drm = playbackConfig.shakaPlayerConfig.drm || {};
      playbackConfig.shakaPlayerConfig.drm.servers = {
        'com.widevine.alpha': drmConfig.licenseUrl
      };

      // Optional: Add license request handler for tokens/headers if needed
      if (drmConfig.licenseToken) {
           playbackConfig.shakaPlayerConfig.networking = playbackConfig.shakaPlayerConfig.networking || {};
           playbackConfig.shakaPlayerConfig.networking.licenseRequestHandler = (type, request) => {
             if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
               request.headers['Authorization'] = 'Bearer ' + drmConfig.licenseToken;
             }
           };
      }
    } else {
      console.log('Receiver: No or incomplete Widevine DRM info in customData.drm');
    }
  } else {
    console.log('Receiver: No customData.drm found. Assuming clear content.');
  }
  return playbackConfig;
});

// Basic error listener
playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
  console.error('Receiver Player Error:', event);
});

context.start({ disableIdleTimeout: true });
console.log('Receiver: Context Started (Basic DRM)');
