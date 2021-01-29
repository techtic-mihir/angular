import { Component, OnInit, ViewChild, NgZone, ElementRef, OnDestroy, HostListener, ViewContainerRef, Input, EventEmitter, Output } from '@angular/core';
import { SocketService, IntegrationsService, Auth, ChatService } from '../../../shared/services';
import { Validators, FormControl, FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { routerTransition } from '../../../router.animations';
import { SlugifyPipe } from '../../../shared/pipes';
import { QuickActionsService } from '../../../shared/services';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import * as moment from 'moment/moment';
import { HighlightTag } from 'angular-text-input-highlight';


declare var jQuery: any;

@Component({
    selector: 'app-quick-chat',
    templateUrl: './quick-chat.component.html',
    styleUrls: ['./quick-chat.component.scss'],
    animations: [routerTransition()],
    providers: [MessageService, SlugifyPipe]
})

export class QuickChatComponent implements OnInit {

    @Input('entity') entity_types;
    @Input('settings') settings;
    @Input('advisors') advisors;

    @Output() chatActionChange = new EventEmitter();
    @Output() chatActionMessage = new EventEmitter();

    @ViewChild('chatFormDirective', { static: false }) chatFormNgForm;
    @ViewChild('customMessage', { static: false }) customMessage: ElementRef;;

    chatForm: FormGroup;

    /*variables*/
    chatFormStep: number = 1;
    chatloader: boolean = false;
    chat_data: any = [];
    advisor_list_show: boolean = false;
    allow_custom_message: boolean = false;
    mention: any = [];
    mention_value: any = [];
    chatFormActionDisable: boolean = false;
    tags: HighlightTag[] = [];

    showEmailsubject: boolean = false;
    quickGroup: any = [];
    current_route: any = [];
    household: any = {};
    householdMembers: any = [];
    entityDropInfo: any = ['Client', 'Prospect', 'Lead'];
    convInfo: any = [];
    sendTypes: any = [];
    intervals: any = [];
    now: any = new Date();
    dynamicFieldsVal: any = [];

    constructor(
        public _fb: FormBuilder,
        private http: HttpClient,
        public chatService: ChatService,
        private messageService: MessageService,
        public router: Router,
        private quickActionsService: QuickActionsService
    ) { }

    ngOnInit() {
        this.chatFormStep = 1;

        this.chatForm = this._fb.group({
            entity: ['', [Validators.required]],
            householdId: ['', []],
            householdName: [''],
            conversation: [''],
            selectConversation: ['', [Validators.required]],
            conversationType: ['one_time'],
            notify: ['', []],
            advisor: this._fb.array([
                this.initAdvisor()
            ]),
            customMessage: ['', []],
            dynamicFields: ['', []],
            selectTime: ['', [Validators.required]],
            dateTime: [''],
            time: [''],
            recurringType: [''],
            assignment_type: ['', []],
            householdMemberId: ['', []],
            householdMemberName: ['', []],
            group_id: ['', []],
            groupName: ['', []],
            employeeId: ['', []],
            employeeName: ['', []],
            optOut: [''],
            salesId: [''],
            custom_library: [''],
            custom_chat_name: [''],
            entityType: [''],
            subject: [''],
            sendFollowup: ['text', [Validators.required]],
        });

        if (this.entity_types.length == 0) {
            this.getEntityTypes();
        }

        this.addDeliveryOptions();

        //get times intervals and subscribe observable for get times any where
        this.quickActionsService.$intervals.subscribe((intervals) => {
            this.intervals = intervals;
        }, (error) => { });
    }

    initAdvisor() {
        return this._fb.group({
            advisor_id: ['']
        });
    }

    addAdvisor() {
        const control = <FormArray>this.chatForm.controls.advisor;
        if (control.length < 5) {
            control.push(this.initAdvisor());
        }
    }

    removeAdvisor(i: number) {
        const control = <FormArray>this.chatForm.controls.advisor;
        if (control.length > 1) {
            control.removeAt(i);
        }
    }


    addDeliveryOptions() {
        setTimeout(() => {
            if (this.settings) {
                var check = this.settings.instance_settings.find(info => info.name == 'conversation_emails');
                if (check && check.value == 'true') {
                    this.sendTypes = [{ value: 'text', label: 'Text' },
                    { value: 'email', label: 'Email' },
                    { value: 'both', label: 'Text & Email' },
                    { value: 'preferred_communication', label: 'Household Default' }]
                } else {
                    this.sendTypes = [{ value: 'text', label: 'Text' },
                    { value: 'preferred_communication', label: 'Household Default' }]
                }
            }
        }, 500);
    }

    //patch data from selected search value
    entitySelect(val) {

        this.convInfo = [];
        var entityType = val.type;
        var conversationType = this.entity_types.find((info) => info.name == entityType);

        if (entityType == 'Groups') {

            this.chatForm.patchValue({
                entity: val.group_name,
                group_id: val.group_id,
                assignment_type: conversationType.id,
                entityType: entityType
            });

            this.convInfo = {
                name: val.group_name,
                email: '',
                phone: '',
                type: entityType
            };
        } else if (entityType == 'Employee') {

            this.chatForm.patchValue({
                entity: val.employeeName,
                employeeId: val.employeeId,
                employeeName: val.employeeName,
                assignment_type: conversationType.id,
                entityType: entityType
            });

            this.convInfo = {
                name: val.employeeName,
                email: '',
                phone: val.employeePhone,
                type: entityType
            };

        } else {

            if (val.lead == 1 && (val.prospect == 0 || val.prospect == null)) {
                entityType = 'Lead';
            } else if (val.prospect == 1 && (val.lead == 0 || val.lead == null)) {
                entityType = 'Prospect';
            }

            this.chatForm.patchValue({
                entity: val.householdMemberFirstName + ' ' + val.householdMemberLastName,
                householdMemberId: val.householdMemberId,
                householdMemberName: val.householdMemberName,
                householdId: val.householdId,
                householdName: val.householdName,
                assignment_type: conversationType.id,
                entityType: entityType
            });

            this.convInfo = {
                name: val.householdName,
                email: val.householdMemberEmail,
                phone: val.memberPhone ? val.memberPhone : val.memberHomePhone,
                type: entityType
            };
        }
        this.getConversationData(conversationType.id);
    }

    //open add new modal
    addNewActionClicked(val) {
        if (val == false) {
            this.chatFormStep = 2;
        }
    }

    //get entity-types
    getEntityTypes() {
        this.chatloader = true;
        this.http.get<any>('api/dashboard/entity-types').subscribe(
            res => {
                this.chatloader = false;
                this.entity_types = res.response;
            },
            () => {
                this.chatloader = false;
            }
        );
    }



    //patch new data from add modal
    patchChatForm(household) {

        this.convInfo = [];

        this.chatForm.patchValue({
            entity: household.name,
            householdMemberId: household.household_members[0].id,
            householdMemberName: household.household_members[0].full_name,
            householdId: household.id,
            householdName: household.name,
            entityType: household.type
        });

        this.convInfo = {
            name: household.name,
            email: household.household_members[0].email,
            phone: household.household_members[0].cell_phone ? household.household_members[0].cell_phone : household.household_members[0].home_phone,
            type: household.type
        };

        let conversationType = this.entity_types.find((c) => c.name == household.type);

        if (conversationType) {
            this.chatForm.patchValue({ assignment_type: conversationType.id });
        }
        this.getConversationData(conversationType.id);
        this.chatFormStep = 1;
    }

    //get conversation
    getConversationData(type = null) {
        forkJoin(this.getConversation(type), this.getCustomConversationLibrary()).subscribe(data => {
            this.chat_data = data[0].response;
            data[1].response.forEach((item) => {
                this.chat_data.push(item)
            });
        });
    }

    getConversation(type = null) {
        return this.http.get<any>('api/conversations/library/' + type);
    }

    getCustomConversationLibrary() {
        return this.http.get<any>('api/conversations/custom-conv');
    }


    getAssignmentType(value) {

        this.allow_custom_message = false;

        //setup require field information as per requirement
        var requireMng = ['householdMemberName', 'householdName', 'group_id', 'employeeName'];
        requireMng.forEach((item) => {
            this.chatForm.get(item).clearValidators();
        })
        if (value == 1) {
            this.chatForm.get('householdName').setValidators([Validators.required]);
        } else if (value == 2) {
            this.chatForm.get('group_id').setValidators([Validators.required]);
        } else if (value == 3) {
            this.chatForm.get('employeeName').setValidators([Validators.required]);
        } else if (value == 4 || value == 5) {
            this.chatForm.get('householdMemberName').setValidators([Validators.required]);
        } else { }
        requireMng.forEach((item) => {
            this.chatForm.get(item).updateValueAndValidity();
        });

        //get list of conversation as per type
        this.getConversationData(value);


        //value patches as per household pre selection and types
        this.chatForm.patchValue({
            householdId: '',
            householdName: '',
            householdMemberId: '',
            optOut: null,
            conversationType: null,
            selectTime: null
        });

        var isPreHousehold = false;
        this.current_route = this.router.url.split("/", 3);
        if (this.current_route[1] == 'household' && this.current_route[2] && Object.keys(this.household).length > 0) {
            isPreHousehold = true;
        }

        if (value == 1 && isPreHousehold) {
            //Client type selected
            this.chatForm.patchValue({
                householdId: this.household.id,
                householdName: this.household.name,
                householdMemberId: this.household.primary_member_id,
                optOut: this.household.opt_out
            });
        } else if (value == 3) {
            //Employee type selected
            this.chatForm.patchValue({
                householdMemberId: '',
                optOut: null
            });
            if (isPreHousehold) {
                this.chatForm.patchValue({
                    householdId: this.household.id,
                    householdName: this.household.name
                });
            }
        } else if (value == 4) {
            //Prospect type selected
            this.chatForm.patchValue({ conversationType: 'one_time', selectTime: 'now', optOut: null });
            this.requestTypeChange('one_time');
            if (isPreHousehold && this.household.prospect && this.household.primary_member) {
                this.chatMemberChange(this.household.primary_member);
            }
        } else if (value == 5) {
            //Lead type selected
            this.chatForm.patchValue({ conversationType: 'one_time', selectTime: 'now', optOut: null });
            this.requestTypeChange('one_time');
            if (isPreHousehold && this.household.lead && this.household.primary_member) {
                this.chatMemberChange(this.household.primary_member);
            }
        } else {
            //
        }
    }


    requestTypeChange(event) {

        this.chatForm.get('selectTime').setValidators([]);
        this.chatForm.get('dateTime').setValidators([]);
        this.chatForm.get('recurringType').setValidators([]);

        if (event == 'one_time') {
            this.chatForm.get('selectTime').setValidators([Validators.required]);
            this.chatForm.patchValue({ 'recurringType': null });
        }
    }

    onConversationChange(value: any) {

        //var assignType =  this.chatForm.value.assignment_type;
        this.chatForm.patchValue({ recurringType: null, conversation: value });
        //if(value.is_event_driven == 1){
        //    this.chatForm.patchValue({recurringType:'event'});
        //}

        if (value.name == 'Schedule Meeting') {
            this.advisor_list_show = true;
            this.chatForm.setControl('advisor', new FormArray([]));
            const control = <FormArray>this.chatForm.controls.advisor;
            control.push(this.initAdvisor());
            control.patchValue([{ 'advisor_id': this.household.advisor_1_id }]);
            this.chatForm.get('customMessage').setValidators([]);
        } else if (value.name == 'Custom') {
            this.allow_custom_message = true;
            this.advisor_list_show = false;
            this.chatForm.patchValue({ customMessage: null, conversation: value });
            this.chatForm.get('customMessage').setValidators([Validators.required]);
            this.getDynamicFields();
        } else if (value.hasOwnProperty('body')) {
            this.allow_custom_message = true;
            this.advisor_list_show = false;
            let customConvData = this.chat_data.find((info) => info.name == 'Custom');
            this.chatForm.patchValue({ customMessage: value.body, conversation: customConvData });
        } else {
            this.advisor_list_show = false;
            this.allow_custom_message = false;
            this.chatForm.get('customMessage').setValidators([]);
        }

        this.chatForm.get('customMessage').updateValueAndValidity();
        /*allow_custom_message*/
    }

    validateChatName() {
        let checkboxValue = this.chatForm.get('custom_library').value;
        this.chatForm.get('custom_chat_name').clearValidators();
        this.chatForm.get('customMessage').clearValidators();
        if (checkboxValue == true) {
            this.chatForm.get('custom_chat_name').setValidators([Validators.required, Validators.min(5)]);
            this.chatForm.get('customMessage').setValidators([Validators.required]);
        }
        this.chatForm.get('custom_chat_name').updateValueAndValidity();
        this.chatForm.get('customMessage').updateValueAndValidity();
    }

    // Quick Chat Group Model
    groupQuickChat() {
        if (this.chatForm.valid) {
            this.chatFormStep = 3;
            this.onGroupModel();
        }
    }

    onCancel(step) {
        this.chatFormStep = step;
        this.chatForm.reset();
    }

    onChatsubmit() {

        if (this.chatForm.value.assignment_type == "3") {
            if (!this.chatForm.value.householdName) {
                this.chatForm.patchValue({ householdId: 0 });
            }

            if (!this.chatForm.value.employeeName) {
                this.chatForm.patchValue({ employeeId: null });
            }
        }

        if (this.chatForm.valid) {
            this.chatFormActionDisable = true;

            let retObj = {
                conversation: this.chatForm.value.conversation,
                employee_id: this.chatForm.value.employeeId,
                select_time: this.chatForm.value.selectTime,
                date_time: moment(this.chatForm.value.dateTime).format('YYYY-MM-DD'),
                time: this.chatForm.value.time,
                household_id: (this.chatForm.value.householdId) ? this.chatForm.value.householdId : null,
                household_member_id: (this.chatForm.value.householdMemberId) ? this.chatForm.value.householdMemberId : null,
                cadence: this.chatForm.value.recurringType,
                notify: this.chatForm.value.notify,
                assignment_type: this.chatForm.value.assignment_type,
                group_id: this.chatForm.value.group_id,
                custom_message: this.chatForm.value.customMessage,
                custom_save: this.chatForm.value.custom_library,
                custom_name: this.chatForm.value.custom_chat_name,
                method: this.chatForm.value.sendFollowup,
                subject: this.chatForm.value.subject,
            }

            if (this.settings['instance_type'] === 'sales') {
                retObj['salesId'] = this.chatForm.value.salesId;
            }

            if (this.advisor_list_show && this.settings['instance_type'] === 'advisor') {
                retObj['advisor'] = this.chatForm.value.advisor;
            }

            this.chatService.addConversation(retObj).then(
                (res: any) => {
                    this.chatFormActionDisable = false;
                    this.chatClose();
                    this.chatActionMessage.emit({ severity: 'success', summary: 'Success', detail: 'Chat queued successfully' });
                })
                .catch((error) => {
                    this.chatFormActionDisable = false;
                    this.chatActionMessage.emit({ severity: 'error', summary: 'Error', detail: 'Please try again' });
                }
                );
        }
    }

    onGroupModel() {
        let retObjs = {
            conversation: this.chatForm.value.conversation,
            select_time: this.chatForm.value.selectTime,
            date_time: this.chatForm.value.dateTime,
            household_id: (this.chatForm.value.householdId) ? this.chatForm.value.householdId : null,
            household_member_id: (this.chatForm.value.householdMemberId) ? this.chatForm.value.householdMemberId : null,
            cadence: this.chatForm.value.recurringType,
            notify: this.chatForm.value.notify,
            assignment_type: this.chatForm.value.assignment_type,
            group_id: this.chatForm.value.group_id
        }

        this.http.post<any>('api/groups/quick-chat', retObjs).subscribe(
            res => {
                this.quickGroup = res.result;
            },
            error => {
                this.chatClose();
            }
        );
    }

    chatClose() {
        this.chatActionChange.emit(false);
    }

    chatMemberChange(householdMember) {
        this.chatForm.patchValue({
            householdMemberName: householdMember.first_name + ' ' + householdMember.last_name + '(' + householdMember.phone + ')',
            householdMemberId: householdMember.id,
            householdId: householdMember.household_id,
        });
    }

    //change select-time and set validation
    oneTimeTypeChange(event) {
        this.chatForm.get('dateTime').setValidators([]);
        this.chatForm.patchValue({ 'dateTime': null });

        if (event == 'custom') {
            this.randomTime();
            this.chatForm.get('dateTime').setValidators([Validators.required]);
        }
    }

    randomTime() {
        let random = Math.floor(0 + Math.random() * (this.intervals.length + 1 - 0));

        this.chatForm.get('time').setValue(this.intervals[random]);
        this.chatForm.get('time').updateValueAndValidity();
    }

    onChangeSendType(sendType) {
        this.chatForm.patchValue({
            subject: ''
        });

        this.showEmailsubject = false;

        if (sendType != 'text') {
            this.showEmailsubject = true;
        }
    }

    getDynamicFields() {
        this.http.get<any>('api/conversations/dynamic-fields').subscribe(
            res => {
                this.dynamicFieldsVal = res.response;
                Object.keys(res.response).map(key => {
                    res.response[key].map(key => {
                        this.mention.push(key);
                        this.mention_value.push(key.field_value);


                    });
                });
            },
            error => {
                this.chatClose();
            }
        );
    }

    onMentionSelect(input: any) {
        return input.field_value;
    }

    addCustomField(fieldValue) {
        this.chatForm.controls['dynamicFields'].reset();
        if (fieldValue != '') {
            if (this.chatForm.value.customMessage) {

                var $txt = jQuery("#customMessage");
                var caretPos = $txt[0].selectionStart;
                var textAreaTxt = $txt.val();
                var txtToAdd = ' ' + fieldValue;
                if ($txt[0].selectionStart == $txt[0].selectionEnd) {
                    txtToAdd = txtToAdd + ' '
                }
                var valuetoAdd = jQuery.trim(textAreaTxt.substring(0, caretPos)) + txtToAdd + jQuery.trim(textAreaTxt.substring(caretPos));
                $txt.val(valuetoAdd);
                this.chatForm.patchValue({ 'customMessage': valuetoAdd });

            } else {
                this.chatForm.patchValue({ 'customMessage': fieldValue });
            }
            this.addTags(valuetoAdd);
        }
        //console.log('start position', jQuery("#customMessage").caret().start);
        setTimeout(() => {
            this.customMessage.nativeElement.focus();
        }, 200);
    }

    addTags(text) {
        this.tags = [];
        const matchHashtags = /(\[.*?\]) ?/g;
        let hashtag;
        while ((hashtag = matchHashtags.exec(text))) {
            if (!this.mention_value.includes(hashtag[1])) {
                this.tags.push({
                    indices: {
                        start: hashtag.index,
                        end: hashtag.index + hashtag[1].length
                    },
                    cssClass: 'bg-pink',
                    data: hashtag[1]
                });
            }
        }
    }

    addDarkClass(elm: HTMLElement) {
        if (elm.classList.contains('bg-blue')) {
            elm.classList.add('bg-blue-dark');
        } else if (elm.classList.contains('bg-pink')) {
            elm.classList.add('bg-pink-dark');
        }
    }

    removeDarkClass(elm: HTMLElement) {
        elm.classList.remove('bg-blue-dark');
        elm.classList.remove('bg-pink-dark');
    }

}
