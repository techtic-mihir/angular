import {
    Component,
    OnInit,
    Input,
    ViewChild,
    OnDestroy,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    ViewChildren,
    ChangeDetectorRef
} from '@angular/core';
import { Router, ActivatedRoute, Params, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
    Validators,
    FormGroup,
    FormArray,
    FormBuilder,
    FormControl
} from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FileUploader, FileUploaderOptions } from 'ng2-file-upload';
import { Auth } from '../../services/auth.service';
declare var jQuery: any;
import * as moment from 'moment/moment';
import 'rxjs/add/operator/filter';
import {
    catchError,
    tap,
    switchMap,
    debounceTime,
    distinctUntilChanged,
    takeWhile,
    first,
    map,
    startWith,
    filter,
    scan,
    withLatestFrom,
    mergeMap,
    takeUntil,
    skipUntil,
    exhaustMap,
    endWith
} from 'rxjs/operators';
import { takeWhileInclusive } from 'rxjs-take-while-inclusive';
import { Observable } from 'rxjs/internal/Observable';
import { Location } from '@angular/common';
import { HouseholdService } from '../../services';
import { FundService } from '../../services/';

@Component({
    selector: 'documents',
    templateUrl: './documents.component.html',
    styleUrls: ['./documents.component.scss'],
    providers: [MessageService, ConfirmationService]
})
export class DocumentsComponent implements OnInit {

    uuid: any;
    fundId: any;
    householdId: any;
    todayDate: any;
    filter = { tag: [], user: [], date: [] };
    loader: boolean;
    paginationTotal: any = 1;
    paginationPerPage: any = 10;
    page = 1;
    filter_from: any;
    filter_to: any;
    documents: Array<String> = new Array();
    tags: Array<String> = new Array();
    documentTags: Array<String> = new Array();
    createdBy: Array<String> = new Array();
    uploadFormActionDisable: boolean = false;
    updateFormActionDisable: boolean = false;
    uploadForm: FormGroup;
    public hasBaseDropZoneOver: boolean = false;
    readonly separatorKeysCodes: number[] = [ENTER, COMMA];
    removable = true;
    addOnBlur = true;

    public documentUploader: FileUploader = new FileUploader({
        url: 'api/documents/upload-tags',
        method: 'POST',
        removeAfterUpload: true
    });

    public modelUpdateDocument: FileUploader = new FileUploader({
        url: 'api/documents/update-upload-document',
        method: 'POST',
        removeAfterUpload: true
    });

    @ViewChild('uploadFormDirective', { static: true }) uploadFormNgForm;

    typeId: any;
    @Input('type') type: string;

    constructor(
        private activatedRoute: ActivatedRoute,
        public http: HttpClient,
        public _fb: FormBuilder,
        public auth: Auth,
        public messageService: MessageService,
        private router: Router,
        public confirmationService: ConfirmationService,
        private _location: Location,
        public householdService: HouseholdService,
        public fundService: FundService
    ) {

        this.householdService.$householdUuid
            .subscribe(
                (res) => {
                    if (Object.keys(res).length > 0) {
                        this.householdId = res.id;
                    }
                }
            );

        this.fundService.$fundUuid
            .subscribe(
                (res) => {
                    if (Object.keys(res).length > 0) {
                        this.fundId = res.id;
                        this.uuid = res.uuid;
                    }
                }
            );

        this.documentUploader.onCompleteItem = (item: any, res: any) => {
            this.loader = true;
            let response = JSON.parse(res);
            this.updateFilterSidebar(response.response, 'add');
            this.paginateDocuments();
            jQuery('#createDocumentModal').modal('hide');
            this.uploadFormActionDisable = false;
            this.tags = [];
        };

        this.modelUpdateDocument.onCompleteItem = (item: any, res: any) => {
            let response = JSON.parse(res);
            this.updateFilterSidebar(response.response, 'update');
            this.modelUpdateDocumentClose();
        };
    }

    ngOnInit() {
        this.todayDate = new Date();

        this.activatedRoute.params.subscribe((params: Params) => {
            if (this.type == 'fund') {
                this.typeId = this.fundId;
            } else {
                this.typeId = this.householdId;
            }
        });

        /*this.uploadForm = this._fb.group({
            documentName:[moment(new Date()).format('MM-DD-YYYY'), Validators.required],
            documentType:['generalDocument'],
            householdId:[this.typeId],
            householdName:[''],
            upload:['',[]],
            document_id:[''],
            empId:[''],
            employeeName:[''],
        });*/
        this.uploadForm = this._fb.group({
            documentName: [
                moment(new Date()).format('MM-DD-YYYY'),
                Validators.required
            ],
            documentType: ['generalDocument'],
            upload: ['', []],
            document_id: [null]
        });

        this.getDocumentsTag('tags,user');
        this.paginateDocuments();
    }

    modelUpdateDocumentClose() {
        jQuery('#modelEditDocument').modal('hide');
        this.loader = true;
        //this.getDocumentsTag('tags,user');
        this.updateFormActionDisable = false;
        this.tags = [];
    }

    // get sidebar filters
    getDocumentsTag(keys: string): void {
        let filters = this.filters(keys).subscribe(
            res => {
                this.documentTags = res.tags;
                this.createdBy = res.user;
            },
            error => { }
        );
    }

    //sidebar filters observable
    filters(keys: string): Observable<any> {
        return (
            this.http
                .get<any>(`api/filter-documents/${this.type}/${this.typeId}/filters?keys=${keys}`)
                .pipe(
                    map(res => {
                        return res.response;
                    })
                )
        );
    }

    paginateDocuments() {
        this.loader = true;
        var postData = {
            pageNo: this.page,
            paginationPerPage: this.paginationPerPage,
            filter: this.filter
        };
        this.http
            .post<any>(
                `api/filter-documents/${this.type}/${this.typeId}/documents`,
                postData
            )
            .subscribe(
                res => {
                    this.documents = res.response.data;
                    this.paginationTotal = res.response.total;
                    this.loader = false;
                },
                error => { }
            );
    }

    filterDocuments(type, value, index: any) {
        switch (type) {
            case 'tag':
                var checkExist = this.filter.tag.findIndex(item => item == value);
                if (checkExist !== -1) {
                    this.filter.tag.splice(checkExist, 1);
                } else {
                    this.filter.tag.push(value);
                    this.documentTags[index]['checked'] = true;
                }
                break;
            case 'user':
                var checkExist = this.filter.user.findIndex(item => item == value);
                if (checkExist !== -1) {
                    this.filter.user.splice(checkExist, 1);
                } else {
                    this.filter.user.push(value);
                    this.createdBy[index]['checked'] = true;
                }
                break;
            case 'date':
                this.filter.date[0] = this.filter_from;
                this.filter.date[1] = this.filter_to;
                break;
        }
        this.paginateDocuments();
    }

    resetFilter() {
        this.filter_from = '';
        this.filter_to = '';
        this.filter = { tag: [], user: [], date: [] };
        this.documentTags.forEach((item: any) => {
            item.checked = false;
        });
        this.createdBy.forEach((item: any) => {
            item.checked = false;
        });
        this.paginateDocuments();
    }

    pageChange(event) {
        this.page = event;
        this.paginateDocuments();
    }

    downloadDocument(documentData) {
        this.http
            .get<any>(`api/documents/download-url/${documentData.uuid}`)
            .subscribe(
                res => {
                    window.open(res.response.url, '_blank');
                },
                error => { }
            );
    }

    add(event: MatChipInputEvent): void {
        const input = event.input;
        const value = event.value;

        if ((value || '').trim()) {
            this.tags.push(value.trim());
        }

        // Reset the input value
        if (input) {
            input.value = '';
        }
    }

    remove(tags): void {
        const index = this.tags.indexOf(tags);

        if (index >= 0) {
            this.tags.splice(index, 1);
        }
    }

    openCreateDocumentmodel() {
        this.uploadFormNgForm.resetForm();
        this.tags = [];
        this.uploadForm.patchValue({
            documentName: moment(new Date()).format('MM-DD-YYYY'),
            documentType: 'generalDocument',
            householdId: this.typeId
        });
    }

    uploadFiles() {
        this.documentUploader.onAfterAddingFile = () => {
            this.uploadFormActionDisable = false;
            if (this.documentUploader.queue.length > 1) {
                this.documentUploader.removeFromQueue(this.documentUploader.queue[0]);
            }
        };
    }

    uploadUpdateFiles() {
        this.modelUpdateDocument.onAfterAddingFile = () => {
            this.updateFormActionDisable = false;
            if (this.modelUpdateDocument.queue.length > 1) {
                this.modelUpdateDocument.removeFromQueue(
                    this.modelUpdateDocument.queue[0]
                );
            }
        };
    }

    onUpdateUploadsubmits() {
        if (this.uploadForm.valid) {
            this.updateFormActionDisable = true;
            const authHeader: Array<{
                name: string;
                value: string;
            }> = [];
            authHeader.push({
                name: 'Authorization',
                value: 'Bearer ' + this.auth.getToken()
            });

            switch (this.type) {
                case 'fund-manager':
                    this.uploadForm.setControl(
                        'fund_manager_id',
                        new FormControl(this.typeId)
                    );
                    break;
                case 'fund':
                    this.uploadForm.setControl('fund_id', new FormControl(this.typeId));
                    break;
                default:
                    this.uploadForm.setControl(
                        'householdId',
                        new FormControl(this.typeId)
                    );
                    break;
            }

            this.uploadForm.value['tags'] = this.tags;

            if (this.modelUpdateDocument.queue.length > 0) {
                const uploadOptions = <FileUploaderOptions>{
                    headers: authHeader,
                    additionalParameter: this.uploadForm.value
                };
                this.modelUpdateDocument.setOptions(uploadOptions);
                this.modelUpdateDocument.uploadAll();
            } else {
                this.http
                    .post<any>(
                        'api/documents/update-upload-document',
                        this.uploadForm.value
                    )
                    .subscribe(
                        res => {
                            this.updateFilterSidebar(res.response, 'update');
                            this.modelUpdateDocumentClose();
                        },
                        error => { }
                    );
            }
        }
    }

    modelUploads(document?: any) {
        this.uploadForm.reset();
        this.uploadFormNgForm.submitted = false;
        if (document.id) {
            //set old date as documentName on insert
            this.uploadForm.patchValue({
                documentName: document.document_title,
                documentType: 'generalDocument'
                /*householdId:[this.typeId],
                        householdName:[''],*/
            });
        }
        this.tags = [];
        if (document.tags.length > 0) {
            document.tags.forEach((tag: any) => {
                this.tags.push(tag.tag);
            });
        }
        if (document) {
            this.uploadForm.patchValue({ document_id: document.id });
        }
    }

    onUploadsubmits() {
        if (this.uploadForm.valid) {
            this.uploadFormActionDisable = true;
            const authHeader: Array<{
                name: string;
                value: string;
            }> = [];
            authHeader.push({
                name: 'Authorization',
                value: 'Bearer ' + this.auth.getToken()
            });

            switch (this.type) {
                case 'fund-manager':
                    this.uploadForm.setControl(
                        'fund_manager_id',
                        new FormControl(this.typeId)
                    );
                    break;
                case 'fund':
                    this.uploadForm.setControl('fund_id', new FormControl(this.typeId));
                    break;
                default:
                    this.uploadForm.setControl(
                        'householdId',
                        new FormControl(this.typeId)
                    );
                    break;
            }

            if (this.tags.length > 0) {
                this.uploadForm.value['tags'] = this.tags;
            }

            const uploadOptions = <FileUploaderOptions>{
                headers: authHeader,
                additionalParameter: this.uploadForm.value
            };
            this.documentUploader.setOptions(uploadOptions);
            this.documentUploader.uploadAll();
        }
    }

    closeModel() {
        this.tags = [];
    }

    public fileOverBase(e: any): void {
        this.hasBaseDropZoneOver = e;
    }

    fundManagerInit(): void { }

    deleteDocumentPopup(info) {
        this.confirmationService.confirm({
            message: 'Are you sure that you want to delete document ?',
            accept: () => {
                this.deleteDocument(info.id);
            },
            reject: () => { }
        });
    }

    deleteDocument(id) {
        this.loader = true;
        this.http.delete<any>(`api/documents/${id}`).subscribe(
            res => {
                this.updateFilterSidebar(res.response, 'update');
            },
            () => { }
        );
    }

    updateFilterSidebar(input: any, action) {
        if (input.hasOwnProperty('tags')) {
            let documentTags = input.tags;
            documentTags.forEach((item: any) => {
                var index = this.documentTags.findIndex(
                    (tag: any) => tag.tag == item.tag
                );
                if (index == -1) {
                    this.documentTags.push(item);
                }
            });
        }

        //new created by user append to filter users
        if (input.hasOwnProperty('user')) {
            let created_user = input.user;
            var index = this.createdBy.findIndex(
                (user: any) => user.id == created_user.id
            );
            if (index == -1) {
                this.createdBy.push(created_user);
            }
        }

        if (action == 'update') {
            this.updateSidebar().then(() => {
                this.paginateDocuments();
            });
        }
    }

    /*
     * Update sidebar without refresh page
     */
    updateSidebar(): Promise<any> {
        let promise = new Promise((resolve, reject) => {
            let filters = this.filters('tags').subscribe(
                res => {
                    let finalTags = [];
                    this.documentTags.forEach((tag: any) => {
                        let index = res.tags.findIndex((item: any) => item.tag == tag.tag);
                        if (index > -1) {
                            finalTags.push(tag);
                        } else {
                            if (tag.checked == true) {
                                const index: number = this.filter.tag.indexOf(tag.tag);
                                if (index !== -1) {
                                    this.filter.tag.splice(index, 1);
                                }
                            }
                        }
                    });
                    this.documentTags = finalTags;
                    resolve(true);
                },
                error => {
                    reject(true);
                }
            );
        });

        return promise;
    }

    // redirect fund page
    redirectBack() {
        this._location.back();
    }
}
