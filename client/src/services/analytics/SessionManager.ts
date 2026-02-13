import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'analytics_session_id';
const SESSION_START_KEY = 'analytics_session_start';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Manage analytics session with timeout handling
 */
export class SessionManager {
  private sessionId: string;
  private sessionStart: number;

  constructor() {
    this.sessionId = this.initializeSession();
    this.sessionStart = this.getSessionStart();
    this.setupHeartbeat();
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    // Check if session expired
    if (this.isSessionExpired()) {
      this.createNewSession();
    }

    return this.sessionId;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStart) / 1000);
  }

  /**
   * End current session and create new one
   */
  endSession(): void {
    this.createNewSession();
  }

  /**
   * Initialize session from storage or create new
   */
  private initializeSession(): string {
    const stored = sessionStorage.getItem(SESSION_KEY);

    if (stored && !this.isSessionExpired()) {
      return stored;
    }

    return this.createNewSession();
  }

  /**
   * Create a new session
   */
  private createNewSession(): string {
    const newSessionId = uuidv4();
    const now = Date.now();

    sessionStorage.setItem(SESSION_KEY, newSessionId);
    sessionStorage.setItem(SESSION_START_KEY, now.toString());

    this.sessionId = newSessionId;
    this.sessionStart = now;

    return newSessionId;
  }

  /**
   * Get session start timestamp
   */
  private getSessionStart(): number {
    const stored = sessionStorage.getItem(SESSION_START_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  }

  /**
   * Check if current session has expired
   */
  private isSessionExpired(): boolean {
    const stored = sessionStorage.getItem(SESSION_START_KEY);

    if (!stored) {
      return true;
    }

    const sessionStart = parseInt(stored, 10);
    const elapsed = Date.now() - sessionStart;

    return elapsed > SESSION_TIMEOUT;
  }

  /**
   * Setup heartbeat to update session timestamp
   */
  private setupHeartbeat(): void {
    // Update session activity on user interaction
    const updateActivity = () => {
      if (!this.isSessionExpired()) {
        sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
      }
    };

    // Listen to user activity events
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Periodic heartbeat every 5 minutes
    setInterval(() => {
      if (!this.isSessionExpired()) {
        updateActivity();
      } else {
        this.createNewSession();
      }
    }, 5 * 60 * 1000);
  }
}
