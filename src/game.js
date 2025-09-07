// File: src/game.js - Updated with length-based boost and debug keys
import { CONFIG } from './config.js';
import { Snake } from './snake.js';
import { PelletManager } from './pellets.js';
import { Vector2D, InputHandler, MathUtils } from './utils.js';

export class Game {
  constructor(canvas) {
    console.log('🎮 Game constructor starting...');
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Camera system
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetX: 0,
      targetY: 0,
      targetZoom: 1
    };
    
    // Create input handler AFTER camera is defined
    this.inputHandler = new InputHandler(canvas, this.camera);
    
    // Game state
    this.isRunning = false;
    this.lastTime = 0;
    this.gameStartTime = 0;
    this.debugFrameCount = 0;
    
    // Debug options
    this.showTrail = false;
    this.showDebugInfo = true;
    this.showMouseDebug = false;
    
    console.log('🎮 Game constructor - initializing game...');
    
    // Initialize game objects
    this.initializeGame();
    
    // Setup debug controls
    this.setupDebugControls();
    
    console.log('🎮 Game constructor complete!');
  }
  
  initializeGame() {
    console.log('🎮 Initializing game...');
    
    // Create player snake at center of world
    const startX = CONFIG.WORLD.WIDTH / 2;
    const startY = CONFIG.WORLD.HEIGHT / 2;
    
    console.log('🐍 Creating snake at:', startX, startY);
    this.playerSnake = new Snake(startX, startY, 0);
    
    console.log('🐍 Snake created with length-based boost system');
    
    // Create pellet manager
    console.log('🍎 Creating pellet manager...');
    this.pelletManager = new PelletManager(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);
    
    // Initialize camera
    this.camera.x = startX;
    this.camera.y = startY;
    this.camera.targetX = startX;
    this.camera.targetY = startY;
    this.updateCameraZoom();
    
    console.log('🎮 Game initialization complete!');
  }
  
  setupDebugControls() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyT':
          this.showTrail = !this.showTrail;
          console.log('Trail debug:', this.showTrail);
          break;
        case 'KeyI':
          this.showDebugInfo = !this.showDebugInfo;
          break;
        case 'KeyM':
          this.showMouseDebug = !this.showMouseDebug;
          console.log('Mouse debug:', this.showMouseDebug);
          break;
        case 'KeyR':
          this.restart();
          break;
        // NEW: Debug key to add length for testing boost system
        case 'KeyL':
          if (CONFIG.DEBUG.ENABLE_DEBUG_KEYS && this.playerSnake) {
            this.playerSnake.debugAddLength();
            console.log('🧪 DEBUG: Added length! New length:', this.playerSnake.length);
          }
          break;
        // NEW: Debug key to test low length warning
        case 'KeyK':
          if (CONFIG.DEBUG.ENABLE_DEBUG_KEYS && this.playerSnake) {
            this.playerSnake.length = Math.max(3, this.playerSnake.length - 3);
            console.log('🧪 DEBUG: Reduced length! New length:', this.playerSnake.length);
          }
          break;
      }
    });
  }
  
  start() {
    console.log('🎮 Starting game...');
    this.isRunning = true;
    this.gameStartTime = performance.now();
    this.lastTime = this.gameStartTime;
    this.gameLoop();
  }
  
  gameLoop = () => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30);
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame(this.gameLoop);
  };
  
  update(deltaTime) {
    if (!this.playerSnake || !this.playerSnake.isAlive) return;
    
    this.debugFrameCount++;
    
    // Update input handler with current camera
    this.inputHandler.updateCamera(this.camera);
    
    // Get input
    const movement = this.inputHandler.getMovementInput(this.playerSnake.position);
    const boost = this.inputHandler.isBoostPressed();
    
    // Update snake with new boost system
    this.playerSnake.update(deltaTime, movement, boost);
    
    // Check world boundaries
    this.checkWorldBoundaries();
    
    // Update pellets
    this.pelletManager.update(deltaTime);
    
    // Check pellet collisions
    const headRadius = this.playerSnake.headRadius;
    const magnetRadius = CONFIG.PHYSICS.MAGNET_RADIUS;
    const totalPickupRadius = headRadius + magnetRadius;
    
    const collectedPellets = [];
    for (const pellet of this.pelletManager.pellets) {
      if (!pellet.isCollected) {
        const distance = this.playerSnake.position.distanceTo(pellet.position);
        if (distance <= totalPickupRadius) {
          pellet.collect();
          collectedPellets.push(pellet);
          console.log(`✅ COLLECTED PELLET! Distance: ${distance.toFixed(1)}`);
        }
      }
    }
    
    // Grow snake for collected pellets
    for (const pellet of collectedPellets) {
      this.playerSnake.grow(pellet.value);
    }
    
    // Update camera with new boost zoom system
    this.updateCamera(deltaTime);
    
    // Update HUD
    this.updateHUD();
  }
  
  checkWorldBoundaries() {
    const pos = this.playerSnake.position;
    const margin = 50;
    
    if (pos.x < -margin || pos.x > CONFIG.WORLD.WIDTH + margin ||
        pos.y < -margin || pos.y > CONFIG.WORLD.HEIGHT + margin) {
      this.playerSnake.die();
      console.log('Snake went out of bounds!');
    }
  }
  
  updateCamera(deltaTime) {
    this.camera.targetX = this.playerSnake.position.x;
    this.camera.targetY = this.playerSnake.position.y;
    
    this.updateCameraZoom();
    
    const smoothFactor = CONFIG.CAMERA.SMOOTH_FACTOR;
    this.camera.x += (this.camera.targetX - this.camera.x) * smoothFactor;
    this.camera.y += (this.camera.targetY - this.camera.y) * smoothFactor;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * smoothFactor;
  }
  
  updateCameraZoom() {
    // NEW: Extreme diminishing returns camera zoom for MASSIVE snakes
    const lengthDiff = Math.max(0, this.playerSnake.length - 5);
    
    let zoomOutFactor;
    if (lengthDiff > 1000) {
      // Extreme diminishing returns for mega snakes - tiny changes after 1000
      zoomOutFactor = 0.25 + Math.log(lengthDiff / 1000) * 0.02; // Very small increases
    } else if (lengthDiff > 100) {
      // Strong diminishing returns for large snakes
      zoomOutFactor = 0.1 + Math.log(lengthDiff / 100) * 0.15;
    } else {
      // Normal scaling for smaller snakes
      zoomOutFactor = lengthDiff * 0.001;
    }
    
    let baseZoom = CONFIG.CAMERA.BASE_ZOOM - zoomOutFactor;
    
    // Set reasonable zoom limits
    baseZoom = Math.max(0.15, Math.min(baseZoom, CONFIG.CAMERA.BASE_ZOOM)); // Never zoom out beyond 0.15
    
    // NEW: Boost zooms IN (reduces vision, increases risk)
    if (this.playerSnake.isBoosting) {
      baseZoom *= CONFIG.CAMERA.BOOST_ZOOM_FACTOR; // Multiply to zoom IN
    }
    
    this.camera.targetZoom = baseZoom;
    
    console.log(`📷 Camera zoom: ${baseZoom.toFixed(3)} (length: ${this.playerSnake.length}, zoomOut: ${zoomOutFactor.toFixed(4)})`);
  }
  
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Save context for world rendering
    this.ctx.save();
    
    // Apply camera transform
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    
    // Draw world grid
    this.drawGrid();
    
    // Draw pellets
    this.pelletManager.draw(this.ctx, this.camera);
    
    // Draw snake trail (debug)
    if (this.showTrail) {
      this.playerSnake.drawTrail(this.ctx, this.camera);
    }
    
    // Draw snake
    this.playerSnake.draw(this.ctx, this.camera);
    
    // Mouse debug indicators
    if (this.showMouseDebug) {
      this.drawMouseDebug();
      
      // Show pellet pickup radius
      const pickupRadius = this.playerSnake.headRadius + CONFIG.PHYSICS.MAGNET_RADIUS;
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(this.playerSnake.position.x, this.playerSnake.position.y, pickupRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    // Restore context
    this.ctx.restore();
    
    // Draw UI overlay
    this.drawUI();
  }
  
  drawMouseDebug() {
    const mouseWorld = this.inputHandler.getWorldMousePosition();
    
    // Draw mouse cursor in world
    this.ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(mouseWorld.x, mouseWorld.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw line from snake to mouse
    const direction = this.inputHandler.getMouseDirection(this.playerSnake.position);
    if (direction) {
      this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.playerSnake.position.x, this.playerSnake.position.y);
      this.ctx.lineTo(mouseWorld.x, mouseWorld.y);
      this.ctx.stroke();
    }
    
    // Draw deadzone circle
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.playerSnake.position.x, this.playerSnake.position.y, 30, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  drawGrid() {
    const gridSize = 100;
    
    const viewWidth = this.canvas.width / this.camera.zoom;
    const viewHeight = this.canvas.height / this.camera.zoom;
    const viewLeft = this.camera.x - viewWidth / 2;
    const viewTop = this.camera.y - viewHeight / 2;
    const viewRight = this.camera.x + viewWidth / 2;
    const viewBottom = this.camera.y + viewHeight / 2;
    
    const startX = Math.floor(viewLeft / gridSize) * gridSize;
    const startY = Math.floor(viewTop / gridSize) * gridSize;
    const endX = Math.ceil(viewRight / gridSize) * gridSize;
    const endY = Math.ceil(viewBottom / gridSize) * gridSize;
    
    const lineWidth = Math.max(1, 2 / this.camera.zoom);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = lineWidth;
    
    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }
  
  drawUI() {
    if (!this.showDebugInfo) return;
    
    this.ctx.fillStyle = '#00ff88';
    this.ctx.font = '12px monospace';
    
    const mouseWorld = this.inputHandler.getWorldMousePosition();
    
    const debugInfo = [
      `FPS: ${Math.round(1000 / (performance.now() - this.lastTime))}`,
      `Snake: ${Math.round(this.playerSnake.position.x)}, ${Math.round(this.playerSnake.position.y)}`,
      `Mouse: ${Math.round(mouseWorld.x)}, ${Math.round(mouseWorld.y)}`,
      `Length: ${this.playerSnake.length.toFixed(1)} | Value: ${Math.round(this.playerSnake.score)}`,
      `Speed: ${this.playerSnake.speed.toFixed(1)} | Zoom: ${this.camera.zoom.toFixed(2)}`,
      `Boost: ${this.playerSnake.isBoosting ? 'ON' : 'OFF'} | Burned: ${this.playerSnake.lengthBurned.toFixed(1)}`,
      ``,
      `Controls:`,
      `Mouse: Always follows cursor`,
      `WASD/Arrows: Override mouse`,
      `Click/Space: Boost (uses length)`,
      `L: Add length (+10) | B: Big boost (+25)`,
      `K: Remove length (debug)`,
      `T: Trail debug | M: Mouse debug`,
      `I: Toggle info | R: Restart`
    ];
    
    for (let i = 0; i < debugInfo.length; i++) {
      this.ctx.fillText(debugInfo[i], 10, this.canvas.height - 20 - (debugInfo.length - i - 1) * 15);
    }
    
    if (!this.playerSnake.isAlive) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#ff4444';
      this.ctx.font = '48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px monospace';
      this.ctx.fillText(`Final Length: ${this.playerSnake.length.toFixed(1)}`, this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.fillText(`Value: ${this.playerSnake.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
      this.ctx.fillText(`Length Burned: ${this.playerSnake.lengthBurned.toFixed(1)}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
      this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
      
      this.ctx.textAlign = 'left';
    }
    
    // NEW: Boost system feedback
    if (this.playerSnake.isBoosting) {
      this.ctx.fillStyle = 'rgba(255, 68, 68, 0.8)';
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🚀 BOOSTING - BURNING LENGTH', this.canvas.width / 2, 50);
      this.ctx.textAlign = 'left';
    }
    
    // NEW: Low length warning
    if (this.playerSnake.length < CONFIG.BOOST.MIN_LENGTH_TO_BOOST + 2) {
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      this.ctx.font = '14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚠️ LOW LENGTH - BOOST DISABLED', this.canvas.width / 2, 70);
      this.ctx.textAlign = 'left';
    }
  }
  
  updateHUD() {
    // Update the debug HUD elements (top-left corner)
    const lengthElement = document.getElementById('length');
    const scoreElement = document.getElementById('score');
    const speedElement = document.getElementById('speed');
    
    if (lengthElement) lengthElement.textContent = this.playerSnake.length.toFixed(1);
    if (scoreElement) scoreElement.textContent = Math.round(this.playerSnake.score).toString();
    if (speedElement) speedElement.textContent = this.playerSnake.speed.toFixed(1);
    
    // Also update the game HUD (green HUD) if the UI system is available
    if (window.gameUI && typeof window.gameUI.updateGameHUD === 'function') {
      window.gameUI.updateGameHUD();
    }
  }
  
  restart() {
    console.log('🎮 Restarting game...');
    this.isRunning = false;
    this.initializeGame();
    this.debugFrameCount = 0;
    this.isRunning = true;
    this.gameStartTime = performance.now();
    this.lastTime = this.gameStartTime;
    console.log('🎮 Game restarted!');
  }
  
  stop() {
    this.isRunning = false;
  }
  
  getPlayerSnake() {
    return this.playerSnake;
  }
  
  getCamera() {
    return this.camera;
  }
}