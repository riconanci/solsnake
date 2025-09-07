// File: src/config.js - Updated with length-based boost
export const CONFIG = {
  // Solana integration (Phase 3)
  SOLANA_RPC: "https://api.devnet.solana.com", // devnet for testing
  TOKEN_MINT: "<PUMP_FUN_TOKEN_MINT>",
  TREASURY_ADDRESS: "<TREASURY_WALLET>",
  BUYIN_AMOUNT_TOKENS: 5,
  
  // Kill reward distribution (Phase 4) - tokens as PRIZES not fuel
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
  
  // NEW: Length-based boost system
  BOOST: {
    LENGTH_COST_PER_SECOND: 0.7,        // Increased by 30% (0.5 * 1.3 = 0.65, rounded up to 0.7)
    MIN_LENGTH_TO_BOOST: 5,             // Changed to 5 (starting length)
    CAMERA_ZOOM_IN_FACTOR: 1.4,         // Camera zooms IN when boosting (less vision)
    LENGTH_BURN_RATE: 2.0               // How fast length burns during boost (updates per second)
  },
  
  // Camera settings (Phase 1) - UPDATED for boost zoom in
  CAMERA: {
    BASE_ZOOM: 0.6,          // Good starting zoom
    ZOOM_PER_LENGTH: 0.01,   // Gradual zoom out as snake grows
    MAX_ZOOM_OUT: 0.2,       // Don't zoom out too far
    BOOST_ZOOM_FACTOR: 1.4,  // BOOST ZOOMS IN (less vision, more risk)
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
  },
  
  // DEBUG/TESTING keys
  DEBUG: {
    ENABLE_DEBUG_KEYS: true,     // Enable debug keys in development
    LENGTH_BOOST_AMOUNT: 10,     // How much length to add when pressing L key (increased from 5)
    BIG_LENGTH_BOOST: 25         // Big length boost for testing large snakes
  }
};