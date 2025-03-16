import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedPromotionsComponent } from './saved-promotions.component';

describe('SavedPromotionsComponent', () => {
  let component: SavedPromotionsComponent;
  let fixture: ComponentFixture<SavedPromotionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SavedPromotionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedPromotionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
