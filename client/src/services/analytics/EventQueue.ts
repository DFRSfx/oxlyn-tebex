const QUEUE_KEY = 'analytics_event_queue';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

export interface QueuedEvent {
  eventId: string;
  eventType: string;
  sessionId: string;
  userId?: number;
  discordId?: string;
  pageUrl: string;
  packageName?: string;
  deviceType?: string;
  browser?: string;
  eventData?: any;
  timestamp: number;
}

/**
 * Event queue with batching and offline support
 */
export class EventQueue {
  private queue: QueuedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private sendCallback: (events: QueuedEvent[]) => Promise<void>;

  constructor(sendCallback: (events: QueuedEvent[]) => Promise<void>) {
    this.sendCallback = sendCallback;
    this.loadQueue();
    this.setupFlushTimer();
    this.setupOnlineListener();
  }

  /**
   * Add event to queue
   */
  add(event: QueuedEvent): void {
    this.queue.push(event);
    this.saveQueue();// (`[Analytics Queue] Added event. Queue size: ${this.queue.length}/${BATCH_SIZE}`);

    // Check if we should flush
    if (this.queue.length >= BATCH_SIZE) {// ('[Analytics Queue] Batch size reached, flushing...');
      this.flush();
    }

    // Always flush critical events immediately
    if (this.isCriticalEvent(event.eventType)) {// (`[Analytics Queue] Critical event "${event.eventType}", flushing immediately...`);
      this.flush();
    }
  }

  /**
   * Flush all events in queue
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {// ('[Analytics Queue] No events to flush');
      return;
    }

    if (!this.isOnline) {// ('[Analytics Queue] Offline, queuing events for later');
      return;
    }

    const eventsToSend = [...this.queue];
    this.queue = [];
    this.saveQueue();// (`[Analytics Queue] Flushing ${eventsToSend.length} events...`);// ('[Analytics Queue] 📤 Events being sent:', JSON.stringify(eventsToSend, null, 2));

    try {
      await this.sendCallback(eventsToSend);// (`[Analytics Queue] ✅ Successfully sent ${eventsToSend.length} events`);
    } catch (error) {// ('[Analytics Queue] ❌ Failed to send events:', error);
      // Re-add failed events back to queue for retry
      this.queue = [...eventsToSend, ...this.queue];
      this.saveQueue();
    }
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);// (`[Analytics] Loaded ${this.queue.length} events from storage`);
      }
    } catch (error) {// ('[Analytics] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {// ('[Analytics] Failed to save queue:', error);
    }
  }

  /**
   * Setup periodic flush timer
   */
  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_INTERVAL);
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {// ('[Analytics] Online - flushing queue');
      this.isOnline = true;
      this.flush();
    });

    window.addEventListener('offline', () => {// ('[Analytics] Offline - queuing events');
      this.isOnline = false;
    });

    // Flush on page unload (best effort)
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0 && this.isOnline) {
        // Use sendBeacon for reliable sending on unload
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        const apiUrl = `${baseUrl}/analytics/events`;
        const payload = JSON.stringify({ events: this.queue });

        if (navigator.sendBeacon) {
          // Create a Blob with proper Content-Type
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(apiUrl, blob);
        }
      }
    });
  }

  /**
   * Check if event is critical and should be sent immediately
   */
  private isCriticalEvent(eventType: string): boolean {
    const criticalEvents = ['purchase', 'checkout_start', 'error'];
    return criticalEvents.includes(eventType);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}
