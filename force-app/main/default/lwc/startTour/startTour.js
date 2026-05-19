import { LightningElement, track } from 'lwc';

export default class StartTour extends LightningElement {
      @track isTourModalOpen = false;

    openTourModal() {
        this.isTourModalOpen = true;
    }

    closeTourModal() {
        this.isTourModalOpen = false;
    }
}