// File: src/config.js
export const CONFIG = {
  // Solana integration (Phase 3)
  SOLANA_RPC: "https://api.devnet.solana.com", // devnet for testing
  TOKEN_MINT: "<PUMP_FUN_TOKEN_MINT>",
  TREASURY_ADDRESS: "<TREASURY_WALLET>",
  BUYIN_AMOUNT_TOKENS: 5,
  
  // Token burn system (Phase 4)
  BURN: {
    BURN_RATE_TOKENS_PER_SEC: 0.2,
    BOOST_CHUNK_SECONDS: 30,
    LOW_CREDIT_WARNING_SECONDS: 5
  },
  
  // Kill reward distribution (Phase 4)
  KILL_SPLIT: {
    KILLER_PERCENT: 0.50,
    TREASURY_PERCENT: 0.25,
    DROPPED_PERCENT: 0.25
  },
  
  // Core physics (Phase 1)
  PHYSICS: {
    BASE_SPEED: 120.0,       // Good visible speed
    BOOST_SPEED_MULTIPLIER: 1.8,
    TURN_RATE: 4.0,          // Fast responsive turning
    SEGMENT_GAP: 14,         // Back to closer segments since no self-collision
    PELLET_VALUE: 1.0,
    MAGNET_RADIUS: 25,       // auto-collect radius
    INITIAL_LENGTH: 5,       // Back to more segments for better visuals
    TRAIL_SAMPLE_RATE: 0.8   // More frequent trail points for smooth curves
  },
  
  // Camera settings (Phase 1) - PROPER GAME VALUES
  CAMERA: {
    BASE_ZOOM: 0.6,          // Good starting zoom
    ZOOM_PER_LENGTH: 0.01,   // Gradual zoom out as snake grows
    MAX_ZOOM_OUT: 0.2,       // Don't zoom out too far
    BOOST_ZOOM_FACTOR: 1.2,  // SMALLER boost zoom to reduce "magnetic" effect
    SMOOTH_FACTOR: 0.15      // Smooth camera follow
  },
  
  // Input settings
  INPUT: {
    MOUSE_CONTROL: true,          // Enable mouse/touch control
    KEYBOARD_CONTROL: true,       // Also keep keyboard
    MOUSE_DEADZONE: 20,          // Minimum distance from snake to register mouse input
    TOUCH_SENSITIVITY: 1.0       // Touch sensitivity multiplier
  },
  
  // UI settings (Phase 2)
  UI: {
    DEFAULT_NAME_FROM_WALLET: true,
    ALLOW_NAME_CHANGE: true,
    SKINS: ["classic", "neon", "gold", "zebra"]
  },
  
  // Game world
  WORLD: {
    WIDTH: 4000,
    HEIGHT: 3000,
    PELLET_COUNT: 100  // Reduced from 200 for less density
  }
};