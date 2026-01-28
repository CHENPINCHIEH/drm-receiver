// --- Logging for CaC Tool (with Queuing) ---
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];
let contextInstance = null; // Hold context globally

function sendCacLog(message) {
  const logPayload = {
    timestamp: new Date().toLocaleTimeString(),
    level: 'LOG',
    message: message,
  };
  if (contextInstance) {
    const senders = contextInstance.getSenders();
    if (senders && senders.length > 0) {
      senders.forEach(sender => {
        try {
          contextInstance.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload);
        } catch (e) {
          console.error('sendCustomMessage failed:', e);
        }
      });
      return;
    }
  }
  // If no context or no senders, queue it
  window.queuedCacLogs.push(logPayload);
  console.log('Queued CAC Log:', message);
}

function flushQueuedLogs() {
  if (contextInstance && window.queuedCacLogs && window.queuedCacLogs.length > 0) {
    const senders = contextInstance.getSenders();
    if (senders && senders.length > 0) {
      const numQueued = window.queuedCacLogs.length;
      // Send a message that we are about to flush
      const flushMsg = {
          timestamp: new Date().toLocaleTimeString(),
          level: 'LOG',
          message: 'Receiver: Flushing ' + numQueued + ' queued logs.',
      };
      senders.forEach(sender => {
          try {
              contextInstance.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, flushMsg);
          } catch (e) { /* Ignore */ }
      });

      while (window.queuedCacLogs.length > 0) {
        const logPayload = window.queuedCacLogs.shift();
        senders.forEach(sender => {
          try {
            contextInstance.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload);
          } catch (e) {
            console.error('sendCustomMessage failed during flush:', e);
          }
        });
      }
    }
  }
}

sendCacLog('Receiver: Script Top Level Execution START.');
console.log('Receiver: Script Top Level Execution START.');

try {
  sendCacLog('Receiver: Getting CastReceiverContext instance...');
  contextInstance = cast.framework.CastReceiverContext.getInstance();
  if (!contextInstance) {
    sendCacLog('Receiver: ERROR - Failed to get Context Instance');
    throw new Error('Failed to get CastReceiverContext instance');
  }
  sendCacLog('Receiver: Got Context Instance.');

  sendCacLog('Receiver: Getting PlayerManager instance...');
  const playerManager = contextInstance.getPlayerManager();
  if (!playerManager) {
    sendCacLog('Receiver: ERROR - Failed to get PlayerManager Instance');
    throw new Error('Failed to get PlayerManager instance');
  }
  sendCacLog('Receiver: Got PlayerManager Instance.');

  contextInstance.onReady = (event) => {
    sendCacLog('Receiver: Event - Context Ready.');
    console.log('Receiver: Event - Context Ready.', event);
    flushQueuedLogs();
  };
  sendCacLog('Receiver: onReady handler set.');

  contextInstance.onSenderConnected = (event) => {
    sendCacLog('Receiver: Event - Sender Connected: ' + (event ? event.senderId : 'N/A'));
    console.log('Receiver: Event - Sender Connected:', event);
    flushQueuedLogs();
  };
  sendCacLog('Receiver: onSenderConnected handler set.');

  contextInstance.onSenderDisconnected = (event) => {
    sendCacLog('Receiver: Event - Sender Disconnected: ' + (event ? event.senderId : 'N/A'));
    console.log('Receiver: Event - Sender Disconnected:', event);
  };
  sendCacLog('Receiver: onSenderDisconnected handler set.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  const options = new cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = true;
  contextInstance.start(options);
  sendCacLog('Receiver: Context Start() Called.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message + ' | Stack: ' + (err.stack || 'No stack');
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}

sendCacLog('Receiver: Script Top Level Execution END.');
console.log('Receiver: Script Top Level Execution END.');
