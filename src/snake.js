// File: src/snake.js - FIXED VERSION - Proper long snake segment handling
import { CONFIG } from './config.js';
import { Vector2D, MathUtils } from './utils.js';

export class Snake {
  constructor(startX, startY, startAngle = 0) {
    // Core properties
    this.position = new Vector2D(startX, startY);
    this.angle = startAngle;
    this.length = CONFIG.PHYSICS.INITIAL_LENGTH;
    
    // NEW: Separate value system for crypto rewards
    this.value = 0;  // Crypto token value - only from kills/token pellets
    
    // NEW: Boost system using length
    this.isBoosting = false;
    this.lengthBurned = 0;  // Track total length burned this session
    this.lastBoostTime = 0; // For calculating length consumption
    
    // NEW: Length decay system for very large snakes
    this.lastDecayTime = 0;
    this.decayAccumulator = 0;
    
    // FIXED: Trail buffer system - much larger buffer for very long snakes
    this.trail = [];
    this.maxTrailLength = 5000; // Increased from 1000 - enough for massive snakes
    this.maxTrailDistance = 0;  // Track maximum distance we need
    
    // Segments positioned along trail at specific distances
    this.segments = [];
    
    // Visual properties
    this.color = '#00ff88';
    this.headRadius = 12;
    this.bodyRadius = 10;
    
    // Game state
    this.isAlive = true;
    this.score = 0; // Keep for compatibility, but value is the main crypto metric
    
    console.log('🐍 Snake created');
    
    // Initialize trail and segments
    this.initializeTrailAndSegments();
    
    // SPEED: Calculate based on length - NEVER increases with growth
    this.speed = this.calculateSpeed();
    console.log(`🐍 Initial speed set: ${this.speed.toFixed(1)} for length ${this.length}`);
  }
  
  // SIMPLE: Calculate speed with VERY gradual decrease from 120 to 85 over 2000 length
  calculateSpeed() {
    const currentLength = this.length;
    
    if (currentLength <= 5) {
      return 120; // Starting speed
    } else if (currentLength >= 2000) {
      return 85; // Minimum speed at 2000 length
    } else {
      // Linear interpolation from 120 to 85 over length 5 to 2000
      const lengthProgress = (currentLength - 5) / (2000 - 5); // 0 to 1
      const speedRange = 120 - 85; // 35 speed difference
      const speedDecrease = speedRange * lengthProgress;
      const finalSpeed = 120 - speedDecrease;
      
      console.log(`📊 calculateSpeed: Length=${currentLength} -> Progress=${lengthProgress.toFixed(4)} -> Speed=${finalSpeed.toFixed(1)}`);
      return finalSpeed;
    }
  }
  
  initializeTrailAndSegments() {
    // Start trail with current position
    this.trail = [{
      position: new Vector2D(this.position.x, this.position.y),
      arcLength: 0
    }];
    
    // FIXED: Calculate proper spacing and ensure we have enough trail
    this.updateMaxTrailDistance();
    
    // Initialize segments at proper distances along the trail
    this.segments = [];
    for (let i = 0; i < this.length; i++) {
      const distance = this.calculateSegmentDistance(i);
      const position = this.getPositionAtDistance(distance);
      this.segments.push({
        position: position,
        distance: distance,
        isHead: i === 0
      });
    }
    
    console.log('🐍 Initialized trail buffer with', this.segments.length, 'segments');
  }
  
  // FIXED: Calculate proper segment distance with better scaling
  calculateSegmentDistance(segmentIndex) {
    if (segmentIndex === 0) return 0; // Head is always at distance 0
    
    const baseGap = CONFIG.PHYSICS.SEGMENT_GAP;
    
    // IMPROVED: Better segment spacing that handles very long snakes
    // Use a logarithmic scale for very long snakes to prevent overcrowding
    let cumulativeDistance = 0;
    
    for (let i = 1; i <= segmentIndex; i++) {
      let segmentGap = baseGap;
      
      // Apply spacing adjustments based on snake length
      if (this.length > 500) {
        // For very long snakes, increase spacing more aggressively
        const lengthFactor = Math.min(3.0, 1.0 + Math.log10(this.length / 100));
        segmentGap = baseGap * lengthFactor;
      } else if (this.length > 100) {
        // For long snakes, moderate spacing increase
        const lengthFactor = 1.0 + (this.length - 100) / 400; // Gradual increase
        segmentGap = baseGap * lengthFactor;
      }
      
      // Also consider segment position - tail segments can be spaced further apart
      if (i > this.length * 0.7) {
        segmentGap *= 1.2; // Tail segments slightly more spaced
      }
      
      cumulativeDistance += segmentGap;
    }
    
    return cumulativeDistance;
  }
  
  // FIXED: Update maximum trail distance needed
  updateMaxTrailDistance() {
    if (this.segments.length > 0) {
      const lastSegment = this.segments[this.segments.length - 1];
      this.maxTrailDistance = Math.max(this.maxTrailDistance, lastSegment.distance + 200); // 200px buffer
    } else {
      // Estimate based on length
      const estimatedDistance = this.length * CONFIG.PHYSICS.SEGMENT_GAP * 2; // Conservative estimate
      this.maxTrailDistance = Math.max(this.maxTrailDistance, estimatedDistance);
    }
  }
  
  update(deltaTime, turnDirection, boost) {
    if (!this.isAlive) return;
    
    // NEW: Handle length-based boost system
    this.updateBoostSystem(deltaTime, boost);
    
    // NEW: Handle length decay for very large snakes
    this.updateLengthDecay(deltaTime);
    
    // Calculate current speed (FIXED - no speed increase)
    const currentSpeed = this.isBoosting 
      ? this.speed * CONFIG.PHYSICS.BOOST_SPEED_MULTIPLIER 
      : this.speed;
    
    // Update angle based on input with size penalties
    if (turnDirection.magnitude() > 0.1) {
      const targetAngle = Math.atan2(turnDirection.y, turnDirection.x);
      const angleDiff = MathUtils.angleDifference(this.angle, targetAngle);
      
      // Turn rate penalty for larger snakes
      const baseTurnRate = CONFIG.PHYSICS.TURN_RATE;
      const lengthDiff = Math.max(0, this.length - 5);
      
      let turnPenaltyFactor;
      if (lengthDiff > 1000) {
        turnPenaltyFactor = 0.8 + Math.log(lengthDiff / 1000) * 0.05;
      } else if (lengthDiff > 100) {
        turnPenaltyFactor = 0.4 + Math.log(lengthDiff / 100) * 0.2;
      } else {
        turnPenaltyFactor = lengthDiff * 0.004;
      }
      
      const turnMultiplier = Math.max(0.1, 1 - turnPenaltyFactor);
      const effectiveTurnRate = baseTurnRate * turnMultiplier * deltaTime;
      
      if (Math.abs(angleDiff) <= effectiveTurnRate) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * effectiveTurnRate;
      }
    }
    
    // Move head
    const velocity = Vector2D.fromAngle(this.angle, currentSpeed * deltaTime);
    const newHeadPosition = this.position.add(velocity);
    
    // Add new position to trail
    this.addToTrail(newHeadPosition);
    
    // Update head position
    this.position = newHeadPosition;
    
    // FIXED: Update all segments to follow the exact trail path with proper distances
    this.updateSegmentsAlongTrail();
  }
  
  // NEW: Length-based boost system
  updateBoostSystem(deltaTime, wantsToBoost) {
    const currentTime = performance.now();
    
    // Check if we can boost
    const canBoost = this.length > CONFIG.BOOST.MIN_LENGTH_TO_BOOST;
    
    if (wantsToBoost && canBoost && !this.isBoosting) {
      this.isBoosting = true;
      this.lastBoostTime = currentTime;
      console.log('🚀 Boost started! Length:', this.length);
    } else if (!wantsToBoost && this.isBoosting) {
      this.isBoosting = false;
      console.log('🛑 Boost stopped! Remaining length:', this.length);
    } else if (wantsToBoost && !canBoost) {
      if (this.isBoosting) {
        this.isBoosting = false;
        console.log('🛑 Boost stopped - not enough length!');
      }
    }
    
    // Consume length while boosting
    if (this.isBoosting) {
      const lengthToConsume = CONFIG.BOOST.LENGTH_COST_PER_SECOND * deltaTime;
      this.consumeLength(lengthToConsume);
      
      if (this.length <= CONFIG.BOOST.MIN_LENGTH_TO_BOOST) {
        this.isBoosting = false;
        console.log('🛑 Boost auto-stopped - length too low!');
      }
    }
  }
  
  // NEW: Consume length for boosting
  consumeLength(amount) {
    if (amount <= 0) return;
    
    const oldLength = this.length;
    const oldSpeed = this.speed;
    
    this.length = Math.max(CONFIG.BOOST.MIN_LENGTH_TO_BOOST, this.length - amount);
    const actualConsumed = oldLength - this.length;
    
    this.lengthBurned += actualConsumed;
    
    // Remove segments from the tail if we got shorter
    while (this.segments.length > Math.floor(this.length)) {
      this.segments.pop();
    }
    
    // Recalculate speed after length change
    const newSpeed = this.calculateSpeed();
    this.speed = newSpeed;
    
    if (actualConsumed > 0.1) {
      console.log(`🔥 Length consumed: ${oldLength.toFixed(1)} -> ${this.length.toFixed(1)} | Speed: ${oldSpeed.toFixed(1)} -> ${newSpeed.toFixed(1)}`);
    }
    
    this.updateVisualSize();
  }
  
  // FIXED: Better segment positioning along trail
  updateSegmentsAlongTrail() {
    // Recalculate all segment distances first
    for (let i = 0; i < this.segments.length; i++) {
      const targetDistance = this.calculateSegmentDistance(i);
      const position = this.getPositionAtDistance(targetDistance);
      
      this.segments[i].position = position;
      this.segments[i].distance = targetDistance;
    }
    
    // Update trail distance tracking
    this.updateMaxTrailDistance();
  }
  
  // FIXED: Improved trail management
  addToTrail(newPosition) {
    const lastTrailPoint = this.trail[0];
    const distance = lastTrailPoint.position.distanceTo(newPosition);
    
    // Use a smaller sample rate for more precise trail following
    const minSampleDistance = Math.min(CONFIG.PHYSICS.TRAIL_SAMPLE_RATE, 2.0);
    
    if (distance >= minSampleDistance) {
      const newArcLength = lastTrailPoint.arcLength + distance;
      
      this.trail.unshift({
        position: new Vector2D(newPosition.x, newPosition.y),
        arcLength: newArcLength
      });
      
      // FIXED: Keep enough trail for the longest possible distance needed
      const requiredTrailDistance = this.maxTrailDistance + 100; // Extra buffer
      
      // Remove old trail points that are too far behind
      this.trail = this.trail.filter(point => 
        newArcLength - point.arcLength <= requiredTrailDistance
      );
      
      // Also enforce maximum trail length to prevent memory issues
      if (this.trail.length > this.maxTrailLength) {
        this.trail = this.trail.slice(0, this.maxTrailLength);
        console.log(`⚠️ Trail truncated to ${this.maxTrailLength} points`);
      }
      
      // Debug logging for very long snakes
      if (this.length > 100 && this.length % 50 === 0) {
        console.log(`🐍 Long snake debug: Length=${this.length}, Trail points=${this.trail.length}, Max distance=${this.maxTrailDistance.toFixed(1)}`);
      }
    }
  }
  
  // FIXED: More robust position interpolation
  getPositionAtDistance(targetDistance) {
    if (this.trail.length === 0) {
      return new Vector2D(this.position.x, this.position.y);
    }
    
    if (this.trail.length === 1) {
      return this.trail[0].position;
    }
    
    const headArcLength = this.trail[0].arcLength;
    const actualTargetDistance = headArcLength - targetDistance;
    
    // If target is at or beyond the head, return head position
    if (actualTargetDistance >= headArcLength) {
      return this.trail[0].position;
    }
    
    // If target is beyond our trail, return the farthest point we have
    const lastPoint = this.trail[this.trail.length - 1];
    if (actualTargetDistance <= lastPoint.arcLength) {
      console.log(`⚠️ Segment beyond trail: target=${actualTargetDistance.toFixed(1)}, trail_end=${lastPoint.arcLength.toFixed(1)}`);
      return lastPoint.position;
    }
    
    // Find the two trail points that bracket our target distance
    for (let i = 0; i < this.trail.length - 1; i++) {
      const currentPoint = this.trail[i];
      const nextPoint = this.trail[i + 1];
      
      if (actualTargetDistance <= currentPoint.arcLength && 
          actualTargetDistance >= nextPoint.arcLength) {
        
        const segmentLength = currentPoint.arcLength - nextPoint.arcLength;
        
        if (segmentLength === 0) {
          return currentPoint.position;
        }
        
        const t = (actualTargetDistance - nextPoint.arcLength) / segmentLength;
        
        // Linear interpolation between the two points
        return new Vector2D(
          nextPoint.position.x + (currentPoint.position.x - nextPoint.position.x) * t,
          nextPoint.position.y + (currentPoint.position.y - nextPoint.position.y) * t
        );
      }
    }
    
    // Fallback to last point
    return this.trail[this.trail.length - 1].position;
  }
  
  // FIXED: Better growth handling
  grow(amount = 1) {
    const oldLength = this.length;
    const oldSpeed = this.speed;
    
    // ONLY change length - NEVER increase speed
    this.length += amount;
    
    console.log(`🌟 GROW: ${oldLength} -> ${this.length} (amount: ${amount})`);
    
    // Add new segments at the tail
    for (let i = 0; i < amount; i++) {
      const segmentIndex = this.segments.length;
      
      // Calculate proper distance for new segment
      const distance = this.calculateSegmentDistance(segmentIndex);
      const position = this.getPositionAtDistance(distance);
      
      this.segments.push({
        position: position,
        distance: distance,
        isHead: false
      });
      
      console.log(`🔧 Added segment ${segmentIndex} at distance ${distance.toFixed(1)}`);
    }
    
    // Update trail requirements
    this.updateMaxTrailDistance();
    
    this.updateVisualSize();
    
    // Recalculate speed - ALWAYS decreases or stays same
    const newSpeed = this.calculateSpeed();
    this.speed = newSpeed;
    
    console.log(`🔄 SPEED CHANGE: ${oldSpeed.toFixed(1)} -> ${newSpeed.toFixed(1)} (length: ${this.length})`);
  }
  
  // NEW: Length decay system for very large snakes
  updateLengthDecay(deltaTime) {
    if (this.length <= 50) return;
    
    this.decayAccumulator += deltaTime;
    
    let decayRate = 0;
    if (this.length > 1000) {
      decayRate = 0.5;
    } else if (this.length > 500) {
      decayRate = 0.3;
    } else if (this.length > 200) {
      decayRate = 0.15;
    } else if (this.length > 100) {
      decayRate = 0.08;
    } else if (this.length > 50) {
      decayRate = 0.03;
    }
    
    if (this.decayAccumulator >= 1.0) {
      const lengthToLose = decayRate * this.decayAccumulator;
      
      if (lengthToLose > 0) {
        const oldLength = this.length;
        this.length = Math.max(50, this.length - lengthToLose);
        
        const segmentsToRemove = Math.floor(oldLength - this.length);
        for (let i = 0; i < segmentsToRemove; i++) {
          if (this.segments.length > this.length) {
            this.segments.pop();
          }
        }
        
        if (lengthToLose > 0.01) {
          console.log(`🩸 Length decay: ${oldLength.toFixed(1)} -> ${this.length.toFixed(1)}`);
        }
        
        // Recalculate speed after decay
        const newSpeed = this.calculateSpeed();
        this.speed = newSpeed;
        this.updateVisualSize();
      }
      
      this.decayAccumulator = 0;
    }
  }
  
  // NEW: Add crypto value (from kills, token pellets)
  addValue(amount, reason = "unknown") {
    this.value += amount;
    console.log(`💰 VALUE INCREASED! +${amount} from ${reason}. Total value: ${this.value}`);
  }
  
  // NEW: Debug function to add length for testing
  debugAddLength(amount = CONFIG.DEBUG.LENGTH_BOOST_AMOUNT) {
    if (!CONFIG.DEBUG.ENABLE_DEBUG_KEYS) return;
    
    const oldLength = this.length;
    const oldSpeed = this.speed;
    
    console.log(`🧪 DEBUG: Adding ${amount} length`);
    console.log(`🧪 BEFORE: Length=${oldLength}, Speed=${oldSpeed.toFixed(1)}, Segments=${this.segments.length}, Trail points=${this.trail.length}`);
    
    this.grow(amount);
    
    console.log(`🧪 AFTER: Length=${this.length}, Speed=${this.speed.toFixed(1)}, Segments=${this.segments.length}, Trail points=${this.trail.length}`);
  }
  
  // NEW: Debug function for big length boost
  debugAddBigLength() {
    if (!CONFIG.DEBUG.ENABLE_DEBUG_KEYS) return;
    
    const amount = CONFIG.DEBUG.BIG_LENGTH_BOOST;
    console.log(`🧪 DEBUG: Adding BIG length boost: ${amount}`);
    this.grow(amount);
  }
  
  // FIXED: Update visual size based on current length - scales to 6x at 2000 length
  updateVisualSize() {
    const currentLength = this.length;
    const initialLength = CONFIG.PHYSICS.INITIAL_LENGTH;
    
    // More aggressive scaling - from 1.0x to 6.0x over 2000 length
    let sizeMultiplier;
    
    if (currentLength <= initialLength) {
      sizeMultiplier = 1.0; // Base size for starting length
    } else if (currentLength >= 2000) {
      sizeMultiplier = 6.0; // Maximum 6x size at 2000 length
    } else {
      // Logarithmic scaling for smooth, progressive growth
      const lengthProgress = (currentLength - initialLength) / (2000 - initialLength);
      const logProgress = Math.log(1 + lengthProgress * 9) / Math.log(10); // 0 to 1 logarithmic curve
      sizeMultiplier = 1.0 + logProgress * 5.0; // 1.0x to 6.0x (5.0 range)
    }
    
    this.headRadius = 12 * sizeMultiplier;
    this.bodyRadius = 10 * sizeMultiplier;
    
    // Debug logging for size changes
    if (currentLength % 50 === 0 && currentLength > initialLength) {
      console.log(`📏 Size update: Length=${currentLength} -> Multiplier=${sizeMultiplier.toFixed(2)}x (Head: ${this.headRadius.toFixed(1)}, Body: ${this.bodyRadius.toFixed(1)})`);
    }
  }
  
  getSegmentRadius(segmentIndex) {
    if (segmentIndex === 0) {
      return this.headRadius;
    } else {
      const taperFactor = Math.max(0.7, 1 - (segmentIndex - 1) * 0.03);
      return this.bodyRadius * taperFactor;
    }
  }
  
  checkSelfCollision() {
    return false;
  }
  
  checkCollisionWithOtherSnake(otherSnake) {
    if (!otherSnake.isAlive || otherSnake === this) return false;
    
    for (const segment of otherSnake.bodySegments) {
      const distance = this.position.distanceTo(segment);
      if (distance < this.headRadius + otherSnake.bodyRadius) {
        return true;
      }
    }
    
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
  
  draw(ctx, camera) {
    if (!this.isAlive) return;
    
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const segment = this.segments[i];
      const radius = this.getSegmentRadius(i);
      
      if (segment.isHead) {
        const headColor = this.isBoosting ? '#ff4444' : '#00ff88';
        ctx.fillStyle = headColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        const pulseRadius = this.isBoosting ? radius + Math.sin(performance.now() * 0.01) * 2 : radius;
        
        ctx.beginPath();
        ctx.arc(segment.position.x, segment.position.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        const directionLength = radius * 2.5;
        const directionEnd = segment.position.add(Vector2D.fromAngle(this.angle, directionLength));
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(segment.position.x, segment.position.y);
        ctx.lineTo(directionEnd.x, directionEnd.y);
        ctx.stroke();
        
        if (this.length <= CONFIG.BOOST.MIN_LENGTH_TO_BOOST + 1) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
          ctx.font = '12px monospace';
          ctx.fillText('LOW LENGTH!', segment.position.x - 30, segment.position.y - radius - 10);
        }
        
      } else {
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
  
  drawTrail(ctx, camera) {
    if (this.trail.length < 2) return;
    
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
    
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    for (const point of this.trail) {
      ctx.beginPath();
      ctx.arc(point.position.x, point.position.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
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