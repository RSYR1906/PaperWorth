import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private fileSelectedSource = new Subject<File>();
  
  // Observable that components can subscribe to
  fileSelected$ = this.fileSelectedSource.asObservable();
  
  constructor() { }
  
  // Method to trigger file input in any component
  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('No file input element found in the current view');
    }
  }
  
  // Method to broadcast the selected file to subscribers
  notifyFileSelected(file: File): void {
    this.fileSelectedSource.next(file);
  }
}