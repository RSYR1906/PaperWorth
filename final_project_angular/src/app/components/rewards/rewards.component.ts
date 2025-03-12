// src/app/components/rewards/rewards.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PointTransaction, Reward, UserPoints, UserReward } from '../../model';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { RewardsService } from '../../services/rewards.service';

@Component({
  selector: 'app-rewards',
  standalone: false,
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.css']
})
export class RewardsComponent implements OnInit {
  // User data
  currentUser: any = null;
  userPoints: UserPoints | null = null;
  
  // Rewards data
  availableRewards: Reward[] = [];
  selectedCategory: string = 'WELCOME';
  selectedReward: Reward | null = null;
  
  // Redemption history
  redemptionHistory: UserReward[] = [];
  
  // Point transactions
  recentTransactions: PointTransaction[] = [];
  
  // Progress tracking
  nextTierThreshold: number = 500;
  nextTierName: string = 'Silver';
  
  // Confirmation modal
  showConfirmationModal: boolean = false;
  rewardToRedeem: Reward | null = null;
  
  // Success modal
  showSuccessModal: boolean = false;
  redeemedReward: UserReward | null = null;
  
  // Loading state
  isLoading: boolean = true;
  isRedeeming: boolean = false;
  
  // Welcome bonus
  hasClaimedWelcomeBonus: boolean = false;
  isClaimingBonus: boolean = false;
  showBonusAnimation: boolean = false;
  
  // Filter categories
  categories = [
    { id: 'WELCOME', name: 'Welcome Bonus'},
    { id: 'all', name: 'All Rewards' },
    { id: 'VOUCHER', name: 'Vouchers' },
    { id: 'ELECTRONICS', name: 'Electronics' },
    { id: 'GIFT_CARD', name: 'Gift Cards' },
    { id: 'HOME', name: 'Home' },
    { id: 'LIFESTYLE', name: 'Lifestyle' },
    { id: 'EXPERIENCE', name: 'Experiences' }
  ];

  constructor(
    private router: Router,
    private rewardsService: RewardsService,
    private firebaseAuthService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    // Get current user
    this.currentUser = this.firebaseAuthService.getCurrentUser() || 
                      JSON.parse(localStorage.getItem('currentUser') || '{}');
                      
    if (!this.currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Load user points and rewards data
    this.loadUserData();
    
    // Check if user has claimed welcome bonus
    this.checkWelcomeBonus();
  }
  
  // Check if user has claimed welcome bonus
  checkWelcomeBonus(): void {
    if (!this.currentUser?.id) return;
    
    // Check transactions for welcome bonus
    this.rewardsService.getPointTransactions(this.currentUser.id).subscribe({
      next: (transactions) => {
        this.hasClaimedWelcomeBonus = transactions.some(t => 
          t.source === 'WELCOME_BONUS' && t.transactionType === 'EARNED'
        );
      }
    });
  }
  
  // Claim welcome bonus
  claimWelcomeBonus(): void {
    if (!this.currentUser?.id || this.isClaimingBonus) return;
    
    this.isClaimingBonus = true;
    
    this.rewardsService.claimWelcomeBonus(this.currentUser.id).subscribe({
      next: (response) => {
        // Update points
        if (this.userPoints) {
          this.userPoints.totalPoints += 100;
          this.userPoints.availablePoints += 100;
        }
        
        // Add to transactions
        const transaction = {
          id: 'new-bonus',
          userId: this.currentUser!.id,
          points: 100,
          transactionType: 'EARNED',
          source: 'WELCOME_BONUS',
          transactionDate: new Date().toISOString(),
          description: 'Welcome bonus for joining PaperWorth!',
          referenceId: this.currentUser!.id
        };
        
        this.recentTransactions.unshift(transaction);
        this.hasClaimedWelcomeBonus = true;
        this.isClaimingBonus = false;
        
        // Show success animation
        this.showBonusAnimation = true;
        setTimeout(() => {
          this.showBonusAnimation = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error claiming welcome bonus:', error);
        this.isClaimingBonus = false;
        if (error?.error?.error === 'Welcome bonus has already been claimed') {
          this.hasClaimedWelcomeBonus = true;
        }
      }
    });
  }
  
  // Load user data - points, rewards, transactions
  loadUserData(): void {
    this.isLoading = true;
    
    // Get user points
    this.rewardsService.getUserPoints(this.currentUser.id).subscribe({
      next: (points) => {
        this.userPoints = points;
        this.determineUserTier(points.totalPoints);
      },
      error: (error) => console.error('Error fetching user points:', error),
      complete: () => this.loadAvailableRewards()
    });
    
    // Get redemption history
    this.rewardsService.getRedemptionHistory(this.currentUser.id).subscribe({
      next: (history) => {
        this.redemptionHistory = history.sort((a, b) => 
          new Date(b.redeemedDate).getTime() - new Date(a.redeemedDate).getTime()
        );
      },
      error: (error) => console.error('Error fetching redemption history:', error)
    });
    
    // Get recent transactions
    this.rewardsService.getPointTransactions(this.currentUser.id, 30).subscribe({
      next: (transactions) => {
        this.recentTransactions = transactions.sort((a, b) => 
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
      },
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }
  
  // Load available rewards
  loadAvailableRewards(): void {
    this.rewardsService.getAvailableRewards().subscribe({
      next: (rewards) => {
        this.availableRewards = rewards;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching rewards:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Determine user tier based on total points
  determineUserTier(totalPoints: number): void {
    if (totalPoints < 500) {
      this.nextTierThreshold = 500;
      this.nextTierName = 'Silver';
    } else if (totalPoints < 2000) {
      this.nextTierThreshold = 2000;
      this.nextTierName = 'Gold';
    } else if (totalPoints < 5000) {
      this.nextTierThreshold = 5000;
      this.nextTierName = 'Platinum';
    } else {
      this.nextTierThreshold = totalPoints; // Already at highest tier
      this.nextTierName = 'Platinum';
    }
  }
  
  // Get user's current tier
  get userTier(): string {
    if (!this.userPoints) return 'Bronze';
    
    const totalPoints = this.userPoints.totalPoints;
    if (totalPoints >= 5000) return 'Platinum';
    if (totalPoints >= 2000) return 'Gold';
    if (totalPoints >= 500) return 'Silver';
    return 'Bronze';
  }
  
  // Calculate percentage towards next tier
  get tierProgress(): number {
    if (!this.userPoints) return 0;
    
    const currentTierThreshold = this.getCurrentTierThreshold();
    const pointsForCurrentTier = this.userPoints.totalPoints - currentTierThreshold;
    const pointsNeededForNextTier = this.nextTierThreshold - currentTierThreshold;
    
    if (pointsNeededForNextTier <= 0) return 100; // Already at highest tier
    
    return Math.min(Math.round((pointsForCurrentTier / pointsNeededForNextTier) * 100), 100);
  }
  
  // Get threshold for current tier
  getCurrentTierThreshold(): number {
    if (!this.userPoints) return 0;
    
    const totalPoints = this.userPoints.totalPoints;
    if (totalPoints >= 5000) return 5000;
    if (totalPoints >= 2000) return 2000;
    if (totalPoints >= 500) return 500;
    return 0;
  }
  
  // Get remaining points needed for next tier
  get pointsForNextTier(): number {
    if (!this.userPoints) return 0;
    return Math.max(0, this.nextTierThreshold - this.userPoints.totalPoints);
  }
  
  // Select a reward category
  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }
  
  // Filter rewards by selected category
  get filteredRewards(): Reward[] {
    if (this.selectedCategory === 'all') {
      return this.availableRewards;
    }
    
    return this.availableRewards.filter(reward => 
      reward.category === this.selectedCategory
    );
  }
  
  // Check if user can afford a reward
  canAfford(reward: Reward): boolean {
    if (!this.userPoints) return false;
    return this.userPoints.availablePoints >= reward.pointsCost;
  }
  
  // View reward details
  viewRewardDetails(reward: Reward): void {
    this.selectedReward = reward;
  }
  
  // Close reward details modal
  closeRewardDetails(): void {
    this.selectedReward = null;
  }
  
  // Open confirmation modal for redeeming a reward
  confirmRedeem(reward: Reward): void {
    this.rewardToRedeem = reward;
    this.showConfirmationModal = true;
  }
  
  // Close confirmation modal
  closeConfirmationModal(): void {
    this.rewardToRedeem = null;
    this.showConfirmationModal = false;
  }
  
  // Redeem a reward
  redeemReward(): void {
    if (!this.rewardToRedeem || !this.currentUser?.id) return;
    
    this.isRedeeming = true;
    
    this.rewardsService.redeemReward(this.currentUser.id, this.rewardToRedeem.id).subscribe({
      next: (userReward) => {
        // Update user points
        if (this.userPoints) {
          this.userPoints.availablePoints -= this.rewardToRedeem!.pointsCost;
          this.userPoints.spentPoints += this.rewardToRedeem!.pointsCost;
        }
        
        // Add to redemption history
        this.redemptionHistory.unshift(userReward);
        
        // Show success modal
        this.redeemedReward = userReward;
        this.showSuccessModal = true;
        
        // Close confirmation modal
        this.showConfirmationModal = false;
        
        // Refresh rewards list
        this.loadAvailableRewards();
        
        this.isRedeeming = false;
      },
      error: (error) => {
        console.error('Error redeeming reward:', error);
        alert('Failed to redeem the reward. Please try again.');
        this.isRedeeming = false;
        this.showConfirmationModal = false;
      }
    });
  }
  
  // Close success modal
  closeSuccessModal(): void {
    this.redeemedReward = null;
    this.showSuccessModal = false;
  }
  
  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Get badge color for transaction type
  getTransactionBadgeColor(type: string): string {
    return type === 'EARNED' ? 'badge-success' : 'badge-info';
  }
  
  // Get badge color for redemption status
  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'FULFILLED': return 'badge-success';
      case 'PENDING': return 'badge-warning';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
  
  // Get reward image URL with fallback
  getRewardImageUrl(imageUrl: string): string {
    return imageUrl || 'placeholder-image.jpg';
  }
}