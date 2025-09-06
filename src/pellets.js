// File: src/pellets.js
import { CONFIG } from './config.js';
import { Vector2D, Random } from './utils.js';

export class Pellet {
  constructor(x, y, value = 1, color = '#ffaa00') {
    this.position = new Vector2D(x, y);
    this.value = value;
    this.color = color;
    this.baseRadius = 4 + Math.sqrt(value) * 2;
    this.radius = this.baseRadius;
    this.isCollected = false;
    
    // Visual effects
    this.pulseTime = 0;
  }
  
  update(deltaTime) {
    if (this.isCollected) return;
    
    // Pulsing animation
    this.pulseTime += deltaTime * 3;
    this.radius = this.baseRadius + Math.sin(this.pulseTime) * 1.5;
  }
  
  draw(ctx, camera) {
    if (this.isCollected) return; // Don't draw collected pellets
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.radius * 2
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.7, this.color + '80');
    gradient.addColorStop(1, this.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner pellet
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // White center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  checkCollision(position, radius) {
    const distance = this.position.distanceTo(position);
    return distance <= (this.radius + radius);
  }
  
  collect() {
    this.isCollected = true;
  }
}

export class PelletManager {
  constructor(worldWidth, worldHeight, pelletCount = CONFIG.WORLD.PELLET_COUNT) {
    this.pellets = [];
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.targetPelletCount = pelletCount;
    
    this.generateInitialPellets();
  }
  
  generateInitialPellets() {
    for (let i = 0; i < this.targetPelletCount; i++) {
      this.spawnRandomPellet();
    }
  }
  
  spawnRandomPellet() {
    const position = Random.vector(50, this.worldWidth - 50, 50, this.worldHeight - 50);
    const pellet = new Pellet(position.x, position.y);
    this.pellets.push(pellet);
  }
  
  update(deltaTime) {
    // Update all pellets
    for (const pellet of this.pellets) {
      pellet.update(deltaTime);
    }
    
    // Remove collected pellets and spawn new ones
    const beforeCount = this.pellets.length;
    this.pellets = this.pellets.filter(pellet => !pellet.isCollected);
    const removedCount = beforeCount - this.pellets.length;
    
    // Spawn new pellets to replace collected ones
    for (let i = 0; i < removedCount; i++) {
      this.spawnRandomPellet();
    }
  }
  
  draw(ctx, camera) {
    // Draw ALL pellets - no camera culling (this was the bug fix)
    for (const pellet of this.pellets) {
      pellet.draw(ctx, camera);
    }
  }
  
  checkCollisions(snakePosition, collectRadius) {
    const collectedPellets = [];
    
    for (const pellet of this.pellets) {
      if (!pellet.isCollected && pellet.checkCollision(snakePosition, collectRadius)) {
        pellet.collect();
        collectedPellets.push(pellet);
      }
    }
    
    return collectedPellets;
  }
  
  spawnPelletsAlongPath(positions, totalValue) {
    if (positions.length === 0) return;
    
    const pelletsToSpawn = Math.min(20, Math.max(3, Math.floor(totalValue / 5)));
    const valuePerPellet = totalValue / pelletsToSpawn;
    
    for (let i = 0; i < pelletsToSpawn; i++) {
      const pathIndex = Math.floor(Math.random() * positions.length);
      const basePos = positions[pathIndex];
      
      const offset = Random.vector(-20, 20, -20, 20);
      const position = basePos.add(offset);
      
      const pellet = new Pellet(position.x, position.y, valuePerPellet, '#ff6600');
      this.pellets.push(pellet);
    }
  }
}