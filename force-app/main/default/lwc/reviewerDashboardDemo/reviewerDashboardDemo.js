import { LightningElement } from 'lwc';
import LOGO from '@salesforce/resourceUrl/WIN_Logo';

export default class ReviewerDashboardDemo extends LightningElement {
    logoUrl = LOGO;

    profile = {
        name: 'Test Reviewer',
        email: 'test@example.com'
    };

    get initials() {
        return this.profile.name
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase();
    }

    onboarding = {
        registration: 'Completed',
        nda: 'Completed',
        active: 'Active'
    };

    summary = {
        totalAssigned: 12,
        reviewed: 8,
        yetToStart: 4
    };

    journey = [
        { id: 1, title: 'Registration', sub: 'Completed', class: 'step done' },
        { id: 2, title: 'NDA Signature', sub: 'Executed', class: 'step done' },
        { id: 3, title: 'Active Reviewer', sub: 'Active', class: 'step done' }
    ];
}