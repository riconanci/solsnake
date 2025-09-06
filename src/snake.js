// File: src/snake.js
import { CONFIG } from './config.js';
import { Vector2D, MathUtils } from './utils.js';

export class Snake {
  constructor(startX, startY, startAngle = 0) {
    // Core properties
    this.position = new Vector2D(startX, startY);
    this.angle = startAngle;
    this.length = CONFIG.PHYSICS.INITIAL_LENGTH;
    this.speed = CONFIG.PHYSICS.BASE_SPEED;
    this.isBoosting = false;
    
    // Simple segment system that works
    this.segments = [];
    
    // Visual properties
    this.color = '#00ff88';
    this.headRadius = 12;
    this.bodyRadius = 10;
    
    // Game state
    this.isAlive = true;
    this.score = 0;
    
    console.log('🐍 Simple working snake created');
    
    // Initialize segments
    this.initializeSegments();
  }
  
  initializeSegments() {
    this.segments = [];
    
    // Add head
    this.segments.push({
      position: new Vector2D(this.position.x, this.position.y),
      targetPosition: new Vector2D(this.position.x, this.position.y),
      isHead: true
    });
    
    // Add body segments in a line behind head
    for (let i = 1; i < this.length; i++) {
      const segmentPos = this.position.add(Vector2D.fromAngle(this.angle + Math.PI, i * CONFIG.PHYSICS.SEGMENT_GAP));
      this.segments.push({
        position: new Vector2D(segmentPos.x, segmentPos.y),
        targetPosition: new Vector2D(segmentPos.x, segmentPos.y),
        isHead: false
      });
    }
    
    console.log('🐍 Initialized', this.segments.length, 'segments');
  }
  
  update(deltaTime, turnDirection, boost) {
    if (!this.isAlive) return;
    
    // Update boost state
    this.isBoosting = boost;
    
    // Calculate current speed
    const currentSpeed = this.isBoosting 
      ? this.speed * CONFIG.PHYSICS.BOOST_SPEED_MULTIPLIER 
      : this.speed;
    
    // Update angle based on input
    if (turnDirection.magnitude() > 0.1) {
      const targetAngle = Math.atan2(turnDirection.y, turnDirection.x);
      const angleDiff = MathUtils.angleDifference(this.angle, targetAngle);
      const maxTurn = CONFIG.PHYSICS.TURN_RATE * deltaTime;
      
      if (Math.abs(angleDiff) <= maxTurn) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * maxTurn;
      }
    }
    
    // Move head
    const velocity = Vector2D.fromAngle(this.angle, currentSpeed * deltaTime);
    const newHeadPosition = this.position.add(velocity);
    
    // Update segments with smooth following
    this.updateSegments(newHeadPosition, deltaTime);
    
    // Update head position
    this.position = newHeadPosition;
    this.segments[0].position = this.position;
    this.segments[0].targetPosition = this.position;
  }
  
  updateSegments(newHeadPosition, deltaTime) {
    if (this.segments.length === 0) return;
    
    // Set target positions - each segment targets staying behind the one in front
    for (let i = 1; i < this.segments.length; i++) {
      const currentSegment = this.segments[i];
      const targetSegment = this.segments[i - 1];
      
      // Calculate direction from current segment to target
      const direction = targetSegment.position.subtract(currentSegment.position);
      const distance = direction.magnitude();
      
      // Keep segments at proper distance
      if (distance > CONFIG.PHYSICS.SEGMENT_GAP * 1.2) {
        // Too far, move closer
        const moveDirection = direction.normalize();
        const targetPos = targetSegment.position.subtract(moveDirection.multiply(CONFIG.PHYSICS.SEGMENT_GAP));
        currentSegment.targetPosition = targetPos;
      } else if (distance < CONFIG.PHYSICS.SEGMENT_GAP * 0.8) {
        // Too close, move away
        const moveDirection = direction.normalize();
        const targetPos = targetSegment.position.subtract(moveDirection.multiply(CONFIG.PHYSICS.SEGMENT_GAP));
        currentSegment.targetPosition = targetPos;
      } else {
        // Good distance, small adjustment to follow curves
        const moveDirection = direction.normalize();
        const targetPos = targetSegment.position.subtract(moveDirection.multiply(CONFIG.PHYSICS.SEGMENT_GAP));
        currentSegment.targetPosition = targetPos;
      }
    }
    
    // Move segments toward their targets smoothly
    const baseFollowSpeed = this.speed * 2.0; // Fast following
    const boostMultiplier = this.isBoosting ? CONFIG.PHYSICS.BOOST_SPEED_MULTIPLIER * 1.2 : 1.0;
    const followSpeed = baseFollowSpeed * boostMultiplier;
    
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const direction = segment.targetPosition.subtract(segment.position);
      const distance = direction.magnitude();
      
      if (distance > 0.5) {
        const moveAmount = Math.min(distance, followSpeed * deltaTime);
        const moveDirection = direction.normalize();
        segment.position = segment.position.add(moveDirection.multiply(moveAmount));
      }
    }
  }
  
  grow(amount = 1) {
    const oldLength = this.length;
    this.length += amount;
    this.score += amount * CONFIG.PHYSICS.PELLET_VALUE;
    
    // Update head and body radius based on new length
    const lengthMultiplier = 1 + (this.length - CONFIG.PHYSICS.INITIAL_LENGTH) * 0.02;
    this.headRadius = 12 * lengthMultiplier;
    this.bodyRadius = 10 * lengthMultiplier;
    
    console.log(`🌟 SNAKE GREW! ${oldLength} -> ${this.length} (head radius: ${this.headRadius.toFixed(1)})`);
    
    // Add new segments at the tail
    for (let i = 0; i < amount; i++) {
      if (this.segments.length === 0) {
        // Safety: create head if no segments exist
        this.segments.push({
          position: new Vector2D(this.position.x, this.position.y),
          targetPosition: new Vector2D(this.position.x, this.position.y),
          isHead: true
        });
        continue;
      }
      
      const lastSegment = this.segments[this.segments.length - 1];
      
      // Place new segment behind the last one
      let newPosition;
      if (this.segments.length > 1) {
        // Get direction from second-to-last to last segment
        const prevSegment = this.segments[this.segments.length - 2];
        const direction = lastSegment.position.subtract(prevSegment.position);
        
        if (direction.magnitude() > 0.1) {
          // Extend in the same direction
          const normalizedDirection = direction.normalize();
          newPosition = lastSegment.position.add(normalizedDirection.multiply(CONFIG.PHYSICS.SEGMENT_GAP));
        } else {
          // Fallback: use snake's current angle
          newPosition = lastSegment.position.add(Vector2D.fromAngle(this.angle + Math.PI, CONFIG.PHYSICS.SEGMENT_GAP));
        }
      } else {
        // Only head exists, place first body segment behind it
        newPosition = lastSegment.position.add(Vector2D.fromAngle(this.angle + Math.PI, CONFIG.PHYSICS.SEGMENT_GAP));
      }
      
      // Add the new segment
      this.segments.push({
        position: new Vector2D(newPosition.x, newPosition.y),
        targetPosition: new Vector2D(newPosition.x, newPosition.y),
        isHead: false
      });
    }
    
    console.log(`🐍 Total segments after growth: ${this.segments.length}`);
    
    // Slightly increase speed as snake grows
    this.speed = CONFIG.PHYSICS.BASE_SPEED * (1 + this.length * 0.003);
  }
  
  // Get segment radius with nice tapering AND growth scaling
  getSegmentRadius(segmentIndex) {
    // Base radius scales with snake length
    const lengthMultiplier = 1 + (this.length - CONFIG.PHYSICS.INITIAL_LENGTH) * 0.02;
    const baseHeadRadius = this.headRadius;
    const baseBodyRadius = this.bodyRadius;
    
    if (segmentIndex === 0) {
      return baseHeadRadius;
    } else {
      // Gradual taper toward the tail
      const taperFactor = Math.max(0.7, 1 - (segmentIndex - 1) * 0.03);
      return baseBodyRadius * taperFactor;
    }
  }
  
  // NO SELF COLLISION - slither.io style
  checkSelfCollision() {
    return false;
  }
  
  checkCollisionWithOtherSnake(otherSnake) {
    if (!otherSnake.isAlive || otherSnake === this) return false;
    
    // Check head against other snake's body
    for (const segment of otherSnake.bodySegments) {
      const distance = this.position.distanceTo(segment);
      if (distance < this.headRadius + otherSnake.bodyRadius) {
        return true;
      }
    }
    
    // Check head against other snake's head
    const headDistance = this.position.distanceTo(otherSnake.position);
    if (headDistance < this.headRadius + otherSnake.headRadius) {
      return true;
    }
    
    return false;
  }
  
  die() {
    console.log('💀 Snake died!');
    this.isAlive = false;
  }
  
  // Beautiful rendering with gradient and effects
  draw(ctx, camera) {
    if (!this.isAlive) return;
    
    console.log('🎨 Drawing', this.segments.length, 'segments');
    
    // Draw all segments from tail to head for proper layering
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const segment = this.segments[i];
      const radius = this.getSegmentRadius(i);
      
      if (segment.isHead) {
        // Draw head (brightest)
        ctx.fillStyle = this.isBoosting ? '#ffff00' : '#00ff88';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(segment.position.x, segment.position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw direction indicator
        const directionLength = radius * 2.5;
        const directionEnd = segment.position.add(Vector2D.fromAngle(this.angle, directionLength));
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(segment.position.x, segment.position.y);
        ctx.lineTo(directionEnd.x, directionEnd.y);
        ctx.stroke();
        
      } else {
        // Draw body segment with gradient
        const segmentIndex = i;
        const intensity = 0.4 + (segmentIndex / this.segments.length) * 0.6;
        const green = Math.floor(255 * intensity);
        const fillColor = `rgb(0, ${green}, ${Math.floor(green * 0.6)})`;
        
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(segment.position.x, segment.position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  
  // Debug trail rendering (show segment connections)
  drawTrail(ctx, camera) {
    if (this.segments.length < 2) return;
    
    // Draw lines between segments
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (i === 0) {
        ctx.moveTo(segment.position.x, segment.position.y);
      } else {
        ctx.lineTo(segment.position.x, segment.position.y);
      }
    }
    
    ctx.stroke();
    
    // Draw target positions (red dots)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      ctx.beginPath();
      ctx.arc(segment.targetPosition.x, segment.targetPosition.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Get body segments for external use (excluding head)
  get bodySegments() {
    return this.segments.slice(1).map(seg => seg.position);
  }
  
  getAllPositions() {
    return this.segments.map(seg => seg.position);
  }
  
  getBounds() {
    const positions = this.getAllPositions();
    if (positions.length === 0) {
      return { minX: this.position.x, maxX: this.position.x, minY: this.position.y, maxY: this.position.y };
    }
    
    let minX = positions[0].x;
    let maxX = positions[0].x;
    let minY = positions[0].y;
    let maxY = positions[0].y;
    
    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }
    
    return { minX, maxX, minY, maxY };
  }
}