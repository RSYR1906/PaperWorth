import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, Observable, catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { Promotion } from '../model';
import { PromotionService } from '../services/promotions.service';

// Define interfaces for the state structure
export interface CategoryRecommendation {
  name: string;
  deals: Promotion[];
}

export interface RecommendedPromotionsState {
  recommendedPromotions: CategoryRecommendation[];
  topCategories: string[];
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: RecommendedPromotionsState = {
  recommendedPromotions: [],
  topCategories: [],
  isLoading: false,
  error: null
};

@Injectable({
  providedIn: 'root'
})
export class RecommendedPromotionsStore extends ComponentStore<RecommendedPromotionsState> {
  // Selectors
  readonly recommendedPromotions$ = this.select(state => state.recommendedPromotions);
  readonly topCategories$ = this.select(state => state.topCategories);
  readonly isLoading$ = this.select(state => state.isLoading);
  readonly error$ = this.select(state => state.error);

  // Computed selector for checking if there are any recommendations
  readonly hasRecommendations$ = this.select(
    this.recommendedPromotions$,
    (recommendations) => recommendations.some(cat => cat.deals.length > 0)
  );

  constructor(private promotionService: PromotionService) {
    super(initialState);
  }

  // Updaters (equivalent to reducers in NgRx)
  readonly setLoading = this.updater((state, isLoading: boolean) => ({
    ...state,
    isLoading,
    error: isLoading ? null : state.error // Clear error when starting to load
  }));

  readonly setError = this.updater((state, error: string | null) => ({
    ...state,
    error,
    isLoading: false
  }));

  readonly setTopCategories = this.updater((state, topCategories: string[]) => ({
    ...state,
    topCategories
  }));

  readonly setRecommendedPromotions = this.updater(
    (state, recommendations: CategoryRecommendation[]) => ({
      ...state,
      recommendedPromotions: recommendations,
      isLoading: false
    })
  );

  // Effects (for side effects like API calls)
  readonly loadRecommendedPromotions = this.effect((categories$: Observable<string[]>) => {
    return categories$.pipe(
      tap(() => this.setLoading(true)),
      switchMap((categories) => {
        if (!categories.length) {
          return of([]);
        }

        const categoryObservables = categories.map(category => 
          this.promotionService.getPromotionsByCategory(category).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(categoryObservables).pipe(
          switchMap(results => {
            const recommendations: CategoryRecommendation[] = categories.map((name, index) => ({
              name,
              deals: results[index] || []
            }));
            return of(recommendations);
          }),
          catchError(error => {
            this.setError(error.message || 'Failed to load promotions');
            return EMPTY;
          })
        );
      }),
      tap(recommendations => {
        this.setRecommendedPromotions(recommendations);
      })
    );
  });

  readonly analyzeReceiptHistory = this.effect((receipts$: Observable<any[]>) => {
    return receipts$.pipe(
      tap(() => this.setLoading(true)),
      switchMap(receipts => {
        const categoryCounts: Record<string, number> = {};
        
        // Count occurrences of each category
        receipts.forEach(({ category, merchantName, additionalFields }) => {
          const detected = category || additionalFields?.category || merchantName || 'Others';
          categoryCounts[detected] = (categoryCounts[detected] || 0) + 1;
        });
        
        // Sort and get top 3 categories
        const topCategories = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);
        
        return of(topCategories);
      }),
      tap(topCategories => {
        this.setTopCategories(topCategories);
        if (topCategories.length > 0) {
          this.loadRecommendedPromotions(topCategories);
        } else {
          this.setLoading(false);
        }
      }),
      catchError(error => {
        this.setError(error.message || 'Failed to analyze receipt history');
        return EMPTY;
      })
    );
  });

  // Public methods to use in components
  loadByCategories(categories: string[]): void {
    this.loadRecommendedPromotions(categories);
  }

  processReceiptHistory(receipts: any[]): void {
    this.analyzeReceiptHistory(receipts);
  }

  clearRecommendations(): void {
    this.setRecommendedPromotions([]);
    this.setTopCategories([]);
  }
}