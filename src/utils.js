// File: src/utils.js

// Vector2D utility class
export class Vector2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  static fromAngle(angle, magnitude = 1) {
    return new Vector2D(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }
  
  add(other) {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }
  
  subtract(other) {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }
  
  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }
  
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / mag, this.y / mag);
  }
  
  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Get angle of this vector
  angle() {
    return Math.atan2(this.y, this.x);
  }
}

// Interpolation utilities
export class Interpolation {
  // Linear interpolation between two points
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  // Linear interpolation between two Vector2D points
  static lerpVector(a, b, t) {
    return new Vector2D(
      this.lerp(a.x, b.x, t),
      this.lerp(a.y, b.y, t)
    );
  }
  
  // Find position along trail at specific distance from head
  static getPositionAtDistance(trail, targetDistance) {
    if (trail.length < 2) {
      return trail[0]?.position || new Vector2D(0, 0);
    }
    
    // Find the two trail points that bracket our target distance
    for (let i = 0; i < trail.length - 1; i++) {
      const current = trail[i];
      const next = trail[i + 1];
      
      if (targetDistance >= next.cumulativeDistance && targetDistance <= current.cumulativeDistance) {
        // Interpolate between these two points
        const segmentLength = current.cumulativeDistance - next.cumulativeDistance;
        if (segmentLength === 0) return current.position;
        
        const t = (targetDistance - next.cumulativeDistance) / segmentLength;
        return this.lerpVector(next.position, current.position, t);
      }
    }
    
    // If we're beyond the trail, return the last point
    return trail[trail.length - 1]?.position || new Vector2D(0, 0);
  }
}

// SIMPLE Input handling - NO CONFIG DEPENDENCIES
export class InputHandler {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.keys = new Set();
    
    // Mouse/touch state
    this.mousePos = new Vector2D(0, 0);
    this.worldMousePos = new Vector2D(0, 0);
    this.isMousePressed = false;
    this.isTouching = false;
    
    console.log('🎮 InputHandler created');
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault();
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      e.preventDefault();
    });
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMousePressed = true;
      this.updateMousePosition(e);
      console.log('🖱️ Mouse pressed');
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      this.isMousePressed = false;
      console.log('🖱️ Mouse released');
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mouseleave', (e) => {
      this.isMousePressed = false;
    });
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      this.isTouching = true;
      this.updateTouchPosition(e);
      e.preventDefault();
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      this.isTouching = false;
      e.preventDefault();
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      this.updateTouchPosition(e);
      e.preventDefault();
    });
    
    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    console.log('🎮 Event listeners set up');
  }
  
  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = new Vector2D(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    this.updateWorldMousePosition();
  }
  
  updateTouchPosition(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mousePos = new Vector2D(
        touch.clientX - rect.left,
        touch.clientY - rect.top
      );
      this.updateWorldMousePosition();
    }
  }
  
  updateWorldMousePosition() {
    // Convert screen coordinates to world coordinates
    const screenCenter = new Vector2D(this.canvas.width / 2, this.canvas.height / 2);
    const mouseFromCenter = this.mousePos.subtract(screenCenter);
    const worldOffset = mouseFromCenter.multiply(1 / this.camera.zoom);
    this.worldMousePos = new Vector2D(this.camera.x, this.camera.y).add(worldOffset);
  }
  
  // Get movement input from keyboard
  getKeyboardMovement() {
    const movement = new Vector2D(0, 0);
    
    // WASD or Arrow keys
    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
      movement.y -= 1;
    }
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
      movement.y += 1;
    }
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
      movement.x -= 1;
    }
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
      movement.x += 1;
    }
    
    return movement.normalize();
  }
  
  // Get target direction from mouse (ALWAYS ACTIVE)
  getMouseDirection(snakePosition) {
    // Calculate direction from snake to mouse
    const direction = this.worldMousePos.subtract(snakePosition);
    const distance = direction.magnitude();
    
    // Dead zone - ignore mouse input if too close to snake
    if (distance < 30) {  // Fixed 30px deadzone
      return null;
    }
    
    return direction.normalize();
  }
  
  // Combined movement input - ALWAYS RETURN SOMETHING
  getMovementInput(snakePosition) {
    // Check keyboard first (keyboard takes priority)
    const keyboardMovement = this.getKeyboardMovement();
    if (keyboardMovement.magnitude() > 0) {
      console.log('🎮 Using keyboard input');
      return keyboardMovement;
    }
    
    // Try mouse direction
    const mouseDirection = this.getMouseDirection(snakePosition);
    if (mouseDirection) {
      console.log('🎮 Using mouse input');
      return mouseDirection;
    }
    
    // NO INPUT - return small forward movement so snake doesn't stop
    console.log('🎮 No input - default forward');
    return new Vector2D(1, 0);
  }
  
  isKeyPressed(key) {
    return this.keys.has(key);
  }
  
  isBoostPressed() {
    const boosting = this.isKeyPressed('Space') || this.isMousePressed || this.isTouching;
    if (boosting) {
      console.log('🚀 Boost pressed!');
    }
    return boosting;
  }
  
  getMousePosition() {
    return this.mousePos;
  }
  
  getWorldMousePosition() {
    return this.worldMousePos;
  }
  
  // Update camera reference
  updateCamera(camera) {
    this.camera = camera;
    this.updateWorldMousePosition();
  }
}

// Random utilities
export class Random {
  static range(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  static int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  
  static choice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  static vector(minX, maxX, minY, maxY) {
    return new Vector2D(
      this.range(minX, maxX),
      this.range(minY, maxY)
    );
  }
}

// Math utilities
export class MathUtils {
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  static wrap(value, min, max) {
    const range = max - min;
    return ((value - min) % range + range) % range + min;
  }
  
  static angleDifference(a, b) {
    const diff = b - a;
    return Math.atan2(Math.sin(diff), Math.cos(diff));
  }
}