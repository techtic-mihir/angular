import { Component, OnInit, ViewChild, NgModule, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Validators, FormGroup, FormArray, FormBuilder, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { of as observableOf, Subject, Observable, forkJoin } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import * as moment from 'moment/moment';
import { MessageService } from 'primeng/api';
import { ExcelService, AppSettingsService } from '../../services';

import { CurrencyPipe } from '@angular/common';
declare var jQuery: any;

@Component({
    selector: 'common-query-builder',
    templateUrl: './common-query-builder.component.html',
    styleUrls: ['./common-query-builder.component.scss'],
    providers: [MessageService, CurrencyPipe]
})

export class CommonQueryBuilderComponent implements OnInit {
    @Output() queryAdded = new EventEmitter();

    quickActions = [];

    queryForm: FormGroup;
    groups: any = [];
    sections: any = [];
    fields: any = [];
    operators: any = [];
    queryArray: any = [];
    removable = true;
    editbtn: boolean = false;
    editIndex: number = -1;
    clients: any = [];
    loader: boolean = false;
    paginationTotal: any = 6;
    paginationPerPage: any = 10;
    page = 1;
    query_field_id = 0;
    value_field: boolean = false;
    value_array: any = [];
    table_fields: any = [];
    bind_fields: any = [];
    filteredOptions: Observable<string[]>;
    selectedValue: any = [];
    fieldType: any = '';
    queryName: any = '';
    fieldName: any = '';
    smartSet: any;
    savedQuery = [];
    savedQueryId: any = '';
    text_field: boolean = true;
    extra_field: boolean = false;
    fieldTypes: any = [];
    options = [
        { label: 'Days', value: 'days' },
        { label: 'Weeks', value: 'weeks' },
        { label: 'Months', value: 'months' }
    ];
    @ViewChild('queryFormDirective', { static: true }) queryNgForm;
    @Input('type') type: string;
    @Input('input') input: any = [];
    extraFields: any = [];
    selectedExtraFields: any = [];
    settings: any = {};
    count_loader: boolean = false;
    operatorList = [
        'Current Year',
        'Current Month',
        'Current Week',
        'Current Day',
        'Previous Business Day',
        'Past month',
        'Past week',
        'Upcoming'
    ];

    taskOptions = [
        { label: 'Due Today', value: 'due today' },
        { label: 'All', value: 'all' }
    ];

    constructor(
        public router: Router,
        public http: HttpClient,
        private messageService: MessageService,
        public _fb: FormBuilder,
        public excelService: ExcelService,
        private currencyPipe: CurrencyPipe,
        private appSettingsService: AppSettingsService
    ) {
        appSettingsService.$settings.subscribe((settings: any) => {
            this.settings = settings;
        });
    }

    ngOnInit() {
        this.queryForm = this._fb.group({
            group: [''],
            section: [''],
            field: [''],
            operator: [''],
            textDate: [''],
            text: [''],
            period: [''],
            periodValue: [''],
            taskOption: ['']
        });
        this.getQuery('group', null);
        this.getSavedQuery();
        this.getFieldTypes();
        this.getFields();
        this.getQueryFields();

        this.filteredOptions = this.queryForm.controls.text.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value))
        );
        if (this.input.length > 0) {
            this.queryArray = this.input;
        }
    }

    valueChanged(value) {
        if (value && (this.queryForm.controls.operator.value == 'in' || this.queryForm.controls.operator.value == 'not in')) {
            if (this.selectedValue.length > 0) {
                let index = this.selectedValue.findIndex(function (item) {
                    return item.value == value.value;
                });
                if (index != -1) {
                    return;
                }
            }
            this.selectedValue.push(value);
        }
    }

    removeSelectedValue(value) {
        let index = this.selectedValue.findIndex(function (item) {
            return item.value == value.value;
        });
        this.selectedValue.splice(index, 1);
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.value_array.filter(option =>
            option.value.toLowerCase().includes(filterValue)
        );
    }

    getQuery(field, value): any {
        this.value_field = false;
        this.value_array = [];
        this.selectedValue = [];
        this.fieldType = '';
        this.extra_field = false;

        this.fieldName = (field == 'fields') ? 'field' : field;
        var api = 'api/query/' + field;

        if (value != null) {
            value = value == '% held' ? 'per_held' : value;
            api = api + '/' + value;
        }
        this.loader = true;
        this.http.get<any>(api).subscribe(
            res => {
                this.loader = false;
                var nextField = '';
                var patchFields = {};
                switch (field) {
                    case 'group':
                        patchFields = {
                            section: '',
                            field: '',
                            operator: '',
                            textDate: '',
                            text: ''
                        };
                        this.groups = res.response;
                        nextField = 'section';
                        break;
                    case 'section':
                        patchFields = {
                            section: '',
                            field: '',
                            operator: '',
                            textDate: '',
                            text: ''
                        };
                        this.sections = res.response;
                        nextField = 'fields';
                        break;
                    case 'fields':
                        patchFields = {
                            field: '',
                            operator: '',
                            textDate: '',
                            text: ''
                        };
                        this.fields = res.response;
                        nextField = 'operator';
                        break;
                    case 'operator':
                        patchFields = {
                            operator: '',
                            textDate: '',
                            text: ''
                        };
                        this.operators = res.response.operators;
                        this.query_field_id = res.response.id;
                        break;
                }

                let result = res.response;

                if (result.length == 1) {
                    patchFields[this.fieldName] = result[0];
                    this.getQuery(nextField, result[0]);
                }

                this.queryForm.patchValue(patchFields);
            },
            error => {
                this.loader = false;
            }
        );
    }

    getEditQuery(index) {

        this.query_field_id = this.queryArray[index].query_field_id;
        if (this.queryArray[index].selectedValue.length > 0) {
            this.selectedValue = this.queryArray[index].selectedValue;
        }
        this.http.post<any>(`api/query/edit`, this.queryArray[index]).subscribe(
            res => {
                this.sections = res.response.section;
                this.fields = res.response.field;
                this.operators = res.response.operator;
                var editQuery = this.queryArray[index];

                this.editIndex = index;
                this.editbtn = true;
                this.extra_field = false;

                if (res.response.inputs.data.length > 0) {
                    this.value_field = false;
                    this.value_array = res.response.inputs.data;
                } else {
                    this.value_field = true;
                    this.fieldType = res.response.inputs.type;
                    if ((editQuery.operator == 'equals' || editQuery.operator == 'not equals') && (editQuery.field == 'Accounts' || editQuery.field == 'Account Open' || editQuery.field == 'Advisor Start Date')) {
                        this.fieldType = 'date';
                    }
                }
                this.queryForm.patchValue(editQuery);

                if (this.operatorList.indexOf(this.queryForm.controls.operator.value) !== -1) {
                    this.text_field = false;
                    this.queryForm.patchValue({ text: '' });
                } else {
                    this.text_field = true;
                }

                if (editQuery.operator == 'Upcoming') {
                    this.extra_field = true;
                    this.value_field = false;
                    this.setInputValidate();
                }
            },
            error => { }
        );
        console.log(this.selectedValue);
        console.log(this.queryArray);
    }

    getFieldCollection() {
        this.http.get<any>(`api/query/All/All`).subscribe(res => {

        });
    }

    checkFieldShown(field) {
        return this.table_fields && this.table_fields.indexOf(field) >= 0
            ? true
            : false;
    }

    getInput() {
        if (this.queryForm.controls.operator.value != 'in' || this.queryForm.controls.operator.value != 'not in') {
            this.selectedValue = [];
        }

        if (this.operatorList.indexOf(this.queryForm.controls.operator.value) !== -1) {
            this.text_field = false;
            this.queryForm.patchValue({ text: '' });
        } else {
            this.text_field = true;
        }

        this.extra_field = false;
        this.queryForm.get('period').clearValidators();
        this.queryForm.get('periodValue').clearValidators();

        if (this.queryForm.controls.operator.value == 'Upcoming') {
            this.extra_field = true;
            this.setInputValidate();
        } else {
            this.queryForm.get('period').setValue('');
            this.queryForm.get('periodValue').setValue('');
        }

        this.queryForm.get('periodValue').updateValueAndValidity();
        this.queryForm.get('period').updateValueAndValidity();
        this.queryForm.patchValue({
            textDate: '',
            text: ''
        });

        this.http.get<any>(`api/query/inputs/${this.query_field_id}`).subscribe(
            res => {
                if (res.response) {
                    if (res.response.data) {
                        if (res.response.data.length > 0) {
                            this.value_field = false;
                            this.value_array = res.response.data;
                        } else {
                            this.value_field = true;
                            this.fieldType = res.response.type;
                            let opVal = this.queryForm.controls.operator.value;
                            let fieldVal = this.queryForm.controls.field.value;
                            if ((opVal == 'equals' || opVal == 'not equals') && (fieldVal == 'Accounts' || fieldVal == 'Account Open' || fieldVal == 'Advisor Start Date')) {
                                this.fieldType = 'date';
                            }
                        }
                    }
                }
            },
            error => { }
        );
    }

    addQuery() {
        if (this.queryForm.valid) {
            var query = {
                group: this.queryForm.value.group,
                section: this.queryForm.value.section,
                field: this.queryForm.value.field,
                operator: this.queryForm.value.operator,
                text: this.queryForm.value.text ? this.queryForm.value.text : '',
                query_field_id: this.query_field_id,
                selectedValue: this.selectedValue,
                textDate: this.queryForm.value.textDate
                    ? this.queryForm.value.textDate
                    : null,
                count: 0,
                period: this.queryForm.value.period,
                periodValue: this.queryForm.value.periodValue,
                taskOption: this.queryForm.value.taskOption
            };
            if (this.editIndex != -1) {
                this.queryArray[this.editIndex] = query;
                this.editIndex = -1;
            } else {
                this.queryArray.push(query);
            }
            this.page = 1;
            this.executeQuery();
            this.resetQueryFilter();
        }
    }

    executeQuery() {
        if (this.queryArray.length == 0) {
            this.paginationTotal = 6;
            this.clients = [];
            this.getQuery('group', null);
            return;
        }
        this.loader = true;
        this.count_loader = true;
        if (this.queryArray[0].group == 'Tasks') {
            this.selectedExtraFields = [];
        }
        let postData = {
            pageNo: this.page,
            paginationPerPage: this.paginationPerPage,
            fields: this.selectedExtraFields,
            query: this.queryArray
        };
        this.http.post<any>(`api/query/execute`, postData).subscribe(
            res => {
                let response = res.response.data;
                this.paginationTotal = response.total;
                this.table_fields = res.response.fields;
                if (this.selectedExtraFields == null || this.selectedExtraFields.length == 0) {
                    this.selectedExtraFields = res.response.fields;
                }
                this.bind_fields = res.response.bind_fields;
                this.clients = response.data;
                this.loader = false;
                this.count_loader = false;
                this.queryArray = res.response.query;
                this.queryAdded.emit(this.queryArray);
                this.extra_field = false;
            },
            error => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error ',
                    detail: 'Failed to Execute Query'
                });
                this.loader = false;
            }
        );
    }

    saveQueryBox() {
        var saveData = {
            queryData: this.queryArray,
            queryName: this.queryName,
            existQuery: this.savedQueryId ? this.savedQueryId : '',
            smartSet: this.smartSet ? this.smartSet : ''
        };
        this.http.post<any>(`api/query/save`, saveData).subscribe(
            res => {
                this.getSavedQuery();
                this.queryName = '';
                this.queryArray = [];
                this.resetQueryFilter();
                this.resetQueryBox();
                this.savedQueryId = '';
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Query Save Successfully.'
                });
                setTimeout(function () {
                    jQuery('#saveQueryModal').modal('hide');
                }, 100);
            },
            error => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error ',
                    detail: 'Failed to Save Query'
                });
            }
        );
    }

    getSavedQuery() {
        this.http.get<any>(`api/query/saved`).subscribe(
            res => {
                this.savedQuery = res.response;
            },
            error => { }
        );
    }

    executeSaveQuery(index) {
        this.queryArray = [];
        this.queryArray = this.savedQuery[index].query;
        this.queryAdded.emit(this.queryArray);
        this.executeQuery();
        this.getQuery('group', null);
    }

    pageChange(event) {
        this.page = event;
        this.executeQuery();
    }

    resetQueryFilter() {
        this.editIndex = -1;
        this.editbtn = false;
        this.value_field = false;
        this.value_array = [];
        this.selectedValue = [];
        this.queryForm.patchValue({
            group: '',
            section: '',
            field: '',
            operator: '',
            textDate: '',
            text: '',
            period: '',
            periodValue: '',
            taskOption: ''
        });

        this.queryForm.get('period').clearValidators();
        this.queryForm.get('periodValue').clearValidators();
        this.queryForm.get('periodValue').updateValueAndValidity();
        this.queryForm.get('period').updateValueAndValidity();
        this.getQuery('group', null);
    }

    resetQueryBox() {
        this.queryArray = [];
        this.resetQueryFilter();
        this.paginationTotal = 6;
        this.clients = [];
        this.savedQueryId = '';
        this.table_fields = [];
    }

    remove(index): void {
        if (index >= 0) {
            this.queryArray.splice(index, 1);
            this.executeQuery();
        }
    }

    selectChanged(value) {
        let date;
        if (this.queryForm.value.operator == "Range") {
            date = { begin: moment(value.begin).format('MM-DD-YYYY'), end: moment(value.end).format('MM-DD-YYYY') }

        } else {
            date = moment(value).format('MM-DD-YYYY')
        }
        this.queryForm.patchValue({
            text: date
        });
    }

    setInputValidate() {
        if (this.queryNgForm) {
            this.queryNgForm.submitted = false;
        }
        //set validation
        this.queryForm.get('period').setValidators([Validators.required]);
        this.queryForm
            .get('periodValue')
            .setValidators([Validators.required, Validators.min(1)]);
    }

    exportAsXLSX(): void {
        this.loader = true;
        var postData = {
            pageNo: this.page,
            paginationPerPage: this.paginationPerPage,
            fields: this.selectedExtraFields,
            query: this.queryArray
        };
        this.http.post<any>(`api/query/export-result`, postData).subscribe(
            res => {
                var response = res.response;
                let data = response.results;
                let headers = response.fields;
                let fields = response.bindFields;
                let jsondata = [];

                /* forEach cannot loop through an object. Changing to for-of syntax */
                for (let obj of data) {
                    let row = {};
                    fields.forEach((field: string, key) => {
                        if (obj.hasOwnProperty(field)) {
                            let column = field.replace(/_/g, ' ');
                            column = headers[key];
                            switch (field) {
                                case 'balance':
                                case 'amount':
                                case 'net_worth':
                                case 'market_value':
                                    row[column] = this.currencyPipe.transform(obj[field], 'USD', true);
                                    break;

                                case 'advisement_date':
                                case 'date':
                                case 'first_monies':
                                case 'dob':
                                case 'billing_date':
                                case 'advisor_start_date':
                                case 'account_opened_date':
                                case 'due_date':
                                    if (obj[field]) {
                                        row[column] = moment(obj[field]).format('MM-DD-YYYY')
                                    }
                                    break;
                                case 'start':
                                    if (obj[field]) {
                                        row[column] = moment(obj[field]).format('MM-DD-YYYY h:mm a')
                                    }
                                    break;

                                default:
                                    row[column] = obj[field];
                                    break;
                            }
                        }
                    });

                    jsondata.push(row);
                }

                this.excelService.exportAsExcelFile(
                    jsondata,
                    headers,
                    'Benjamin-Intelligence'
                );
                this.loader = false;
            },
            error => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error ',
                    detail: 'Failed to Execute Query'
                });
                this.loader = false;
            }
        );
    }

    openFieldsModal() {
        setTimeout(function () {
            jQuery('#tableFields').modal('show');
        }, 200);
    }

    checkFields(val) {
        if (this.table_fields.indexOf(val) >= 0) {
            return true;
        } else {
            return false;
        }
    }

    getFieldTypes() {
        let types: any = [];
        if (this.settings.instance_type == 'fund') {
            types = ['General'];
        } else {
            types = ['General', 'Family', 'Securities'];
        }
        var resultArray = [];

        forkJoin(
            this.http.get<any>(`api/query/fields/General`),
            this.http.get<any>(`api/query/fields/Family`),
            this.http.get<any>(`api/query/fields/Securities`)
        ).subscribe(
            data => {
                resultArray = [
                    { type: 'General', fields: data[0]['response'] },
                    { type: 'Family', fields: data[1]['response'] },
                    { type: 'Securities', fields: data[2]['response'] }
                ]

                this.fieldTypes = resultArray;
            },
            err => { }
        );
    }

    getFields() {
        this.http.get<any>(`api/query/All/All`).subscribe(
            res => {
                this.extraFields = res.response;

            },
            error => { }
        );
    }

    addFields(value) {
        this.selectedExtraFields = JSON.parse(
            JSON.stringify(this.selectedExtraFields)
        );

        if (!this.selectedExtraFields.find(e => e === value)) {
            this.selectedExtraFields.push(value);
        } else {
            let index = this.selectedExtraFields.findIndex(function (item) {
                return item == value;
            });
            this.selectedExtraFields.splice(index, 1);
        }
    }

    updateQueryFields() {
        this.http
            .post<any>(`api/query/save-fields`, { fields: this.selectedExtraFields })
            .subscribe(
                res => {
                    this.executeQuery();
                },
                error => { }
            );
    }

    getQueryFields() {
        this.http.get<any>(`api/query/fields`).subscribe(
            res => {
                this.selectedExtraFields = res.response;
            },
            error => { }
        );
    }

    isTaskGroup() {
        var t = this.queryArray.find(query => query['group'] === 'Tasks');
        if (t) {
            return false;
        }
        return true;
    }
}
