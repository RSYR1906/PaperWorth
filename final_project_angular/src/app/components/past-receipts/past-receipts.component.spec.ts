import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastReceiptsComponent } from './past-receipts.component';

describe('PastReceiptsComponent', () => {
  let component: PastReceiptsComponent;
  let fixture: ComponentFixture<PastReceiptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PastReceiptsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastReceiptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
