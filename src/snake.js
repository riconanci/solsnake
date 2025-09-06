// File: src/snake.js - Enhanced with proper trail buffer
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
    
    // Trail buffer system - stores exact path the head traveled
    this.trail = [];
    this.maxTrailLength = 1000; // Enough for very long snakes
    
    // Segments positioned along trail at specific distances
    this.segments = [];
    
    // Visual properties
    this.color = '#00ff88';
    this.headRadius = 12;
    this.bodyRadius = 10;
    
    // Game state
    this.isAlive = true;
    this.score = 0;
    
    console.log('🐍 Snake with trail buffer system created');
    
    // Initialize trail and segments
    this.initializeTrailAndSegments();
  }
  
  initializeTrailAndSegments() {
    // Start trail with current position
    this.trail = [{
      position: new Vector2D(this.position.x, this.position.y),
      arcLength: 0
    }];
    
    // Initialize segments at proper distances along the trail
    this.segments = [];
    for (let i = 0; i < this.length; i++) {
      const distance = i * CONFIG.PHYSICS.SEGMENT_GAP;
      const position = this.getPositionAtDistance(distance);
      this.segments.push({
        position: position,
        distance: distance,
        isHead: i === 0
      });
    }
    
    console.log('🐍 Initialized trail buffer with', this.segments.length, 'segments');
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
    
    // Add new position to trail
    this.addToTrail(newHeadPosition);
    
    // Update head position
    this.position = newHeadPosition;
    
    // Update all segments to follow the exact trail path
    this.updateSegmentsAlongTrail();
  }
  
  addToTrail(newPosition) {
    // Calculate distance from last trail point
    const lastTrailPoint = this.trail[0];
    const distance = lastTrailPoint.position.distanceTo(newPosition);
    
    // Only add point if we've moved enough (prevents too many trail points)
    if (distance >= CONFIG.PHYSICS.TRAIL_SAMPLE_RATE) {
      // Add new trail point with cumulative arc length
      const newArcLength = lastTrailPoint.arcLength + distance;
      
      this.trail.unshift({
        position: new Vector2D(newPosition.x, newPosition.y),
        arcLength: newArcLength
      });
      
      // Remove old trail points to prevent memory bloat
      const maxTrailDistance = this.length * CONFIG.PHYSICS.SEGMENT_GAP + 100;
      this.trail = this.trail.filter(point => 
        newArcLength - point.arcLength <= maxTrailDistance
      );
      
      // Keep trail array size reasonable
      if (this.trail.length > this.maxTrailLength) {
        this.trail = this.trail.slice(0, this.maxTrailLength);
      }
    }
  }
  
  updateSegmentsAlongTrail() {
    // Update each segment to be at its proper distance along the trail
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const targetDistance = i * CONFIG.PHYSICS.SEGMENT_GAP;
      
      // Find position along trail at this distance
      const position = this.getPositionAtDistance(targetDistance);
      segment.position = position;
      segment.distance = targetDistance;
    }
  }
  
  getPositionAtDistance(targetDistance) {
    if (this.trail.length === 0) {
      return new Vector2D(this.position.x, this.position.y);
    }
    
    if (this.trail.length === 1) {
      return this.trail[0].position;
    }
    
    // Find the two trail points that bracket our target distance
    const headArcLength = this.trail[0].arcLength;
    const actualTargetDistance = headArcLength - targetDistance;
    
    // If target is at or beyond head, return head position
    if (actualTargetDistance >= headArcLength) {
      return this.trail[0].position;
    }
    
    // If target is beyond tail, return tail position
    if (actualTargetDistance <= this.trail[this.trail.length - 1].arcLength) {
      return this.trail[this.trail.length - 1].position;
    }
    
    // Find the segment in trail that contains our target distance
    for (let i = 0; i < this.trail.length - 1; i++) {
      const currentPoint = this.trail[i];
      const nextPoint = this.trail[i + 1];
      
      if (actualTargetDistance <= currentPoint.arcLength && 
          actualTargetDistance >= nextPoint.arcLength) {
        
        // Interpolate between these two points
        const segmentLength = currentPoint.arcLength - nextPoint.arcLength;
        
        if (segmentLength === 0) {
          return currentPoint.position;
        }
        
        const t = (actualTargetDistance - nextPoint.arcLength) / segmentLength;
        
        return new Vector2D(
          nextPoint.position.x + (currentPoint.position.x - nextPoint.position.x) * t,
          nextPoint.position.y + (currentPoint.position.y - nextPoint.position.y) * t
        );
      }
    }
    
    // Fallback: return last trail position
    return this.trail[this.trail.length - 1].position;
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
      const segmentIndex = this.segments.length;
      const distance = segmentIndex * CONFIG.PHYSICS.SEGMENT_GAP;
      const position = this.getPositionAtDistance(distance);
      
      this.segments.push({
        position: position,
        distance: distance,
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
    
    if (segmentIndex === 0) {
      return this.headRadius;
    } else {
      // Gradual taper toward the tail
      const taperFactor = Math.max(0.7, 1 - (segmentIndex - 1) * 0.03);
      return this.bodyRadius * taperFactor;
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
  
  // Enhanced debug trail rendering
  drawTrail(ctx, camera) {
    if (this.trail.length < 2) return;
    
    // Draw the actual trail path (what the head traveled)
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      if (i === 0) {
        ctx.moveTo(point.position.x, point.position.y);
      } else {
        ctx.lineTo(point.position.x, point.position.y);
      }
    }
    ctx.stroke();
    
    // Draw trail sample points
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    for (const point of this.trail) {
      ctx.beginPath();
      ctx.arc(point.position.x, point.position.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw segment connections to show they follow the trail
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const targetDistance = i * CONFIG.PHYSICS.SEGMENT_GAP;
      const trailPosition = this.getPositionAtDistance(targetDistance);
      
      // Draw line from segment to its trail position
      ctx.beginPath();
      ctx.moveTo(segment.position.x, segment.position.y);
      ctx.lineTo(trailPosition.x, trailPosition.y);
      ctx.stroke();
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