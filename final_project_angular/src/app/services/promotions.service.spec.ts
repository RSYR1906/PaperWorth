import { TestBed } from '@angular/core/testing';

import { PromotionService } from './promotions.service';

describe('PromotionsService', () => {
  let service: PromotionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromotionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
