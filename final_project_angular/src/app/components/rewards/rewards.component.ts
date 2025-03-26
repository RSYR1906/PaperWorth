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
  currentUser: any = null;
  userPoints: UserPoints | null = null;
  availableRewards: Reward[] = [];
  selectedCategory: string = 'WELCOME';
  selectedReward: Reward | null = null;
  redemptionHistory: UserReward[] = [];
  recentTransactions: PointTransaction[] = [];
  nextTierThreshold: number = 500;
  nextTierName: string = 'Silver';
  showConfirmationModal: boolean = false;
  rewardToRedeem: Reward | null = null;
  showSuccessModal: boolean = false;
  redeemedReward: UserReward | null = null;
  isLoading: boolean = true;
  isRedeeming: boolean = false;
  hasClaimedWelcomeBonus: boolean = false;
  isClaimingBonus: boolean = false;
  showBonusAnimation: boolean = false;

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
  ) {}

  ngOnInit(): void {
    this.currentUser = this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!this.currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserData();
    this.checkWelcomeBonus();
  }

  checkWelcomeBonus(): void {
    if (!this.currentUser?.id) return;
    this.rewardsService.getPointTransactions(this.currentUser.id).subscribe({
      next: (transactions) => {
        this.hasClaimedWelcomeBonus = transactions.some(t => t.source === 'WELCOME_BONUS' && t.transactionType === 'EARNED');
      }
    });
  }

  claimWelcomeBonus(): void {
    if (!this.currentUser?.id || this.isClaimingBonus) return;
    this.isClaimingBonus = true;
    this.rewardsService.claimWelcomeBonus(this.currentUser.id).subscribe({
      next: () => {
        if (this.userPoints) {
          this.userPoints.totalPoints += 100;
          this.userPoints.availablePoints += 100;
        }
        const transaction: PointTransaction = {
          id: 'new-bonus',
          userId: this.currentUser.id,
          points: 100,
          transactionType: 'EARNED',
          source: 'WELCOME_BONUS',
          transactionDate: new Date().toISOString(),
          description: 'Welcome bonus for joining PaperWorth!',
          referenceId: this.currentUser.id
        };
        this.recentTransactions.unshift(transaction);
        this.hasClaimedWelcomeBonus = true;
        this.isClaimingBonus = false;
        this.showBonusAnimation = true;
        setTimeout(() => this.showBonusAnimation = false, 3000);
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

  loadUserData(): void {
    this.isLoading = true;
    this.rewardsService.getUserPoints(this.currentUser.id).subscribe({
      next: (points) => {
        this.userPoints = points;
        this.determineUserTier(points.totalPoints);
      },
      error: (error) => console.error('Error fetching user points:', error),
      complete: () => this.loadAvailableRewards()
    });
    this.rewardsService.getRedemptionHistory(this.currentUser.id).subscribe({
      next: (history) => {
        this.redemptionHistory = history.sort((a, b) => new Date(b.redeemedDate).getTime() - new Date(a.redeemedDate).getTime());
      },
      error: (error) => console.error('Error fetching redemption history:', error)
    });
    this.rewardsService.getPointTransactions(this.currentUser.id, 30).subscribe({
      next: (transactions) => {
        this.recentTransactions = transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      },
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }

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
      this.nextTierThreshold = totalPoints;
      this.nextTierName = 'Platinum';
    }
  }

  get userTier(): string {
    if (!this.userPoints) return 'Bronze';
    const totalPoints = this.userPoints.totalPoints;
    if (totalPoints >= 5000) return 'Platinum';
    if (totalPoints >= 2000) return 'Gold';
    if (totalPoints >= 500) return 'Silver';
    return 'Bronze';
  }

  get tierProgress(): number {
    if (!this.userPoints) return 0;
    const currentTierThreshold = this.getCurrentTierThreshold();
    const pointsForCurrentTier = this.userPoints.totalPoints - currentTierThreshold;
    const pointsNeededForNextTier = this.nextTierThreshold - currentTierThreshold;
    return pointsNeededForNextTier <= 0 ? 100 : Math.min(Math.round((pointsForCurrentTier / pointsNeededForNextTier) * 100), 100);
  }

  getCurrentTierThreshold(): number {
    if (!this.userPoints) return 0;
    const totalPoints = this.userPoints.totalPoints;
    if (totalPoints >= 5000) return 5000;
    if (totalPoints >= 2000) return 2000;
    if (totalPoints >= 500) return 500;
    return 0;
  }

  get pointsForNextTier(): number {
    if (!this.userPoints) return 0;
    return Math.max(0, this.nextTierThreshold - this.userPoints.totalPoints);
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  get filteredRewards(): Reward[] {
    if (this.selectedCategory === 'all') return this.availableRewards;
    return this.availableRewards.filter(reward => reward.category === this.selectedCategory);
  }

  canAfford(reward: Reward): boolean {
    return this.userPoints ? this.userPoints.availablePoints >= reward.pointsCost : false;
  }

  viewRewardDetails(reward: Reward): void {
    this.selectedReward = reward;
  }

  closeRewardDetails(): void {
    this.selectedReward = null;
  }

  confirmRedeem(reward: Reward): void {
    this.rewardToRedeem = reward;
    this.showConfirmationModal = true;
  }

  closeConfirmationModal(): void {
    this.rewardToRedeem = null;
    this.showConfirmationModal = false;
  }

  redeemReward(): void {
    if (!this.rewardToRedeem || !this.currentUser?.id) return;
    this.isRedeeming = true;
    this.rewardsService.redeemReward(this.currentUser.id, this.rewardToRedeem.id).subscribe({
      next: (userReward) => {
        if (this.userPoints) {
          this.userPoints.availablePoints -= this.rewardToRedeem!.pointsCost;
          this.userPoints.spentPoints += this.rewardToRedeem!.pointsCost;
        }
        this.redemptionHistory.unshift(userReward);
        this.redeemedReward = userReward;
        this.showSuccessModal = true;
        this.showConfirmationModal = false;
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

  closeSuccessModal(): void {
    this.redeemedReward = null;
    this.showSuccessModal = false;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getTransactionBadgeColor(type: string): string {
    return type === 'EARNED' ? 'badge-success' : 'badge-info';
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'FULFILLED': return 'badge-success';
      case 'PENDING': return 'badge-warning';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getRewardImageUrl(imageUrl: string): string {
    return imageUrl || 'placeholder-image.jpg';
  }
}