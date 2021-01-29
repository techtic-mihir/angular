import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuestionnaireService } from '../../../shared/services/questionnaire.service';
import * as _ from "lodash";
import { FlashMessagesService } from '../../../shared/modules/flash-messages/flash-messages.service';
import { NgbDateStruct, NgbInputDatepicker, NgbModalRef, NgbModalOptions, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddDocumentComponent } from 'src/app/shared/component/add-document/add-document.component';
import { AddDocumentLinkComponent } from 'src/app/shared/component/add-document-link/add-document-link.component';
import { DocumentService, ApiService, UserService } from 'src/app/shared/services';
import { DomSanitizer } from '@angular/platform-browser';
import { AssessmentDocumentsComponent } from 'src/app/shared/component/modal/assessment-documents/assessment-documents.component';
import { CurrentUser } from 'src/app/shared/model/current-user';
import * as moment from 'moment';

@Component({
    selector: 'sd-question-survey-v2',
    templateUrl: './survey-v2.component.html',
    styleUrls: ['./survey-v2.component.scss']
})
export class SurveyV2Component implements OnInit, OnDestroy {

    @ViewChild('startDatePicker', { static: false }) startDatePicker: NgbInputDatepicker;
    @ViewChild('endDatePicker', { static: false }) endDatePicker: NgbInputDatepicker;

    private _ngOnDestroy$: ReplaySubject<boolean> = new ReplaySubject(1);
    questionForm: FormGroup;
    uuid: string;
    questionnaire: any;
    questionsData: any = {};
    parentData: any = {};
    childData: any = {};
    questions: FormArray;
    loop: number = 0;
    categories: any;
    startDate: NgbDateStruct;
    endDate: NgbDateStruct;
    ngbModalOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: false
    };
    savedDocuments: any = [];
    savedDocumentIds: any = [];
    assignedCategory: any = [];
    results: any;
    categoryUsers: any = [];
    setItemState: any = {};
    personalizationState: boolean = false;
    questionLength: number = 0;
    chartData: any;
    downloadFlag: boolean;
    downloadURL: any;
    scoreProgress: any = 0;
    dialScoreProgress: any = 0;
    counter: number = 0;
    currentUser: CurrentUser;
    currentDate: string = moment(new Date()).format('MM-DD-YYYY');

    constructor(
        private questionnaireService: QuestionnaireService,
        private flashMessagesService: FlashMessagesService,
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private modal: NgbModal,
        private apiService: ApiService,
        private documentService: DocumentService,
        private sanitizer: DomSanitizer,
        private userService: UserService
    ) {
        this.route.params.subscribe(params => {
            this.uuid = params['uuid'];
        });
        this.userService.currentUser.subscribe(curUser => {
            this.currentUser = curUser;
        });
    }

    ngOnInit() {
        this.questionForm = this.formBuilder.group({
            uuid: [this.uuid],
            assign: [false],
            assignUsers: this.formBuilder.array([]),
            autoScore: [false],
            autoTask: [false],
            requestEvidence: [false],
            startDate: [''],
            endDate: [''],
            name: [''],
            description: [''],
            questions: this.formBuilder.array([]),
            cmmcQuestions: this.formBuilder.array([])
        });

        this._getQuestionnaire();
        setInterval(() => {
            if (Object.keys(this.questionsData).length) {
                this.onSubmit(true);
            }
        }, 30000);
    }

    ngOnDestroy() {
        this._ngOnDestroy$.next(true);
        this._ngOnDestroy$.complete();
    }

    private get questionsArray() {
        return this.questionForm.get('questions') as FormArray;
    }

    private _createCMMCQuestion(question: any): FormGroup {
        return this.formBuilder.group({
            question_id: [question.id],
            question: [question.question],
            answer: []
        });
    }

    private _createQuestion(question: any): FormGroup {
        return this.formBuilder.group({
            question_id: [question.id],
            question: [question.question],
            answer: [],
            autoscore: [question.autoscore],
            autotask: [question.autotask],
            notable_practice: [''],
            follow_up: [''],
            require_note: ['']
        });
    }

    private get usersArray() {
        return this.questionForm.get('assignUsers') as FormArray;
    }

    private _createUsers(users: any, category: any): FormGroup {
        let isAssigned = this.assignedCategory.includes(category.id) ? true : false;
        let user = (users != null) ? users[0] : null;

        return this.formBuilder.group({
            categoryId: [category.id],
            isAssigned: [isAssigned],
            users: [user]
        });
    }

    private _getCategories() {
        this.questionnaireService.getAllCategories()
            .pipe(
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe((res: any) => {
                if (res['success']) {
                    let { data } = res;
                    this.categories = data;
                }
            });
    }

    private _getQuestionnaire() {
        this.questionnaireService.getQuestionnaireV2ById(this.uuid)
            .pipe(
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe((res: any) => {
                if (res['success']) {
                    let { data } = res;
                    this.questionnaire = data;

                    if (this.questionnaire && this.questionnaire.questionCategory) {
                        let assignedUserCategory;
                        assignedUserCategory = this.questionnaire.questionCategory.filter(
                            (item) => !!(this.questionnaire.userAssignedCategory.find((cat) => cat.category_id === item.id))
                        );

                        if (assignedUserCategory.length > 0) {
                            this.questionnaire.questionCategory = assignedUserCategory;
                        }
                    }

                    this._mappedPersonalization();
                    this._setCategoryUsers();
                }
            });
    }

    computeAutoScoring() {
        this.questionnaireService.computeAutoScoring(this.uuid)
            .pipe(
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe(() => {
                this.flashMessagesService.show("Program scored successfully", {
                    cssClass: "alert-success",
                });
                //this.scoreProgress = res.data;
                //this.dialScoreProgress = (this.scoreProgress / 100) * 180;
            });
    }

    getDialColor(progress: any) {
        var dialColor;
        dialColor = 'dial-content ';
        if (progress != undefined) {
            if (progress < 10) {
                dialColor = dialColor + 'dial-c-10';
            } else if (progress < 20) {
                dialColor = dialColor + 'dial-c-20'
            } else if (progress < 30) {
                dialColor = dialColor + 'dial-c-30'
            } else if (progress < 40) {
                dialColor = dialColor + 'dial-c-40'
            } else if (progress < 50) {
                dialColor = dialColor + 'dial-c-50'
            } else if (progress < 60) {
                dialColor = dialColor + 'dial-c-60'
            } else if (progress < 70) {
                dialColor = dialColor + 'dial-c-70'
            } else if (progress < 80) {
                dialColor = dialColor + 'dial-c-80'
            } else if (progress < 90) {
                dialColor = dialColor + 'dial-c-90'
            } else if (progress <= 100) {
                dialColor = dialColor + 'dial-c-100'
            }
        }
        return dialColor;
    }

    exportAssessment(type: string) {
        this.questionnaireService.exportAssessment(this.uuid, type)
            .pipe(
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe((res: any) => {
                if (res['success']) {
                    let { data } = res;
                    this.downloadFlag = false;
                    this.downloadURL = this.sanitizer.bypassSecurityTrustResourceUrl(data);
                    this.downloadFlag = true;
                }
            });
    }

    getQuestionsByCategory(category: any) {
        if (this.questionsData[category.id] == undefined) {
            this.questionnaireService.getQuestionsByCategory(this.counter, category.id, this.uuid)
                .pipe(
                    takeUntil(this._ngOnDestroy$)
                )
                .subscribe((res: any) => {
                    if (res['success']) {
                        let { data } = res;
                        data.parent_questions.forEach((questions: any) => {
                            questions.forEach((question: any) => {
                                question.documents.forEach((document: any) => {
                                    document.docType = this.documentService.getDocumentType(document.title);
                                });
                            });
                        });
                        data.questions.forEach((question: any) => {
                            question.documents.forEach((document: any) => {
                                document.docType = this.documentService.getDocumentType(document.title);
                            });
                        });

                        this.questionsData[category.id] = data.questions;
                        this.parentData[category.id] = data.parent_questions;
                        this.childData[category.id] = data.questions.filter((v: any) => v.parent_id != null);

                        this.counter = this.counter + this.questionsData[category.id].length;
                        this._mappedFormGroup(category);
                    }
                });
        }
    }

    getQuestionControl(question: any) {
        let index = this.questionsArray.controls.findIndex((v: any) => v.value.question_id == question.id);
        return this.questionsArray.controls[index];
    }

    setState(state: boolean) {
        this.personalizationState = state;
    }

    setCmmcAnswer(event: any, index: any) {
        let value = event.target.value;
        const control = this.questionForm.get('cmmcQuestions') as FormArray;
        control.controls[index].patchValue({ "answer": value });
    }

    setAnswer(event: any, question: any, item: any) {
        let value = event.target.value;

        if (question.response_type == 'checkbox') {
            item['checked'] = event.target.checked;
            let checkedValues: any = [];
            question['response_json']['checkbox'].forEach(element => {
                if (
                    element.hasOwnProperty('checked') &&
                    element['checked'] == true
                ) {
                    checkedValues.push(element.value);
                }
            });

            value = checkedValues;
        }
        const control = this.getQuestionControl(question);
        control.get('answer').patchValue(value);

        if (question.default_response) {
            let default_res = question.default_response.split(',');

            if (question.parent_id == null && default_res.includes(value)) {
                this.setChildrenAnswer(question, value);
            }
        }
    }

    setChildrenAnswer(question: any, value: any) {
        let children = this.getChildren(this.childData[question.category_id], question);
        if (children) {
            children.forEach((element: any) => {
                this.setSelectionProperty(element, value);
            });
        }
    }

    getChildren(item: any, parent: any) {
        if (item && parent) {
            return item.filter((child: any) => child.parent_id == parent.id);
        }
    }

    getAssignee(category: any) {
        let item = this.questionnaire.category.find((v: any) => v.category_id == category.id);

        if (item != undefined && item.users && item.users[0]) {
            return item.users[0].fullname;
        }
    }

    search(event: any) { // search a resource
        this.apiService.getRequest('users?name=' + event.query + '&withpartner=1')
            .subscribe((data: any) => {
                this.results = data.data;
            });
    }

    _mappedPersonalization() {
        const formControl = this.questionForm.controls;
        const formData = this.questionnaire;

        if (formData) {
            // this.startDate = DateTimeUtils.momemtToNgbStruct(moment(formData.start_date, 'YYYY-MM-DD'));
            // this.endDate = DateTimeUtils.momemtToNgbStruct(moment(formData.end_date, 'YYYY-MM-DD'));

            this.scoreProgress = formData.score ? formData.score : 0;
            this.dialScoreProgress = (this.scoreProgress / 100) * 180;
            formControl.name.patchValue(formData.name);
            formControl.description.patchValue(formData.description);
            formControl.assign.patchValue(formData.assign);
            formControl.autoScore.patchValue(formData.autoscore);
            formControl.autoTask.patchValue(formData.autotask);
            formControl.requestEvidence.patchValue(formData.request_evidence_collection);
            formData.category.forEach((v: any) => {
                let idx = this.assignedCategory.findIndex((item: any) => item == v.category_id);
                if (idx == -1) {
                    this.assignedCategory.push(v.category_id);
                }
            });

            if (formData.cmmcQuestions) {
                let control = this.questionForm.get('cmmcQuestions') as FormArray;
                formData.cmmcQuestions.forEach((question: any, index: number) => {
                    control.push(this._createCMMCQuestion(question));
                    if (question['answer'] && Object.keys(question['answer']).length > 0) {
                        let { answer } = question;
                        control.controls[index].patchValue({ 'answer': answer['answer'] });
                    }
                });
            }
        }
    }

    _mappedFormGroup(category: any) {
        const controls = this.questionsArray;

        this.questionsData[category.id].forEach((question: any) => {
            controls.push(this._createQuestion(question));
            if (question['answer'] && Object.keys(question['answer']).length > 0) {

                //this.setSelectionProperty(question);

                let { answer } = question;
                const control = this.getQuestionControl(question);

                control.get('answer').patchValue(answer['answer']);
                control.get('require_note').patchValue(answer['require_note']);
                control.get('notable_practice').patchValue(answer['notable_practice']);
                control.get('follow_up').patchValue(answer['follow_up']);
                control.get('autoscore').patchValue(question['autoscore']);
            }
        });

        /*defaultAnswered.length && defaultAnswered.forEach((question: any) => {
            this.setSelectionProperty(question, question['default_response']);
            this.setChildrenAnswer(question, question['default_response']);
        });*/
    }

    setSelectionProperty(question: any, defaultValue: any = null) {
        let answer;
        // if (question['answer'] && Object.keys(question['answer']).length > 0) {
        // 	answer = question['answer']['answer'];
        // } else {
        answer = defaultValue;
        const control = this.getQuestionControl(question);
        control.get('answer').patchValue(defaultValue);
        // }

        if (question['response_type'] == 'checkbox') {
            question['response_json']['checkbox'].forEach((option) => {
                if (typeof answer == 'string') {
                    answer = answer.split(' ');
                }
                option['checked'] = answer.includes(option['value']);
            });
        }
        if (question['response_type'] == 'radio') {
            question['response_json']['radio'].forEach((option) => {
                option['selected'] = (option['value'] == answer) || false;
            });
        }
        if (question['response_type'] == 'scale_radio') {
            question['response_json']['scale_radio'].forEach((option) => {
                option['selected'] = (option['value'] == answer) || false;
            });
        }
    }

    _setCategoryUsers() {
        if (this.categories && this.questionnaire) {
            this.categories.forEach((element: any) => {
                let QuestionnaireCategory = this.questionnaire.category;
                let idx = QuestionnaireCategory.findIndex((v: any) => v.category_id === element.id);

                if (QuestionnaireCategory[idx] != undefined && QuestionnaireCategory[idx].users > 0) {
                    this.usersArray.push(this._createUsers(QuestionnaireCategory[idx].users, element));
                } else {
                    this.usersArray.push(this._createUsers(null, element));
                }
            });
        }
    }

    assignCategory(event: any, category: any) {
        let index = this.assignedCategory.findIndex((v: any) => v == category.id);
        if (event.target.checked && index == -1) {
            this.assignedCategory.push(category.id);
        } else {
            if (index != -1) {
                this.assignedCategory.splice(index, 1);
            }
        }
    }

    updateUser(event: any, i: number) {
        this.usersArray.controls[i].get('users').patchValue(event);
    }

    onSubmit(isDraft = false) {
        if (this.questionForm.invalid) {
            return;
        }

        let data = this.questionForm.value;
        if (this.questionForm.controls.assign) {
            data['assignedCategory'] = this.assignedCategory;
        }
        data['is_draft'] = isDraft;

        // let start_date = DateTimeUtils.ngbStructToMoment(data.startDate);
        // if (start_date) {
        // 	data['startDate'] = start_date.format('YYYY-MM-DD');
        // }
        // let end_date = DateTimeUtils.ngbStructToMoment(data.endDate);
        // if (end_date) {
        // 	data['endDate'] = end_date.format('YYYY-MM-DD');
        // }

        this.questionnaireService.saveAnswer(data)
            .pipe(
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe((res: any) => {
                this.scoreProgress = res.data ? res.data : 0;
                this.dialScoreProgress = (this.scoreProgress / 100) * 180;
                if (!isDraft) {
                    if (res['success']) {
                        this.flashMessagesService.show("Answers saved successfully", { cssClass: 'alert-success' });
                    } else {
                        this.flashMessagesService.show("Failed to save the answers.", { cssClass: 'alert-danger' });
                    }
                }
            }, () => {
                this.flashMessagesService.show("Failed to save the answers.", { cssClass: 'alert-danger' });
            });
    }

    showDocuments(question: any) {
        const modal: NgbModalRef = this.modal.open(AssessmentDocumentsComponent, this.ngbModalOptions);
        modal.componentInstance.question = question;
        modal.componentInstance.newDocuments.subscribe((receivedEntry) => {
            question.documents = receivedEntry;
        });
        modal.result.then(() => {
            //on close
            this.getDocumentsByQuestion(question);
        }, () => {
            // on dismiss
        });
    }

    getDocumentsByQuestion(question: any) {
        this.apiService.getRequest('assessment/documents/' + question.id).subscribe(
            (response: any) => {
                response.data.forEach((doc: any) => {
                    doc.docType = this.documentService.getDocumentType(doc.title);
                });
                question.documents = response.data;
            },
            (error: any) => {
                console.log(error);
            }
        );
    }
}
