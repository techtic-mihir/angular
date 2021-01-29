import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MarketplaceService, FlashMessagesService, HeaderService } from '../../../services';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from "@angular/common";

@Component({
    selector: 'solution-hover',
    templateUrl: 'solution-hover.component.html',
    styleUrls: ['solution-hover.component.scss']
})
export class SolutionHoverComponent implements OnInit {

    @Input() solutions: any;
    @Input() hideSave: boolean = false;

    showCategory: number = 20;
    showSubcategory: number = 20;
    currentSolutionDetail: any;
    page: any;

    @ViewChild('modalContent', { static: false }) content: NgbModal;

    constructor(
        //public activeModal: NgbActiveModal,
        private modalService: NgbModal,
        private marketPlaceService: MarketplaceService,
        private _flashMessagesService: FlashMessagesService,
        private headerService: HeaderService,
        private router: Router,
        private location: Location
    ) {
        if (location.path().indexOf("marketplace/manage") > -1) {
            this.page = "marketplace";
        } else if (location.path().indexOf("app-view") > -1) {
            this.page = "app-view";
        } else if (location.path().indexOf("marketplace") > -1) {
            this.page = "marketplace";
        }
    }

    ngOnInit() {
        this.solutions.isContactedDate = this.solutions.isContactedDate ? this.solutions.isContactedDate : this.solutions.updated_at;
    }

    saveSolution(solution: any, type: any) {
        let { sub_control_id = null, id, solution_category_id: category_id = null } = solution;
        let input = { sub_control_id, id, category_id };
        input['status'] = type;
        let message = (type == 'contacted') ? 'contacted' : 'saved';

        if (this.page == "app-view") {
            this.activityTrigger('save-vendors-in-app', input);
        } else {
            this.activityTrigger('save-vendors', input);
        }

        this.marketPlaceService.postRequest('marketplace/save-solution', input).subscribe(
            (data: any) => {
                this.closeModal();
                if (data['success']) {
                    this.marketPlaceService.openSidebar.next({ type });
                    this.marketPlaceService.getAllSolutionsSubject.next(true);
                    this.marketPlaceService.getManageSolutionSubject.next(true);
                    this._flashMessagesService.show(`Solution ${message} successfully.`, { cssClass: 'alert-success' });
                } else {
                    this._flashMessagesService.show(`This solution is already ${message}.`, { cssClass: 'alert-danger' });
                }
            },
            (error) => {
                this._flashMessagesService.show('Your request could not be processed. Please try again.', { cssClass: 'alert-danger' });
            }
        );
    }

    solutionsPopup($event: Event, solutions: any) {
        this.closeModal();
        this.currentSolutionDetail = solutions;

        if (this.page == "app-view") {
            this.activityTrigger('vendor-listing-pages-clicked-in-app', this.currentSolutionDetail);
        } else {
            this.activityTrigger('vendor-listing-page', this.currentSolutionDetail);
        }

        this.modalService.open(this.content, { size: 'lg', windowClass: 'marketplace-modal marketplace-details-modal' }).result.then(
            (result) => {
                // console.log(result);
            },
            (reason) => {
                // console.log(reason);
            }
        );
    }

    closeModal() {
        this.modalService.dismissAll();
    }

    activityTrigger(slug: string, data?: any) {
        this.marketPlaceService.activityTrigger(slug, data).subscribe((response: any) => {
        });
    }
}
